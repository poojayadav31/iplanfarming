# Profit & Economics Calculation Reference

This document traces every formula used across the iPlanFarmHouse economics pipeline,
from raw polygon area all the way to final profit/loss figures.

**Source files:**
- `server/src/services/farmEconomics.service.js` — farm-level P&L
- `server/src/services/farmPlan.service.js` — per-zone planner economics
- `server/src/constants/naturalFarming.js` — crop financials, input recipes
- `server/prisma/seeds/cropEconomicsSeed.js` — authoritative crop data
- `client/src/utils/farmCalculations.js` — area metrics (client-side)

All examples use a **4-acre farm** with all four multilayer crops in the default
configuration (Jeevamrit homemade, default infrastructure costs).

---

## 1. Area Metrics

Computed client-side via Turf.js when the farmer draws the farm boundary on the map.

### Formulas

```
areaSquareMeters  = turf.area(polygon)                 [m²]
areaBigha         = areaSquareMeters / 1333.33         [Bigha, CG regional standard]
areaAcres         = areaSquareMeters / 4046.86         [acres]
areaHectares      = areaSquareMeters / 10000           [hectares]
perimeter         = turf.length(polygonToLine)         [meters]
convexityScore    = polygonArea / convexHullArea       [0–1, 1 = perfect convex shape]
```

### Zone count suggestion

| Farm size (Bigha) | Suggested zones |
|---|---|
| < 2 | 1 |
| 2 – 5 | 2 |
| 5 – 10 | 3 |
| 10 – 20 | 4 |
| > 20 | 5 |

### Example — 4-acre farm

```
areaSquareMeters  = 4 × 4046.86 = 16,187.44 m²
areaBigha         = 16,187.44 / 1333.33 = 12.14 Bigha
areaAcres         = 16,187.44 / 4046.86 = 4.00 acres
areaHectares      = 16,187.44 / 10000   = 1.62 ha
```

---

## 2. Crop Data (Seed Values)

These are the economic parameters for the four multilayer crops stored in `CropEconomics`.

| Crop | Season | Duration | Yield (kg/ac) | Raw Price (₹/kg) | Processed Price (₹/kg) | Processing Cost (₹/kg) | Seed Cost (₹/ac) |
|---|---|---|---|---|---|---|---|
| Haldi | Kharif | 9 mo | 7,000 | 60 | 120 | 15 | 8,000 |
| Papaya | Perennial | 24 mo | 10,000 | 30 | 65 | 8 | 3,000 |
| Creepers | Zaid | 6 mo | 8,000 | 40 | 75 | 10 | 2,000 |
| Leafy Vegetable | Rabi | 3 mo | 2,000 | 30 | 55 | 8 | 1,500 |

> **Papaya special rule:** Year 1 effective yield = 0 kg (24-month establishment period).
> Full yield of 10,000 kg/acre is reached only from Year 2 onward.

---

## 3. Revenue per Crop

Computed in `buildCropRevenue()` in `farmEconomics.service.js`.

### Formulas

```
effectiveYield    = (crop is Papaya AND Year 1) ? 0 : yieldPerAcreKg

totalYield        = effectiveYield × areaAcres                 [kg]

rawRevenue        = totalYield × rawSalePricePerKg             [₹]

valueAddedRevenue = totalYield × (processedSalePricePerKg
                                  − processingCostPerKg)       [₹]
```

The `valueAddedRevenue` formula uses the **net processed price** — the gross processed
price minus the per-kg cost to convert raw produce (drying, grinding, packaging).

### Example — 4 acres, each crop

**Haldi (Year 1 and Year 2 — same, no establishment effect):**
```
effectiveYield    = 7,000 kg/ac
totalYield        = 7,000 × 4 = 28,000 kg
rawRevenue        = 28,000 × 60  = ₹16,80,000
valueAddedRevenue = 28,000 × (120 − 15)
                  = 28,000 × 105 = ₹29,40,000
```

**Papaya — Year 1 (establishment, zero yield):**
```
effectiveYield    = 0 kg/ac  (Year 1 special case)
totalYield        = 0 kg
rawRevenue        = ₹0
valueAddedRevenue = ₹0
```

**Papaya — Year 2+ (full production):**
```
effectiveYield    = 10,000 kg/ac
totalYield        = 10,000 × 4 = 40,000 kg
rawRevenue        = 40,000 × 30  = ₹12,00,000
valueAddedRevenue = 40,000 × (65 − 8)
                  = 40,000 × 57  = ₹22,80,000
```

**Creepers (Year 1 and Year 2 — same):**
```
effectiveYield    = 8,000 kg/ac
totalYield        = 8,000 × 4 = 32,000 kg
rawRevenue        = 32,000 × 40  = ₹12,80,000
valueAddedRevenue = 32,000 × (75 − 10)
                  = 32,000 × 65  = ₹20,80,000
```

