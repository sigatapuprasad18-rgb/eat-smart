"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, RotateCcw, Receipt, Dumbbell, Flame, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OnboardingModal from '@/components/OnboardingModal';
import { api } from '@/lib/api';
import { UserProfile, MealLog, Transaction } from '@/lib/types';

export default function TrackedMealLogsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<'meals' | 'ledger'>('meals');

  const loadData = async () => {
    try {
      setLoading(true);
      const [prof, mealLogs, txs] = await Promise.all([
        api.getProfile(),
        api.getMeals(),
        api.getTransactions()
      ]);
      setProfile(prof);
      setMeals(mealLogs);
      setTransactions(txs);
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

  const handleReverseMeal = async (id: string) => {
    try {
      const res = await api.deleteMeal(id);
      setMeals(meals.filter(m => String(m.id) !== id && m._id !== id));
      if (profile) {
        setProfile({ ...profile, currentBalance: res.newBalance });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalSpent = meals.reduce((sum, m) => sum + m.totalCredits, 0);
  const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.totalProtein, 0);

  return (
    <div className="min-h-screen pb-16 bg-[#0b0f19]">
      <Navbar profile={profile} onEditSetup={() => setShowOnboarding(true)} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} profile={profile} onSave={handleSaveProfile} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">📜 Tracked Meal Expense Logs & Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">Review all meals tracked directly from your meal suggestions, monitor total credits deducted, and manage your ledger.</p>
        </motion.div>

        {/* 4 Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 border-indigo-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Meals Tracked</span>
            <div className="text-3xl font-extrabold text-white mt-2">{meals.length} meals</div>
          </div>
          <div className="glass-card p-6 border-emerald-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Credits Spent</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">₹{totalSpent.toFixed(1)}</div>
          </div>
          <div className="glass-card p-6 border-amber-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Calories</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">{totalCalories.toLocaleString()} kcal</div>
          </div>
          <div className="glass-card p-6 border-purple-500/30">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Protein</span>
            <div className="text-3xl font-extrabold text-purple-400 mt-2">{totalProtein.toFixed(1)} g</div>
          </div>
        </div>

        {/* Subtab Toggle */}
        <div className="flex items-center gap-2 mb-6 bg-slate-900/60 p-1 rounded-2xl w-fit border border-white/5">
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'meals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🍽️ Tracked Meals History
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ledger' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            💳 Credit Transaction Audit Ledger
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : activeTab === 'meals' ? (
          meals.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10">
              <Clock className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">No Meal Expenses Tracked Yet</h3>
              <p className="text-slate-400 text-sm mt-1">Go to the Meal Suggestor tab and click 'Track This Meal Expense' to start tracking!</p>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Logged Time</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Period</th>
                      <th className="p-4">Items Tracked</th>
                      <th className="p-4">Credits (₹)</th>
                      <th className="p-4">Macros</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-semibold">
                    {meals.map(m => (
                      <tr key={m._id || m.id} className="hover:bg-white/5 transition-all">
                        <td className="p-4 text-slate-300">{new Date(m.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-4 text-slate-200">{m.date}</td>
                        <td className="p-4 font-bold text-indigo-300">{m.mealPeriod}</td>
                        <td className="p-4 text-slate-200">
                          {m.itemDetails.map(i => `${i.name} (x${i.qty || 1})`).join(', ')}
                        </td>
                        <td className="p-4 text-emerald-400 font-extrabold">₹{m.totalCredits.toFixed(1)}</td>
                        <td className="p-4 text-slate-300">
                          🔥 {m.totalCalories} kcal | 💪 {m.totalProtein.toFixed(1)}g
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleReverseMeal(m._id || String(m.id))}
                            className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-xl font-bold transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reverse</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-white/10 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount (₹)</th>
                    <th className="p-4">Balance After</th>
                    <th className="p-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-semibold">
                  {transactions.map(tx => (
                    <tr key={tx._id || tx.id} className="hover:bg-white/5 transition-all">
                      <td className="p-4 text-slate-300">{new Date(tx.timestamp).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          tx.type === 'EXPENSE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 text-white font-extrabold">₹{tx.amount.toFixed(1)}</td>
                      <td className="p-4 text-slate-300">₹{tx.balanceAfter.toFixed(1)}</td>
                      <td className="p-4 text-slate-400">{tx.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
