// Shared in-memory data for users and subscriptions

const users = {};
const pendingVerifications = {};
const pendingSubscriptions = {};
const subscriptionPlans = {
  free: {
    name: "Free Trial",
    price: 0,
    emailLimit: 10,
    features: ["Basic email sending", "Single template"]
  },
  basic: {
    name: "Basic Plan",
    price: 9.99,
    emailLimit: 1000,
    features: ["Priority support", "Multiple templates", "Email tracking"]
  },
  premium: {
    name: "Premium Plan",
    price: 29.99,
    emailLimit: 5000,
    features: ["Unlimited templates", "Advanced analytics", "API access"]
  }
};

module.exports = {
  users,
  pendingVerifications,
  pendingSubscriptions,
  subscriptionPlans
};
