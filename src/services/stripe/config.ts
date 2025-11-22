export const STRIPE_PLANS = {
  free: {
    priceId: null,
    name: "Free",
    price: 0,
    features: ["Basic features"],
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_xxx",
    name: "Pro",
    price: 29,
    features: ["All features", "Priority support"],
  },
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;