**Leafy Vegetable (Year 1 and Year 2 — same):**
```
effectiveYield    = 2,000 kg/ac
totalYield        = 2,000 × 4 = 8,000 kg
rawRevenue        = 8,000 × 30  = ₹2,40,000
valueAddedRevenue = 8,000 × (55 − 8)
                  = 8,000 × 47  = ₹3,76,000
```

---

## 4. Aggregate Farm Revenue

All four crops are grown simultaneously (multilayer intercropping), so revenues are summed.

### Formulas

```
totalRawRevenue_Y1        = Σ rawRevenue_Y1        for all crops
totalValueAddedRevenue_Y1 = Σ valueAddedRevenue_Y1 for all crops

totalRawRevenue_Y2        = Σ rawRevenue_Y2        for all crops
totalValueAddedRevenue_Y2 = Σ valueAddedRevenue_Y2 for all crops
```

### Example — 4 acres

**Year 1:**
```
rawRevenue_Y1 = 16,80,000 (Haldi)
              +         0 (Papaya — establishment)
              + 12,80,000 (Creepers)
              +  2,40,000 (Leafy Veg)
              = ₹31,00,000

valueAddedRevenue_Y1 = 29,40,000
                     +         0
                     + 20,80,000
                     +  3,76,000
                     = ₹53,96,000
```

**Year 2:**
```
rawRevenue_Y2 = 16,80,000 (Haldi)
              + 12,00,000 (Papaya — full yield now)
              + 12,80,000 (Creepers)
              +  2,40,000 (Leafy Veg)
              = ₹43,00,000

valueAddedRevenue_Y2 = 29,40,000
                     + 22,80,000
                     + 20,80,000
                     +  3,76,000
                     = ₹76,76,000
```

---

## 5. Capital Expenditure (CapEx)

One-time infrastructure costs paid only in Year 1.

| Item | Scales with | Default rate |
|---|---|---|
| Land Layout & Bunding | per acre | ₹12,500/acre |
| Drip Irrigation setup | per acre | ₹40,000/acre |
| Solar Dryer | flat per farm | ₹13,500 |

### Formulas

```
landLayout     = landLayoutCost     × areaAcres   [₹]
dripIrrigation = dripIrrigationCost × areaAcres   [₹]
solarDryer     = solarDryerCost                   [₹, flat regardless of area]

capexTotal     = landLayout + dripIrrigation + solarDryer
```

### Example — 4 acres (default rates)

```
landLayout     = 12,500 × 4 = ₹50,000
dripIrrigation = 40,000 × 4 = ₹1,60,000
solarDryer     =              ₹13,500

capexTotal     = 50,000 + 1,60,000 + 13,500 = ₹2,23,500
```

---

## 6. Operational Expenditure (OpEx)

Recurring annual costs. Identical in Year 1 and Year 2.

| Item | Scales with | Notes |
|---|---|---|
| Seeds | per acre × all crops | Sum of seedCostPerAcre across all 4 crops |
| Labour | flat per farm | 2 full-time workers |
| Natural Inputs (Jeevamrit) | per acre | ₹0 if homemade; ₹5,000/acre if market-bought |

### Formulas

```
annualSeedCost = Σ(seedCostPerAcre for all crops) × areaAcres   [₹]

labourCost     = annualLabourCost                                 [₹, flat]

naturalInputs  = jeevamritHomemade
                   ? 0
                   : JEEVAMRIT_MARKET_COST_PER_ACRE × areaAcres  [₹]

opexTotal      = annualSeedCost + labourCost + naturalInputs
```

### Example — 4 acres (Jeevamrit homemade = true)

```
annualSeedCost = (8,000 + 3,000 + 2,000 + 1,500) × 4
               = 14,500 × 4
               = ₹58,000

labourCost     = ₹5,00,000  (flat)

naturalInputs  = ₹0  (homemade)

opexTotal      = 58,000 + 5,00,000 + 0 = ₹5,58,000
```

**If Jeevamrit is market-bought (same farm):**
```
naturalInputs  = 5,000 × 4 = ₹20,000
opexTotal      = 58,000 + 5,00,000 + 20,000 = ₹5,78,000
```

---

## 7. Profit / Loss

### Formulas

```
Year 1 (high drag because CapEx is included):
  profitRaw_Y1        = rawRevenue_Y1        − capexTotal − opexTotal
  profitValueAdded_Y1 = valueAddedRevenue_Y1 − capexTotal − opexTotal

Year 2+ (CapEx is a sunk cost, not deducted):
  profitRaw_Y2        = rawRevenue_Y2        − opexTotal
  profitValueAdded_Y2 = valueAddedRevenue_Y2 − opexTotal
```

