"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Calendar, TrendingUp, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OnboardingModal from '@/components/OnboardingModal';
import { api } from '@/lib/api';
import { UserProfile } from '@/lib/types';

export default function WalletLimitsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [proposedSpend, setProposedSpend] = useState<number>(100);

  const loadData = async () => {
    try {
      setLoading(true);
      const prof = await api.getProfile();
      setProfile(prof);
      
      const days = Math.max(1, Math.ceil((new Date(prof.cycleEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + 1);
      const safeDaily = prof.currentBalance / days;
      setProposedSpend(Number(safeDaily.toFixed(1)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (data: { monthlyBudget: number; currentBalance: number; fitnessGoal: string }) => {
    const updated = await api.updateProfile({ ...data, isSetupComplete: true });
    setProfile(updated);
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#0b0f19]">
        <Navbar profile={profile} onEditSetup={() => setShowOnboarding(true)} />
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const daysRemaining = Math.max(1, Math.ceil((new Date(profile.cycleEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + 1);
  const safeDailyBurn = profile.currentBalance / daysRemaining;
  const safeWeeklyLimit = safeDailyBurn * 7;
  const safeBiweeklyLimit = safeDailyBurn * 14;

  const simFutureSpend = proposedSpend * daysRemaining;
  const simEndBalance = profile.currentBalance - simFutureSpend;
  const simDaysLast = proposedSpend > 0 ? profile.currentBalance / proposedSpend : daysRemaining;
  const simDepletionDate = new Date();
  simDepletionDate.setDate(simDepletionDate.getDate() + Math.floor(simDaysLast));

  return (
    <div className="min-h-screen pb-16 bg-[#0b0f19]">
      <Navbar profile={profile} onEditSetup={() => setShowOnboarding(true)} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} profile={profile} onSave={handleSaveProfile} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">💳 Wallet Credits & Multi-Tier Expense Limits</h1>
          <p className="text-slate-400 text-sm mt-1">Automated multi-tier limits calculated to prevent monthly credit miscalculations.</p>
        </motion.div>

        {/* 4 Multi-Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div whileHover={{ y: -4 }} className="glass-card p-6 border-emerald-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Current Balance</span>
            <div className="text-3xl font-extrabold text-white mt-2">₹{profile.currentBalance.toFixed(1)}</div>
            <span className="text-xs text-emerald-400 font-semibold mt-2 block">Allocated: ₹{profile.monthlyBudget.toFixed(1)}</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="glass-card p-6 border-indigo-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">📌 Daily Expense Limit</span>
            <div className="text-3xl font-extrabold text-indigo-400 mt-2">₹{safeDailyBurn.toFixed(1)}</div>
            <span className="text-xs text-slate-400 font-semibold mt-2 block">Per day allowance cap</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="glass-card p-6 border-amber-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">📌 Weekly Limit</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">₹{safeWeeklyLimit.toFixed(1)}</div>
            <span className="text-xs text-slate-400 font-semibold mt-2 block">7-day allowance cap</span>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="glass-card p-6 border-purple-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">📌 Bi-Weekly Limit</span>
            <div className="text-3xl font-extrabold text-purple-400 mt-2">₹{safeBiweeklyLimit.toFixed(1)}</div>
            <span className="text-xs text-slate-400 font-semibold mt-2 block">14-day allowance cap</span>
          </motion.div>
        </div>

        {/* Burn Rate Simulator */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Interactive Credit Burn Rate Simulator</h2>
              <p className="text-xs text-slate-400">Slide to test proposed daily spending velocity and preview credit depletion dates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-slate-300">Proposed Daily Spend (₹ / day)</label>
                <span className="text-xl font-extrabold text-indigo-400">₹{proposedSpend.toFixed(1)}</span>
              </div>

              <input
                type="range"
                min="10"
                max={Math.max(500, safeDailyBurn * 2)}
                step="5"
                value={proposedSpend}
                onChange={(e) => setProposedSpend(Number(e.target.value))}
                className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <div className="flex justify-between text-xs text-slate-500 mt-2 font-bold">
                <span>₹10/day</span>
                <span>₹{safeDailyBurn.toFixed(0)}/day (Safe)</span>
                <span>₹{Math.max(500, safeDailyBurn * 2).toFixed(0)}/day</span>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-6 border border-white/10 space-y-4">
              {simEndBalance >= 0 ? (
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-lg mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Projected End Balance: +₹{simEndBalance.toFixed(1)} SURPLUS</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Estimated spend for remaining {daysRemaining} days is ₹{simFutureSpend.toFixed(1)}. Credits will cover full cycle until <b>{simDepletionDate.toDateString()}</b>.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-rose-400 font-extrabold text-lg mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Projected End Balance: -₹{Math.abs(simEndBalance).toFixed(1)} DEFICIT</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Credits will run out early on <b>{simDepletionDate.toDateString()}</b> ({Math.floor(simDaysLast)} days from now).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
