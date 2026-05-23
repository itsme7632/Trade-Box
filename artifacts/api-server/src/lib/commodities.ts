export interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  unit: string;
}

const BASE_PRICES: CommodityPrice[] = [
  { symbol: "COFFEE", name: "Coffee", price: 192.5, change24h: 1.2, unit: "USD/lb" },
  { symbol: "COCOA", name: "Cocoa", price: 9450.0, change24h: -0.8, unit: "USD/MT" },
  { symbol: "LI", name: "Lithium", price: 14200.0, change24h: 2.1, unit: "USD/MT" },
  { symbol: "COTTON", name: "Cotton", price: 0.83, change24h: -0.3, unit: "USD/lb" },
  { symbol: "ELEC", name: "Electronics Index", price: 1284.0, change24h: 0.5, unit: "USD" },
  { symbol: "STEEL", name: "Steel", price: 760.0, change24h: -1.1, unit: "USD/MT" },
];

let currentPrices = BASE_PRICES.map((c) => ({ ...c }));

export function getLivePrices(): CommodityPrice[] {
  currentPrices = currentPrices.map((c) => {
    const swing = (Math.random() - 0.49) * 0.4;
    const newPrice = Math.max(c.price * (1 + swing / 100), 0.01);
    const newChange = parseFloat((c.change24h + (Math.random() - 0.5) * 0.2).toFixed(2));
    return { ...c, price: parseFloat(newPrice.toFixed(2)), change24h: newChange };
  });
  return currentPrices;
}