### Example — 4 acres

```
Year 1:
  profitRaw_Y1        = 31,00,000 − 2,23,500 − 5,58,000
                      = 31,00,000 − 7,81,500
                      = ₹23,18,500

  profitValueAdded_Y1 = 53,96,000 − 2,23,500 − 5,58,000
                      = 53,96,000 − 7,81,500
                      = ₹46,14,500

Year 2:
  profitRaw_Y2        = 43,00,000 − 5,58,000
                      = ₹37,42,000

  profitValueAdded_Y2 = 76,76,000 − 5,58,000
                      = ₹71,18,000
```

**Revenue jump from Year 1 → Year 2** is entirely due to Papaya coming into full
production: raw revenue increases by ₹12,00,000 and value-added by ₹22,80,000.

---

## 8. Natural Farming Savings

Quantifies the input cost advantage of natural farming over conventional NPK fertilizers.

### Formulas

```
chemicalCost            = CHEMICAL_FERTILIZER_COST_PER_ACRE × areaAcres
                        = 8,000 × areaAcres                                [₹]

naturalCost             = naturalInputs  (from OpEx, section 6)            [₹]

naturalFarmingSavings   = chemicalCost − naturalCost                       [₹]
```

### Example — 4 acres (Jeevamrit homemade)

```
chemicalCost          = 8,000 × 4 = ₹32,000
naturalCost           = ₹0  (homemade Jeevamrit)
naturalFarmingSavings = 32,000 − 0 = ₹32,000 saved per year
```

**If Jeevamrit is market-bought:**
```
chemicalCost          = ₹32,000
naturalCost           = ₹20,000
naturalFarmingSavings = ₹12,000 saved per year
```

---

## 9. Expense Distribution (Donut Chart)

Used by the frontend to show the Year 1 cost breakdown as percentages.

### Formula

```
totalYear1Cost = capexTotal + opexTotal

percentage(item) = round((item.amount / totalYear1Cost) × 100)
```

Items with amount = 0 are filtered out (e.g., homemade Jeevamrit).

### Example — 4 acres (Jeevamrit homemade)

```
totalYear1Cost = 2,23,500 + 5,58,000 = ₹7,81,500

Drip Irrigation : 1,60,000 / 7,81,500 = 20.5% ≈ 21%
Labour          : 5,00,000 / 7,81,500 = 64.0% ≈ 64%
Seeds           :    58,000 / 7,81,500 =  7.4% ≈  7%
Land Layout     :    50,000 / 7,81,500 =  6.4% ≈  6%
Solar Dryer     :    13,500 / 7,81,500 =  1.7% ≈  2%
Natural Inputs  :         0             (excluded)
```

---

## 10. Per-Zone Economics (Farm Planner)

Computed in `computeZoneEconomics()` in `farmPlan.service.js`.
This is used for the zone-by-zone planning view, not the farm-wide P&L.

**Key difference from Section 3–7:** The planner always uses **steady-state (Year 2+)**
economics — it is a planning tool showing potential, not the Year 1 CapEx-heavy picture.
The `NATURAL_INPUT_COST_PER_ACRE` constant here (₹15,000) bundles natural inputs into
a single per-acre figure rather than separating them.

### Formulas

```
grossIncomeRaw       = areaAcres × yieldPerAcreKg × rawSalePricePerKg
grossIncomeProcessed = areaAcres × yieldPerAcreKg
                       × (processedSalePricePerKg − processingCostPerKg)

inputCost            = areaAcres × (seedCostPerAcre + NATURAL_INPUT_COST_PER_ACRE)
                     = areaAcres × (seedCostPerAcre + 15,000)

netProfitRaw         = grossIncomeRaw       − inputCost
netProfitProcessed   = grossIncomeProcessed − inputCost
```

### Example — 1-acre zone with Haldi

```
grossIncomeRaw       = 1 × 7,000 × 60  = ₹4,20,000
grossIncomeProcessed = 1 × 7,000 × (120 − 15)
                     = 1 × 7,000 × 105 = ₹7,35,000

inputCost            = 1 × (8,000 + 15,000) = ₹23,000

netProfitRaw         = 4,20,000 − 23,000 = ₹3,97,000
netProfitProcessed   = 7,35,000 − 23,000 = ₹7,12,000
```

### Example — 1-acre zone with Papaya (planner always shows Year 2 steady state)

```
grossIncomeRaw       = 1 × 10,000 × 30 = ₹3,00,000
grossIncomeProcessed = 1 × 10,000 × (65 − 8)
                     = 1 × 10,000 × 57 = ₹5,70,000

inputCost            = 1 × (3,000 + 15,000) = ₹18,000

netProfitRaw         = 3,00,000 − 18,000 = ₹2,82,000
netProfitProcessed   = 5,70,000 − 18,000 = ₹5,52,000
```

