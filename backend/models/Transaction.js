const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['EXPENSE', 'TOPUP', 'INITIAL_BUDGET', 'REFUND'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
