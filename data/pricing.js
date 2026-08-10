const pricingPackages = [
  {
    id: "starter",
    name: "STARTER",
    description: "Perfect for personal portfolios, simple landings, and starting projects.",
    price: "$600",
    features: [
      "Single Landing Page",
      "Minimalist Design",
      "Fully Responsive Layout",
      "Contact Form Integration",
      "Basic SEO Setup",
      "1 Week Delivery",
      "1 Month Free Support"
    ],
    recommended: false
  },
  {
    id: "professional",
    name: "PROFESSIONAL",
    description: "Ideal for growing businesses that need custom solutions and robust performance.",
    price: "$1,500",
    features: [
      "Up to 5 Pages Website",
      "Custom Typography & Brand Assets",
      "Custom Contact / Inquiry Form",
      "Advanced SEO Optimization",
      "CMS Setup (Edit content easily)",
      "2-3 Weeks Delivery",
      "3 Months Support"
    ],
    recommended: true
  },
  {
    id: "custom",
    name: "CUSTOM",
    description: "For bespoke e-commerce shops, complex web apps, and AI integrations.",
    price: "Custom",
    features: [
      "Unlimited Pages / App Views",
      "Bespoke System Architecture",
      "E-commerce or Database App",
      "AI Functionality Integration",
      "Premium Speed Optimization",
      "Flexible Delivery Timeline",
      "6 Months Support"
    ],
    recommended: false
  }
];

module.exports = pricingPackages;