---

## 11. Scenario Comparisons (Farm Planner)

The planner generates four scenario comparisons using `buildScenarios()`.

| Scenario | What it calculates |
|---|---|
| `current_plan` | Sum of per-zone `computeZoneEconomics` for assigned/suggested crops |
| `full_multilayer` | All 4 crops applied to the **total farm area** simultaneously |
| `max_raw_profit` | Best single crop by `netProfitRaw` across the full farm area |
| `max_value_added` | Best single crop by `netProfitProcessed` across the full farm area |

### Full Multilayer scenario — 4-acre farm

Each crop's economics is computed with `areaAcres = 4` and summed:

```
Haldi:        inputCost = 4 × (8,000 + 15,000) = ₹92,000
              netProfitRaw = 4 × 7,000 × 60 − 92,000
                           = 16,80,000 − 92,000 = ₹15,88,000

Papaya:       inputCost = 4 × (3,000 + 15,000) = ₹72,000
              netProfitRaw = 4 × 10,000 × 30 − 72,000
                           = 12,00,000 − 72,000 = ₹11,28,000

Creepers:     inputCost = 4 × (2,000 + 15,000) = ₹68,000
              netProfitRaw = 4 × 8,000 × 40 − 68,000
                           = 12,80,000 − 68,000 = ₹12,12,000

Leafy Veg:    inputCost = 4 × (1,500 + 15,000) = ₹66,000
              netProfitRaw = 4 × 2,000 × 30 − 66,000
                           =  2,40,000 − 66,000 = ₹1,74,000

Total multilayer netProfitRaw = 15,88,000 + 11,28,000 + 12,12,000 + 1,74,000
                               = ₹41,02,000
```

---

## 12. Natural Farming Input Recipes

Scaled per acre at runtime. Quantities below are **per acre per application**.

### Jeevamrit

| Ingredient | Per Acre |
|---|---|
| Cow Dung | 15 kg |
| Cow Urine | 15 L |
| Jaggery | 2 kg |
| Mustard Cake | 1 kg |
| Water | 200 L |

**Cost:** ₹0 if home-prepared. ₹5,000/acre if market-sourced.

### Agniastra (pest control)

| Ingredient | Per Acre |
|---|---|
| Neem Leaves | 5 kg |
| Green Chilli | 0.5 kg |
| Garlic | 0.5 kg |
| Cow Urine | 20 L |

---

## 13. Constants Reference

| Constant | Value | File | Purpose |
|---|---|---|---|
| `BIGHA_IN_SQUARE_METERS` | 1,333.33 m² | farmCalculations.js | Area unit conversion |
| Acre in m² | 4,046.86 m² | farmCalculations.js, farmPlan.service.js | Area unit conversion |
| `CHEMICAL_FERTILIZER_COST_PER_ACRE` | ₹8,000 | farmEconomics.service.js | Savings baseline |
| `JEEVAMRIT_MARKET_COST_PER_ACRE` | ₹5,000 | farmEconomics.service.js | Market Jeevamrit rate |
| `DEFAULT_FINANCIALS.landLayoutCost` | ₹12,500/acre | farmEconomics.service.js | CapEx default |
| `DEFAULT_FINANCIALS.dripIrrigationCost` | ₹40,000/acre | farmEconomics.service.js | CapEx default |
| `DEFAULT_FINANCIALS.solarDryerCost` | ₹13,500 flat | farmEconomics.service.js | CapEx default |
| `DEFAULT_FINANCIALS.annualLabourCost` | ₹5,00,000 flat | farmEconomics.service.js | OpEx default |
| `NATURAL_INPUT_COST_PER_ACRE` | ₹15,000 | farmPlan.service.js | Bundled input cost in planner |

---

## 14. Full Summary — 4-Acre Farm

| Metric | Year 1 (Raw) | Year 1 (Value-Added) | Year 2 (Raw) | Year 2 (Value-Added) |
|---|---|---|---|---|
| Revenue | ₹31,00,000 | ₹53,96,000 | ₹43,00,000 | ₹76,76,000 |
| CapEx | ₹2,23,500 | ₹2,23,500 | — | — |
| OpEx | ₹5,58,000 | ₹5,58,000 | ₹5,58,000 | ₹5,58,000 |
| Total Cost | ₹7,81,500 | ₹7,81,500 | ₹5,58,000 | ₹5,58,000 |
| **Net Profit** | **₹23,18,500** | **₹46,14,500** | **₹37,42,000** | **₹71,18,000** |

Natural Farming Savings vs Chemical: **₹32,000/year** (homemade Jeevamrit).

Revenue grows from Year 1 → Year 2 because Papaya enters full production,
adding ₹12,00,000 (raw) or ₹22,80,000 (value-added) to the top line.
