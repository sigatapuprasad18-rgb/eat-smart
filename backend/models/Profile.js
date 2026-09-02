const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  id: { type: Number, default: 1, unique: true },
  monthlyBudget: { type: Number, default: 8600.0 },
  currentBalance: { type: Number, default: 8600.0 },
  cycleStartDate: { type: String, required: true },
  cycleEndDate: { type: String, required: true },
  fitnessGoal: { type: String, default: 'Muscle Gain' },
  targetCalories: { type: Number, default: 2200 },
  targetProtein: { type: Number, default: 75 },
  targetCarbs: { type: Number, default: 250 },
  targetFat: { type: Number, default: 65 },
  isSetupComplete: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Profile', ProfileSchema);
