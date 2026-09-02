const mongoose = require('mongoose');

const MealLogSchema = new mongoose.Schema({
  loggedAt: { type: Date, default: Date.now },
  date: { type: String, required: true },
  mealPeriod: { type: String, required: true },
  itemDetails: [{
    name: String,
    qty: { type: Number, default: 1 },
    unitPrice: Number,
    subtotal: Number,
    calories: Number,
    protein: Number
  }],
  totalCredits: { type: Number, required: true },
  totalCalories: { type: Number, required: true },
  totalProtein: { type: Number, required: true },
  totalCarbs: { type: Number, default: 0 },
  totalFat: { type: Number, default: 0 },
  notes: { type: String, default: 'Logged from Meal Suggestor' }
}, { timestamps: true });

module.exports = mongoose.model('MealLog', MealLogSchema);
