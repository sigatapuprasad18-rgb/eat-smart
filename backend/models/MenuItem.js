const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  dietType: { type: String, enum: ['Veg', 'Non-Veg', 'Egg', 'Vegan'], required: true },
  costCredits: { type: Number, required: true },
  calories: { type: Number, required: true },
  proteinG: { type: Number, required: true },
  carbsG: { type: Number, default: 30.0 },
  fatG: { type: Number, default: 10.0 },
  isAvailable: { type: Boolean, default: true },
  isFavourite: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
