# iPlanFarmHouse — Farm Economics Calculation Model

**Purpose:** This document describes every formula and assumption used in the farm
economics model. It is intended for review by agricultural economists or domain
experts who may wish to suggest corrections or improvements.

All examples use a reference farm of **4 acres** in Chhattisgarh with the standard
multilayer natural farming model (Haldi + Papaya + Creepers + Leafy Vegetable).

---

## Part A — Land Area Conversions

### A.1 Unit Conversion Factors

| From | To | Factor |
|---|---|---|
| Square metres | Bigha | ÷ 1,333.33 |
| Square metres | Acres | ÷ 4,046.86 |
| Square metres | Hectares | ÷ 10,000 |

> **Assumption A-1:** 1 Bigha = 1,333.33 m². This is the value currently used.
> The Chhattisgarh regional standard is approximately 1,337.8 m². This may need
> correction for precise local compliance.

### A.2 Convexity Score

Measures how regular (convex) the drawn farm boundary is.

```
Convexity Score = Farm Polygon Area / Convex Hull Area
```

- Range: 0 to 1
- Score = 1 means perfectly convex (rectangle, circle, etc.)
- Score < 0.7 triggers a boundary warning to the farmer

---

## Part B — Crop Parameters

The model uses four crops grown simultaneously on the same land (multilayer intercropping).

### B.1 Crop Economic Parameters

| Crop | Yield (kg/acre) | Raw Price (₹/kg) | Processed Price (₹/kg) | Processing Cost (₹/kg) | Seed Cost (₹/acre) |
|---|---|---|---|---|---|
| Haldi | 7,000 | 60 | 120 | 15 | 8,000 |
| Papaya | 10,000 | 30 | 65 | 8 | 3,000 |
| Creepers | 8,000 | 40 | 75 | 10 | 2,000 |
| Leafy Vegetable | 2,000 | 30 | 55 | 8 | 1,500 |

> **Assumption B-1:** Yield figures are per-acre annual averages under natural farming
> conditions in Chhattisgarh. These are based on the CG agricultural manual and may
> vary by season, microclimate, and soil quality.

> **Assumption B-2:** Raw prices reflect average mandi (wholesale market) gate prices.
> Processed prices reflect value-addition through SHG (Self-Help Group) rural processing
> units. Both should be reviewed against current market rates annually.

> **Assumption B-3:** Processing cost covers drying, grinding, packaging, and basic
> cold storage where applicable. These are per-kg averages and do not account for
> economies of scale.

### B.2 Papaya Establishment Rule

Papaya has a 24-month establishment period. It produces zero yield in Year 1.

```
Effective Yield (Papaya) = 0 kg/acre         if Year 1
Effective Yield (Papaya) = 10,000 kg/acre    if Year 2 or later

Effective Yield (all other crops) = Yield from Table B.1   (same in Year 1 and Year 2)
```

> **Assumption B-4:** All other crops (Haldi, Creepers, Leafy Vegetable) reach full
> yield from Year 1. No partial-establishment modelling is applied to them.

---

## Part C — Revenue Calculations

### C.1 Per-Crop Revenue

For each crop on a farm of A acres:

```
Total Yield (kg)       = Effective Yield (kg/acre) × A

Raw Revenue (₹)        = Total Yield × Raw Price per kg

Net Processed Price    = Processed Price per kg − Processing Cost per kg

Value-Added Revenue    = Total Yield × Net Processed Price
```

### C.2 Total Farm Revenue

All four crops are grown on the same land concurrently. Revenues are summed across crops.

```
Total Raw Revenue       = Σ Raw Revenue (i)          for i ∈ {Haldi, Papaya, Creepers, Leafy Veg}

Total Value-Added Rev.  = Σ Value-Added Revenue (i)  for i ∈ {Haldi, Papaya, Creepers, Leafy Veg}
```

> **Assumption C-1:** The model assumes all four crops are always present on the farm
> simultaneously. It does not model single-crop or partial-multilayer configurations
> in the farm-level P&L (those are handled separately in the planning scenarios).

