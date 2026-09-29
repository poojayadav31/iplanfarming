// Square meters in one acre — used across services for area conversions.
export const SQ_METERS_PER_ACRE = 4046.86;

// Per-acre recipe constants for natural farming inputs.
// Quantities are specified per acre; multiply by zone acreage at runtime.

export const RECIPES = {
  Jeevamrit: {
    cowDung:     { label: 'Cow Dung',     amount: 15,   unit: 'kg' },
    cowUrine:    { label: 'Cow Urine',    amount: 15,   unit: 'L'  },
    jaggery:     { label: 'Jaggery',      amount: 2,    unit: 'kg' },
    mustardCake: { label: 'Mustard Cake', amount: 1,    unit: 'kg' },
    water:       { label: 'Water',        amount: 200,  unit: 'L'  },
  },
  Agniastra: {
    neemLeaves:  { label: 'Neem Leaves',  amount: 5,    unit: 'kg' },
    greenChilli: { label: 'Green Chilli', amount: 0.5,  unit: 'kg' },
    garlic:      { label: 'Garlic',       amount: 0.5,  unit: 'kg' },
    cowUrine:    { label: 'Cow Urine',    amount: 20,   unit: 'L'  },
  },
  Beejamrit: {
    cowDung:     { label: 'Cow Dung',     amount: 2,    unit: 'kg' },
    cowUrine:    { label: 'Cow Urine',    amount: 5,    unit: 'L'  },
    lime:        { label: 'Lime',         amount: 0.05, unit: 'kg' },
    water:       { label: 'Water',        amount: 20,   unit: 'L'  },
  },
};

// Financial metrics per acre for sample crops.
export const CROP_FINANCIALS = {
  Haldi:      { yieldKgPerAcre: 7000,  pricePerKg: 60 },
  Papaya:     { yieldKgPerAcre: 10000, pricePerKg: 30 },
  'Leafy Veg':{ yieldKgPerAcre: 2000,  pricePerKg: 30 },
};

// Estimated total input cost per acre (seeds, labor, layout) for natural farming.
export const BASE_INPUT_COST_PER_ACRE = 15000;
