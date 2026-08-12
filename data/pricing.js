const pricingPackages = [
  {
    id: "starter",
    name: "STARTER",
    description: "Perfect for portfolios, personal brands, and simple landing pages.",
    price: "₹2,999",
    buttonText: "Get Started →",
    features: [
      "Single Landing Page",
      "Minimalist Modern Design",
      "Fully Responsive",
      "Contact Form",
      "Basic SEO",
      "3–5 Day Delivery",
      "15 Days Free Support"
    ],
    recommended: false
  },
  {
    id: "professional",
    name: "PROFESSIONAL ⭐",
    description: "Ideal for small businesses, creators, and startups that need a polished website.",
    price: "₹6,999",
    buttonText: "Get Started →",
    features: [
      "Up to 4 Pages",
      "Custom Modern Design",
      "Contact / Inquiry Form",
      "SEO Optimization",
      "Social Media Integration",
      "Performance Optimization",
      "7–10 Day Delivery",
      "1 Month Free Support"
    ],
    recommended: true
  },
  {
    id: "custom",
    name: "CUSTOM",
    description: "For businesses that need advanced functionality and custom solutions.",
    price: "₹9,999+",
    buttonText: "Let's Talk →",
    features: [
      "Up to 8 Pages / App Views",
      "Bespoke UI & UX",
      "Database / Backend Integration",
      "AI Functionality Integration",
      "Custom API Integration",
      "Premium Performance Optimization",
      "Flexible Delivery Timeline",
      "3 Months Free Support"
    ],
    recommended: false
  }
];

module.exports = pricingPackages;