### C.3 Worked Example — 4-Acre Farm

**Year 1:**

| Crop | Total Yield (kg) | Raw Revenue (₹) | Net Proc. Price (₹/kg) | Value-Added Rev. (₹) |
|---|---|---|---|---|
| Haldi | 7,000 × 4 = 28,000 | 28,000 × 60 = **16,80,000** | 120 − 15 = 105 | 28,000 × 105 = **29,40,000** |
| Papaya | 0 (Year 1) | **0** | 65 − 8 = 57 | **0** |
| Creepers | 8,000 × 4 = 32,000 | 32,000 × 40 = **12,80,000** | 75 − 10 = 65 | 32,000 × 65 = **20,80,000** |
| Leafy Veg | 2,000 × 4 = 8,000 | 8,000 × 30 = **2,40,000** | 55 − 8 = 47 | 8,000 × 47 = **3,76,000** |
| **Total Y1** | | **₹31,00,000** | | **₹53,96,000** |

**Year 2:**

| Crop | Total Yield (kg) | Raw Revenue (₹) | Value-Added Rev. (₹) |
|---|---|---|---|
| Haldi | 28,000 | **16,80,000** | **29,40,000** |
| Papaya | 10,000 × 4 = 40,000 | 40,000 × 30 = **12,00,000** | 40,000 × 57 = **22,80,000** |
| Creepers | 32,000 | **12,80,000** | **20,80,000** |
| Leafy Veg | 8,000 | **2,40,000** | **3,76,000** |
| **Total Y2** | | **₹43,00,000** | **₹76,76,000** |

Revenue increase from Year 1 → Year 2 = ₹12,00,000 (raw) / ₹22,80,000 (value-added),
entirely attributable to Papaya entering full production.

---

## Part D — Capital Expenditure (CapEx)

One-time investment in Year 1 only. Not repeated in Year 2 or later.

### D.1 CapEx Components

| Item | Basis | Default Rate |
|---|---|---|
| Land Layout & Bunding | Per acre | ₹12,500 / acre |
| Drip Irrigation Setup | Per acre | ₹40,000 / acre |
| Solar Dryer | Flat per farm | ₹13,500 (one unit) |

### D.2 CapEx Formulas

```
Land Layout Cost    = Land Layout Rate × A
Drip Irrigation     = Drip Irrigation Rate × A
Solar Dryer         = Solar Dryer Cost              (fixed, does not scale with area)

CapEx Total         = Land Layout Cost + Drip Irrigation + Solar Dryer
```

> **Assumption D-1:** Drip irrigation cost is assumed uniform at ₹40,000/acre. In
> practice this varies with plot shape, terrain, and water source proximity.

> **Assumption D-2:** One solar dryer unit is assumed sufficient for any farm size.
> Farms above a certain area threshold may require additional units.

> **Assumption D-3:** CapEx is fully expensed in Year 1. No depreciation schedule is
> applied. Year 2+ profits do not include any amortisation of the initial investment.

### D.3 Worked Example — 4 Acres

```
Land Layout Cost    = 12,500 × 4  = ₹50,000
Drip Irrigation     = 40,000 × 4  = ₹1,60,000
Solar Dryer         =               ₹13,500

CapEx Total         = 50,000 + 1,60,000 + 13,500 = ₹2,23,500
```

---

## Part E — Operational Expenditure (OpEx)

Annual recurring costs. Same amount in Year 1 and Year 2.

### E.1 OpEx Components

| Item | Basis | Default Rate |
|---|---|---|
| Seeds | Per acre, summed across all 4 crops | Sum of seed costs |
| Labour | Flat per farm | ₹5,00,000 / year |
| Natural Inputs (Jeevamrit) | Per acre (if market-bought) | ₹5,000 / acre |

### E.2 OpEx Formulas

