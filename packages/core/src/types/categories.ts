export type BusinessType =
  | 'general'
  | 'clothing'
  | 'bakery'
  | 'electronics'
  | 'foods'
  | 'hotel'
  | 'pharmacy'
  | 'hardware'
  | 'cosmetics'
  | 'other';

export interface BusinessTypeMeta {
  id: BusinessType;
  label: string;
  sub: string;
  icon: string;
  color: string;
}

export const BUSINESS_TYPES: BusinessTypeMeta[] = [
  {
    id: 'general',
    label: 'General / Kirana',
    sub: 'Grocery, FMCG, Provisions & Daily Essentials',
    icon: 'shopping-bag',
    color: '#FF4500',
  },
  {
    id: 'clothing',
    label: 'Clothing & Fashion',
    sub: 'Apparel, Boutique, Sarees, Footwear & Fabrics',
    icon: 'tag',
    color: '#EC4899',
  },
  {
    id: 'bakery',
    label: 'Bakery & Sweets',
    sub: 'Cakes, Pastries, Bread, Cookies & Confectionery',
    icon: 'coffee',
    color: '#D97706',
  },
  {
    id: 'electronics',
    label: 'Electronics & Mobile',
    sub: 'Smartphones, Gadgets, Cables, Accessories & Tech',
    icon: 'smartphone',
    color: '#3B82F6',
  },
  {
    id: 'foods',
    label: 'Foods & Restaurant',
    sub: 'Cafe, Fast Food, MoMo, Dining & Catering',
    icon: 'utensils',
    color: '#EF4444',
  },
  {
    id: 'hotel',
    label: 'Hotel & Hospitality',
    sub: 'Lodge, Rooms, Banquet, Dining & Guest Services',
    icon: 'home',
    color: '#8B5CF6',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy & Medical',
    sub: 'Medicines, Wellness, Surgical & Healthcare',
    icon: 'activity',
    color: '#10B981',
  },
  {
    id: 'hardware',
    label: 'Hardware & Electrical',
    sub: 'Paints, Tools, Plumbing, Pipes & Building Materials',
    icon: 'tool',
    color: '#06B6D4',
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics & Beauty',
    sub: 'Skincare, Makeup, Perfumes & Personal Grooming',
    icon: 'smile',
    color: '#F43F5E',
  },
  {
    id: 'other',
    label: 'Other Business',
    sub: 'Services, Wholesale, Tailoring & Specialized Retail',
    icon: 'grid',
    color: '#64748B',
  },
];

export const CATEGORY_PRESETS: Record<BusinessType, string[]> = {
  general: [
    'Dal & Pulses',
    'Rice & Grains',
    'Oil & Ghee',
    'Spices & Masala',
    'Biscuits & Snacks',
    'Beverages & Cold Drinks',
    'Dairy Products',
    'Personal Care',
    'Cleaning & Household',
    'Instant Noodles',
    'General',
  ],
  clothing: [
    "Men's Wear",
    "Women's Wear",
    'Kids & Baby',
    'Fabrics & Sarees',
    'Footwear',
    'Winter Wear',
    'Formal & Suits',
    'Traditional & Kurtha',
    'Accessories & Belts',
    'Undergarments',
    'General',
  ],
  bakery: [
    'Cakes & Pastries',
    'Breads & Buns',
    'Cookies & Biscuits',
    'Puffs & Savouries',
    'Chocolates & Desserts',
    'Beverages & Coffee',
    'Baking Ingredients',
    'General',
  ],
  electronics: [
    'Smartphones & Tablets',
    'Cables & Chargers',
    'Audio & Earphones',
    'Phone Cases & Glass',
    'Home Appliances',
    'Computers & Laptops',
    'Power Banks & Batteries',
    'Smartwatches & Fitness',
    'General',
  ],
  foods: [
    'Hot Beverages & Tea',
    'Cold Drinks & Juices',
    'Fast Food & MoMo',
    'Breakfast & Bakery',
    'Main Course (Thali)',
    'Snacks & Starters',
    'Desserts & Ice Cream',
    'General',
  ],
  hotel: [
    'Room Tariff',
    'Food & Dining',
    'Beverages & Mini-Bar',
    'Laundry Services',
    'Spa & Wellness',
    'Banquet & Events',
    'Tour & Transport',
    'General',
  ],
  pharmacy: [
    'Antibiotics & Prescription',
    'Pain Relief & Fever',
    'Cold, Cough & Allergy',
    'Vitamins & Supplements',
    'Digestive & Gastro',
    'First Aid & Bandages',
    'Baby & Mother Care',
    'Surgical & Diagnostic',
    'General',
  ],
  hardware: [
    'Hand & Power Tools',
    'Paints & Primers',
    'Plumbing & Pipes',
    'Electrical & Wiring',
    'Fasteners & Screws',
    'Sanitaryware & Taps',
    'Adhesives & Sealants',
    'General',
  ],
  cosmetics: [
    'Skincare & Lotions',
    'Haircare & Shampoo',
    'Makeup & Cosmetics',
    'Perfumes & Deodorants',
    'Bath & Body Care',
    'Men\'s Grooming',
    'Sun Protection',
    'General',
  ],
  other: [
    'General Items',
    'Services',
    'Custom Products',
    'Packaged Goods',
    'Accessories',
  ],
};
