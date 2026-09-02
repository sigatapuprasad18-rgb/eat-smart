"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OnboardingModal from '@/components/OnboardingModal';
import { api } from '@/lib/api';
import { UserProfile } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Form State
  const [budget, setBudget] = useState(8600);
  const [balance, setBalance] = useState(8600);
  const [goal, setGoal] = useState('Muscle Gain');
  const [calories, setCalories] = useState(2200);
  const [protein, setProtein] = useState(75);

  const loadData = async () => {
    try {
      setLoading(true);
      const prof = await api.getProfile();
      setProfile(prof);
      setBudget(prof.monthlyBudget);
      setBalance(prof.currentBalance);
      setGoal(prof.fitnessGoal);
      setCalories(prof.targetCalories);
      setProtein(prof.targetProtein);
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
    setBudget(updated.monthlyBudget);
    setBalance(updated.currentBalance);
    setGoal(updated.fitnessGoal);
    setFeedbackMsg("Profile settings updated!");
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({
        monthlyBudget: Number(budget),
        currentBalance: Number(balance),
        fitnessGoal: goal,
        targetCalories: Number(calories),
        targetProtein: Number(protein),
        isSetupComplete: true
      });
      setProfile(updated);
      setFeedbackMsg("Settings saved!");
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSeed = async () => {
    try {
      await api.seedDatabase();
      await loadData();
      setFeedbackMsg("Catalog and meal logs reset!");
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen pb-16 bg-[#0b0f19]">
      <Navbar profile={profile} onEditSetup={() => setShowOnboarding(true)} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} profile={profile} onSave={handleSaveProfile} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">⚙️ User Profile & Budget Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure your monthly budget, starting balance, nutrition goals, or reset catalog data.</p>
        </motion.div>

        {feedbackMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-sm">
            {feedbackMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Settings Form */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10">
            <h3 className="text-lg font-extrabold text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              <span>Update Profile & Budget</span>
            </h3>

            <form onSubmit={handleSubmitSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Monthly Credit Allocation (₹)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Current Balance (₹)</label>
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Personal Goal Target</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-semibold"
                >
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Weight Loss / Cutting">Weight Loss / Cutting</option>
                  <option value="Budget Saver">Budget Saver</option>
                  <option value="Balanced Maintenance">Balanced Maintenance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Target Daily Calories (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Target Daily Protein (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all mt-4"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Settings</span>
              </button>
            </form>
          </div>

          {/* Wallet Summary & Reset */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10">
              <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Monthly Wallet Summary</span>
              </h3>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                  <span>Allocated Monthly Budget:</span>
                  <span className="font-extrabold text-white">₹{profile ? profile.monthlyBudget.toFixed(1) : 0}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                  <span>Current Balance Remaining:</span>
                  <span className="font-extrabold text-emerald-400">₹{profile ? profile.currentBalance.toFixed(1) : 0}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60">
                  <span>Total Spent So Far:</span>
                  <span className="font-extrabold text-rose-400">₹{profile ? (profile.monthlyBudget - profile.currentBalance).toFixed(1) : 0}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/10">
              <h3 className="text-lg font-extrabold text-white mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <span>Reset Database & Seed Data</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">Reload official student catalog data and clear current meal logs.</p>

              <button
                onClick={handleResetSeed}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl border border-white/10 transition-all"
              >
                Reload Official Catalog Data
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
