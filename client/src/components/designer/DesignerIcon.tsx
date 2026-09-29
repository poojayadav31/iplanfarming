import React from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Sprout,
  Apple,
  Banana,
  Bean,
  Carrot,
  Cherry,
  Citrus,
  Leaf,
  Nut,
  Salad,
  Wheat,
  Flower,
  Flower2,
  TreePine,
  Trees,
  TreeDeciduous,
  Palmtree,
  Sparkles,
  Flame,
  Sun,
  Droplets,
  Waves,
  Boxes,
  Layers,
  Building2,
  Warehouse,
  Home,
  Fence,
  Footprints,
  Milk,
  Egg,
  Bird,
  Recycle,
  CircleDot,
  Mountain,
  DoorOpen,
  Cylinder,
} from 'lucide-react';

// Map icon names/keys to corresponding Lucide icon components
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  // Crops & Vegetables
  tomato: Apple,
  chilli: Flame,
  brinjal: Egg,
  eggplant: Egg,
  cabbage: Salad,
  cauliflower: Flower2,
  carrot: Carrot,
  potato: Nut,
  onion: CircleDot,
  garlic: Sparkles,
  beans: Bean,
  peas: Bean,
  cucumber: Salad,
  pumpkin: Sun,
  bottle_gourd: Salad,
  bitter_gourd: Leaf,
  sweet_corn: Wheat,
  capsicum: Salad,
  spinach: Leaf,
  coriander: Flower,
  fenugreek: Leaf,
  radish: Carrot,
  beetroot: Carrot,
  ginger: Sparkles,
  turmeric: Sparkles,

  // Herbs & Support
  tulsi: Flower2,
  mint: Leaf,
  lemongrass: Wheat,
  marigold: Flower2,
  vetiver: Wheat,
  sunflower: Sun,
  mustard: Flower,
  sesame: Sparkles,
  subabul: TreePine,
  gliricidia: TreeDeciduous,
  sesbania: Wheat,
  crotalaria: Flower,

  // Trees & Fruits
  banana: Banana,
  papaya: Apple,
  guava: Apple,
  mango: Apple,
  lemon: Citrus,
  coconut: Palmtree,
  moringa: TreeDeciduous,
  neem: TreeDeciduous,
  amla: Cherry,
  pomegranate: Cherry,
  custard_apple: Apple,
  tree: TreePine,
  orchard: Trees,

  // Bed Profiles
  'raised bed': Layers,
  'sunken bed': Sun,
  'hot bed': Flame,
  'wicking bed': Droplets,
  'hugelkultur bed': Boxes,
  'keyhole bed': CircleDot,
  'terrace bed': Mountain,
  'polyculture bed': Sparkles,
  'food forest patch': Trees,
  'nursery bed': Sprout,

  // Elements & Structures
  pond: Waves,
  farm_pond: Waves,
  water_pond: Waves,
  tank: Cylinder,
  water_tank: Cylinder,
  swale: Waves,
  swale_keyline: Waves,
  irrigation: Droplets,
  irrigation_line: Droplets,
  path: Footprints,
  pathway: Footprints,
  fence: Fence,
  gate: DoorOpen,
  shed: Warehouse,
  tool_shed: Warehouse,
  greenhouse: Building2,
  polyhouse: Building2,
  compost: Recycle,
  compost_unit: Recycle,
  cow_shed: Milk,
  gaushala: Milk,
  coop: Egg,
  chicken_coop: Egg,
  poultry: Bird,
  goat: Home,
  goat_shelter: Home,

  // Generic & Fallbacks
  sprout: Sprout,
  leaf: Leaf,
  flower: Flower2,
  droplets: Droplets,
  layers: Layers,
  building: Building2,
  tree_pine: TreePine,
  wheat: Wheat,
  nut: Nut,
  carrot_icon: Carrot,
  apple_icon: Apple,
  banana_icon: Banana,
  bean_icon: Bean,
  citrus_icon: Citrus,
};

interface DesignerIconProps extends LucideProps {
  name?: string;
  category?: string;
  fallback?: React.ComponentType<LucideProps>;
}

export function DesignerIcon({
  name = '',
  category,
  fallback = Sprout,
  className = 'h-4 w-4',
  ...props
}: DesignerIconProps) {
  const normalized = name.toLowerCase().trim().replace(/[\s\-_]+/g, '_');
  const IconComponent =
    ICON_MAP[normalized] ||
    ICON_MAP[name.toLowerCase().trim()] ||
    (category === 'water'
      ? Waves
      : category === 'animal'
      ? Milk
      : category === 'infrastructure'
      ? Building2
      : category === 'Trees'
      ? TreePine
      : category === 'Fruit Crops'
      ? Apple
      : category === 'Herbs'
      ? Flower2
      : fallback);

  return <IconComponent className={className} {...props} />;
}

export default DesignerIcon;