```
Annual Seed Cost    = ( Σ Seed Cost per Acre (i) for all crops i ) × A

Labour Cost         = Annual Labour Rate          (fixed, does not scale with area)

Natural Input Cost  = 0                           if Jeevamrit is home-prepared
                    = Natural Input Rate × A      if Jeevamrit is market-purchased

OpEx Total          = Annual Seed Cost + Labour Cost + Natural Input Cost
```

> **Assumption E-1:** Labour cost is fixed at ₹5,00,000/year (2 full-time workers)
> regardless of farm size. This is not appropriate for very large or very small farms
> and should ideally scale with area.

> **Assumption E-2:** Natural input cost is zero when Jeevamrit is home-prepared
> because raw materials (cow dung, cow urine) are assumed to come from the farmer's
> own animals at no cash cost. If the farmer does not own cattle, the market rate
> applies.

> **Assumption E-3:** Seeds are purchased or exchanged every season. No seed-saving
> discount is modelled.

### E.3 Worked Example — 4 Acres (Jeevamrit homemade)

```
Annual Seed Cost    = (8,000 + 3,000 + 2,000 + 1,500) × 4
                    = 14,500 × 4
                    = ₹58,000

Labour Cost         = ₹5,00,000

Natural Input Cost  = ₹0  (homemade)

OpEx Total          = 58,000 + 5,00,000 + 0 = ₹5,58,000
```

**If Jeevamrit is market-bought:**
```
Natural Input Cost  = 5,000 × 4 = ₹20,000
OpEx Total          = 58,000 + 5,00,000 + 20,000 = ₹5,78,000
```

---

## Part F — Profit and Loss

### F.1 Profit Formulas

```
Year 1 Net Profit (Raw)         = Total Raw Revenue (Y1)
                                  − CapEx Total
                                  − OpEx Total

Year 1 Net Profit (Value-Added) = Total Value-Added Revenue (Y1)
                                  − CapEx Total
                                  − OpEx Total

Year 2 Net Profit (Raw)         = Total Raw Revenue (Y2)
                                  − OpEx Total

Year 2 Net Profit (Value-Added) = Total Value-Added Revenue (Y2)
                                  − OpEx Total
```

> **Assumption F-1:** Year 2 P&L does not include CapEx. The model treats infrastructure
> as fully expensed in Year 1 with no depreciation or residual value in subsequent years.

> **Assumption F-2:** OpEx is identical in Year 1 and Year 2. No learning-curve cost
> reductions or inflation adjustments are modelled.

### F.2 Worked Example — 4 Acres

```
Year 1:
  Net Profit (Raw)         = 31,00,000 − 2,23,500 − 5,58,000
                           = 31,00,000 − 7,81,500
                           = ₹23,18,500

  Net Profit (Value-Added) = 53,96,000 − 2,23,500 − 5,58,000
                           = 53,96,000 − 7,81,500
                           = ₹46,14,500

Year 2:
  Net Profit (Raw)         = 43,00,000 − 5,58,000
                           = ₹37,42,000

  Net Profit (Value-Added) = 76,76,000 − 5,58,000
                           = ₹71,18,000
```

### F.3 Summary Table — 4 Acres

| | Year 1 Raw | Year 1 Value-Added | Year 2 Raw | Year 2 Value-Added |
|---|---|---|---|---|
| Revenue | ₹31,00,000 | ₹53,96,000 | ₹43,00,000 | ₹76,76,000 |
| CapEx | ₹2,23,500 | ₹2,23,500 | — | — |
| OpEx | ₹5,58,000 | ₹5,58,000 | ₹5,58,000 | ₹5,58,000 |
| **Net Profit** | **₹23,18,500** | **₹46,14,500** | **₹37,42,000** | **₹71,18,000** |

---

## Part G — Natural Farming Savings

### G.1 Formula

Measures the annual input cost advantage of natural farming compared to conventional
chemical (NPK) fertilization.

```
Chemical Fertilizer Cost  = Chemical Rate per Acre × A
                          = 8,000 × A

Natural Input Cost        = (as computed in Part E)

Natural Farming Savings   = Chemical Fertilizer Cost − Natural Input Cost
```

