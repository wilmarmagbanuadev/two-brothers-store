export type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  image: string;
  featured?: boolean;
};

export const categories = [
  "Beer",
  "Soft Drinks",
  "Chips & Curls",
  "Canned Goods",
  "Condiments",
  "Rice",
  "Feeds",
  "Ice Cream",
  "Toiletries",
  "Others"
];

export const products: Product[] = [
  {
    id: "san-miguel-pale-pilsen",
    name: "San Miguel Pale Pilsen",
    category: "Beer",
    price: "₱75.00",
    description: "A cold beer option for adults, stocked for quick neighborhood pickup.",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=900&q=80",
    featured: true
  },
  {
    id: "coca-cola-family-bottle",
    name: "Coca-Cola Family Bottle",
    category: "Soft Drinks",
    price: "₱95.00",
    description: "A family-size soft drink bottle for meals, merienda, and small gatherings.",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80",
    featured: true
  },
  {
    id: "cheese-curls-pack",
    name: "Cheese Curls Pack",
    category: "Chips & Curls",
    price: "₱18.00",
    description: "Crunchy cheese curls for snacks, baon, or quick merienda.",
    image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=900&q=80",
    featured: true
  },
  {
    id: "sardines-in-tomato-sauce",
    name: "Sardines in Tomato Sauce",
    category: "Canned Goods",
    price: "₱28.00",
    description: "A pantry staple for fast meals with rice.",
    image: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "soy-sauce-pouch",
    name: "Soy Sauce Pouch",
    category: "Condiments",
    price: "₱15.00",
    description: "Small-format condiment pouch for everyday cooking and dipping.",
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "premium-rice-kilo",
    name: "Premium Rice 1kg",
    category: "Rice",
    price: "₱62.00",
    description: "Everyday rice sold by kilo for flexible household restocking.",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
    featured: true
  },
  {
    id: "chicken-feeds-sack",
    name: "Chicken Feeds",
    category: "Feeds",
    price: "₱48.00",
    description: "Basic feeds for backyard poultry and small household needs.",
    image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "ice-cream-cup",
    name: "Ice Cream Cup",
    category: "Ice Cream",
    price: "₱35.00",
    description: "Single-serve frozen treat for quick neighborhood snacks.",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "shampoo-sachet",
    name: "Shampoo Sachet",
    category: "Toiletries",
    price: "₱8.00",
    description: "Affordable single-use sachet for daily personal care.",
    image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "instant-noodles",
    name: "Instant Noodles",
    category: "Others",
    price: "₱16.00",
    description: "Quick-cook noodles for easy meals and emergency pantry stock.",
    image: "https://images.unsplash.com/photo-1607328874071-45a9cd600644?auto=format&fit=crop&w=900&q=80"
  }
];

export function getProduct(id: string) {
  return products.find((product) => product.id === id);
}
