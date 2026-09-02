"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wallet, Target, X, Check } from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSave: (data: { monthlyBudget: number; currentBalance: number; fitnessGoal: string }) => Promise<void>;
}

export default function OnboardingModal({ isOpen, onClose, profile, onSave }: OnboardingModalProps) {
  const [budget, setBudget] = useState(profile ? profile.monthlyBudget : 8600);
  const [balance, setBalance] = useState(profile ? profile.currentBalance : 8600);
  const [goal, setGoal] = useState(profile ? profile.fitnessGoal : 'Muscle Gain');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        monthlyBudget: Number(budget),
        currentBalance: Number(balance),
        fitnessGoal: goal
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg glass-panel border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl shadow-indigo-500/20"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">Mess Credit Setup</h2>
              <p className="text-xs md:text-sm text-slate-400">Configure your monthly budget to unlock daily allowance & meal suggestions.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Monthly Credit Budget Allocation (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="100"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-bold focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
                <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-semibold">Total Credit</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Current Credit Balance (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="50"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-base font-bold focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
                <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-semibold">Current Balance</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Personal Nutrition Goal Target
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="Muscle Gain">💪 Muscle Gain (Max Protein)</option>
                <option value="Weight Loss / Cutting">🔥 Weight Loss / Cutting (Low Calorie)</option>
                <option value="Budget Saver">💰 Budget Saver (Lowest Price)</option>
                <option value="Balanced Maintenance">⚖️ Balanced Maintenance</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Save Initial Wallet & Start App</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