> **Assumption G-1:** The chemical fertilizer benchmark is ₹8,000/acre/year, reflecting
> typical NPK application rates in Chhattisgarh. This does not include pesticide or
> herbicide costs, which would make the conventional farming cost higher and the
> savings differential larger.

> **Assumption G-2:** The model does not factor in yield differences between natural
> and chemical farming. If chemical farming produces higher yields, the savings
> comparison understates the yield-adjusted economic difference.

### G.2 Worked Example — 4 Acres

```
Chemical Fertilizer Cost  = 8,000 × 4 = ₹32,000 / year

Natural Input Cost        = ₹0         (homemade Jeevamrit)
                          = ₹20,000    (market-bought Jeevamrit)

Savings (homemade)        = 32,000 − 0      = ₹32,000 / year
Savings (market-bought)   = 32,000 − 20,000 = ₹12,000 / year
```

---

## Part H — Per-Zone Economics (Planning Model)

Used in the zone-by-zone planning view. This is a **steady-state model** — it always
shows Year 2+ potential and does not apply the Papaya Year 1 zero-yield rule.

> **Assumption H-1:** The planning model omits Year 1 Papaya establishment and CapEx.
> It is intended as a long-run potential indicator, not a Year 1 cash flow forecast.

### H.1 Zone Input Cost

The per-zone model bundles seed cost and natural input cost into a single figure:

```
Zone Input Cost = ( Seed Cost per Acre + Natural Input Rate ) × Zone Area (acres)
                = ( Seed Cost per Acre + 15,000 ) × Zone Area
```

> **Assumption H-2:** The per-zone natural input rate is ₹15,000/acre. This differs
> from the farm-level model (Part E) which uses ₹5,000/acre for market Jeevamrit. The
> ₹15,000 figure is a bundled estimate that includes all natural inputs (Jeevamrit,
> Agniastra, mulch material, etc.), not just Jeevamrit. These two constants should be
> reconciled for consistency.

### H.2 Zone Revenue and Profit Formulas

```
Gross Income (Raw)       = Zone Area × Yield per Acre × Raw Price per kg

Gross Income (Processed) = Zone Area × Yield per Acre
                           × ( Processed Price per kg − Processing Cost per kg )

Zone Input Cost          = Zone Area × ( Seed Cost per Acre + 15,000 )

Net Profit (Raw)         = Gross Income (Raw)       − Zone Input Cost

Net Profit (Processed)   = Gross Income (Processed) − Zone Input Cost
```

### H.3 Worked Example — 1-Acre Zone with Haldi

```
Gross Income (Raw)       = 1 × 7,000 × 60  = ₹4,20,000
Gross Income (Processed) = 1 × 7,000 × 105 = ₹7,35,000

Zone Input Cost          = 1 × (8,000 + 15,000) = ₹23,000

Net Profit (Raw)         = 4,20,000 − 23,000 = ₹3,97,000
Net Profit (Processed)   = 7,35,000 − 23,000 = ₹7,12,000
```

### H.4 Worked Example — 1-Acre Zone with Papaya (steady-state)

```
Gross Income (Raw)       = 1 × 10,000 × 30 = ₹3,00,000
Gross Income (Processed) = 1 × 10,000 × 57 = ₹5,70,000

Zone Input Cost          = 1 × (3,000 + 15,000) = ₹18,000

Net Profit (Raw)         = 3,00,000 − 18,000 = ₹2,82,000
Net Profit (Processed)   = 5,70,000 − 18,000 = ₹5,52,000
```

---

## Part I — Scenario Comparisons

The planning model generates four scenarios to compare different cropping strategies.

| Scenario | Description |
|---|---|
| Current Plan | Aggregated net profit from each zone's assigned crop |
| Full Multilayer | All 4 crops grown on the **full farm area** simultaneously |
| Max Raw Profit | Best single crop by net raw profit across the full farm |
| Max Value-Added Profit | Best single crop by net processed profit across the full farm |

For the **Full Multilayer** scenario, each crop's zone economics (Part H) is computed
with Area = total farm area, then summed across all four crops.

### I.1 Worked Example — Full Multilayer, 4 Acres

| Crop | Gross Income (Raw) | Input Cost | Net Profit (Raw) |
|---|---|---|---|
| Haldi | 4 × 7,000 × 60 = ₹16,80,000 | 4 × (8,000 + 15,000) = ₹92,000 | ₹15,88,000 |
| Papaya | 4 × 10,000 × 30 = ₹12,00,000 | 4 × (3,000 + 15,000) = ₹72,000 | ₹11,28,000 |
| Creepers | 4 × 8,000 × 40 = ₹12,80,000 | 4 × (2,000 + 15,000) = ₹68,000 | ₹12,12,000 |
| Leafy Veg | 4 × 2,000 × 30 = ₹2,40,000 | 4 × (1,500 + 15,000) = ₹66,000 | ₹1,74,000 |
| **Total** | **₹43,00,000** | **₹2,98,000** | **₹40,02,000** |

---

## Part J — Natural Farming Input Recipes

Quantities are per acre per application. Scale linearly with farm area.

### J.1 Jeevamrit (Soil Bio-Inoculant)

| Ingredient | Quantity per Acre |
|---|---|
| Cow Dung | 15 kg |
| Cow Urine | 15 L |
| Jaggery | 2 kg |
| Mustard Cake | 1 kg |
| Water | 200 L |

### J.2 Agniastra (Natural Pest Repellent)

| Ingredient | Quantity per Acre |
|---|---|
| Neem Leaves | 5 kg |
| Green Chilli | 0.5 kg |
| Garlic | 0.5 kg |
| Cow Urine | 20 L |

> **Assumption J-1:** Recipe quantities are fixed per acre with no seasonal adjustment.
> Application frequency is not modelled — costs assume a fixed annual number of
> applications regardless of crop stage or pest pressure.

---

## Part K — Consolidated Assumptions for Expert Review

The following is a summary of all model assumptions that an expert may wish to revisit:

| ID | Assumption | Current Value | Review Question |
|---|---|---|---|
| A-1 | 1 Bigha in m² | 1,333.33 m² | Chhattisgarh standard is ~1,337.8 m². Correction needed? |
| B-1 | Crop yields | Fixed per table | Do yields vary with soil type, zone size, or season? Should a yield adjustment factor be applied per soil type? |
| B-2 | Crop prices | Fixed (raw + processed) | Should prices be seasonal or updated dynamically from mandi data? |
| B-3 | Processing cost | Fixed per kg | Does processing cost scale with volume or vary by crop stage? |
| B-4 | Year 1 yield — non-Papaya crops | 100% of normal yield | Should a partial establishment discount apply to Haldi (first planting) as well? |
| D-1 | Drip irrigation cost | ₹40,000/acre uniform | Should this vary with plot shape, slope, or distance from water source? |
| D-2 | Solar dryer unit | 1 unit per farm | At what area threshold is a second unit needed? |
| D-3 | CapEx depreciation | Fully expensed Year 1 | Should CapEx be depreciated over useful life (e.g., 10 years for drip infrastructure)? |
| E-1 | Labour cost | ₹5,00,000/year flat | Should labour scale with area? (e.g., additional seasonal workers for harvest) |
| E-2 | Jeevamrit (homemade) | ₹0 cash cost | Should a shadow cost for farmer time be included? |
| F-1 | Year 2+ CapEx | Not included | Should a maintenance/replacement reserve be deducted annually? |
| G-1 | Chemical fertilizer benchmark | ₹8,000/acre | Does this include pesticides and herbicides, or only NPK? |
| G-2 | Yield parity assumption | Natural = Chemical yield | Is this realistic for Year 1 and Year 2 under transition conditions? |
| H-2 | Natural input rate (planner) | ₹15,000/acre | This differs from the farm P&L model (₹5,000/acre). Should these be unified? |
| J-1 | Recipe application frequency | Not modelled | How many applications per season per crop? Cost should reflect total annual usage. |
