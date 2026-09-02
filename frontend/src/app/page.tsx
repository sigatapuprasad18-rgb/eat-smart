"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Salad, Flame, Dumbbell, ShoppingBag, Check, Filter, Sparkles, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OnboardingModal from '@/components/OnboardingModal';
import { api } from '@/lib/api';
import { UserProfile, MenuItem } from '@/lib/types';

export default function MealSuggestorPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Filter States
  const [mealPeriod, setMealPeriod] = useState('Breakfast / Tiffin');
  const [dietPref, setDietPref] = useState('Non-Veg Allowed');
  const [budgetToggle, setBudgetToggle] = useState('Auto');
  const [customCap, setCustomCap] = useState(100);

  // Feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profData, menuData] = await Promise.all([
        api.getProfile(),
        api.getMenu()
      ]);
      setProfile(profData);
      setMenu(menuData);

      if (!profData.isSetupComplete) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (data: { monthlyBudget: number; currentBalance: number; fitnessGoal: string }) => {
    const updated = await api.updateProfile({
      ...data,
      isSetupComplete: true
    });
    setProfile(updated);
    setFeedbackMsg("Wallet setup updated!");
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Calculations
  const daysRemaining = profile ? Math.max(1, Math.ceil((new Date(profile.cycleEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) + 1) : 29;
  const safeDailyBurn = profile ? profile.currentBalance / daysRemaining : 286.6;
  const autoMealBudget = mealPeriod === 'Full Day Combo' ? safeDailyBurn : safeDailyBurn / 2.5;

  let effectiveCap = autoMealBudget;
  if (budgetToggle === 'Under 30') effectiveCap = 30;
  else if (budgetToggle === 'Under 60') effectiveCap = 60;
  else if (budgetToggle === 'Under 120') effectiveCap = 120;
  else if (budgetToggle === 'Under 200') effectiveCap = 200;
  else if (budgetToggle === 'Custom') effectiveCap = customCap;

  // Filter Menu
  const availableItems = menu.filter((item) => {
    if (!item.isAvailable) return false;
    if (dietPref === 'Veg Only' && !['Veg', 'Vegan'].includes(item.dietType)) return false;
    if (dietPref === 'Vegan Only' && item.dietType !== 'Vegan') return false;
    if (dietPref === 'Egg Allowed' && !['Veg', 'Vegan', 'Egg'].includes(item.dietType)) return false;

    if (mealPeriod === 'Breakfast / Tiffin') return ['Tiffin', 'Bread', 'Egg', 'Beverage', 'Side'].includes(item.category);
    if (mealPeriod === 'Lunch') return ['Staple', 'Veg Gravy', 'Non-Veg Gravy', 'Biriyani', 'Chinese', 'Side', 'Beverage'].includes(item.category);
    if (mealPeriod === 'Dinner') return ['Bread', 'Tandoor', 'Veg Gravy', 'Non-Veg Gravy', 'Biriyani', 'Chinese', 'Beverage'].includes(item.category);
    if (mealPeriod === 'Snacks & Drinks') return ['Fast Food', 'Beverage', 'Dessert', 'Side'].includes(item.category);
    return true;
  });

  // Combination Generator
  const generateCombos = () => {
    const valid: { items: MenuItem[]; cost: number; protein: number; calories: number; efficiency: number }[] = [];
    const list = availableItems;

    for (let r = 1; r <= Math.min(3, list.length); r++) {
      const getCombinations = (arr: MenuItem[], k: number): MenuItem[][] => {
        if (k === 1) return arr.map(el => [el]);
        return arr.flatMap((val, index) =>
          getCombinations(arr.slice(index + 1), k - 1).map(comb => [val, ...comb])
        );
      };

      const combos = getCombinations(list, r);
      combos.forEach(cb => {
        const cost = cb.reduce((sum, x) => sum + x.costCredits, 0);
        if (cost <= effectiveCap) {
          const protein = cb.reduce((sum, x) => sum + x.proteinG, 0);
          const calories = cb.reduce((sum, x) => sum + x.calories, 0);
          const efficiency = cost > 0 ? protein / cost : 0;
          valid.push({ items: cb, cost, protein, calories, efficiency });
        }
      });
    }

    if (valid.length === 0) return null;

    const high = valid.reduce((prev, curr) => (curr.protein > prev.protein || (curr.protein === prev.protein && curr.cost > prev.cost) ? curr : prev), valid[0]);
    const budget = valid.reduce((prev, curr) => (curr.cost < prev.cost || (curr.cost === prev.cost && curr.protein > prev.protein) ? curr : prev), valid[0]);

    const medCandidates = valid.filter(c => c !== high && c !== budget);
    const med = medCandidates.length > 0 ? medCandidates.reduce((prev, curr) => (curr.efficiency > prev.efficiency ? curr : prev), medCandidates[0]) : high;

    return [
      { title: '💎 High-Value Option', subtitle: 'Max Protein & Premium Dishes', combo: high, color: 'from-indigo-500 to-purple-600', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', type: 'High' },
      { title: '⚖️ Medium / Balanced Option', subtitle: 'Optimal Price-to-Nutrition Balance', combo: med, color: 'from-amber-500 to-orange-600', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', type: 'Medium' },
      { title: '💰 Budget Friendly Option', subtitle: 'Lowest Price & Maximum Savings', combo: budget, color: 'from-emerald-500 to-teal-600', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', type: 'Budget' },
    ];
  };

  const suggestedTiers = generateCombos();

  const handleTrackMeal = async (tierType: string, combo: { items: MenuItem[]; cost: number; protein: number; calories: number }) => {
    try {
      const itemsPayload = combo.items.map(i => ({
        name: i.name,
        qty: 1,
        unitPrice: i.costCredits,
        subtotal: i.costCredits,
        calories: i.calories,
        protein: i.proteinG
      }));

      const res = await api.logMeal({
        mealPeriod,
        itemDetails: itemsPayload,
        totalCredits: combo.cost,
        totalCalories: combo.calories,
        totalProtein: combo.protein,
        notes: `${tierType} Tier Option`
      });

      if (profile) {
        setProfile({ ...profile, currentBalance: res.newBalance });
      }

      setFeedbackMsg(`Tracked ₹${combo.cost.toFixed(1)} meal expense! Wallet updated.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Failed to track meal:', err);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <Navbar profile={profile} onEditSetup={() => setShowOnboarding(true)} />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />

      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Feedback Alert */}
        <AnimatePresence>
          {feedbackMsg && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg shadow-emerald-500/10"
            >
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">{feedbackMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 p-6 md:p-8 mb-8 shadow-2xl"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalized Meal Engine</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Personalized Meal Suggestor
              </h1>
              <p className="text-slate-400 text-sm md:text-base mt-1.5 max-w-2xl font-medium">
                Compare High, Medium, and Budget-Friendly meal options with complete basket values to easily decide what to eat while staying within your daily credit allowance.
              </p>
            </div>

            {profile && (
              <div className="flex items-center gap-4 bg-slate-900/80 border border-white/10 p-4 rounded-2xl">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Daily Credit Allowance</span>
                  <span className="text-2xl font-extrabold text-emerald-400">₹{safeDailyBurn.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Filter Controls */}
        <div className="glass-panel rounded-3xl p-6 mb-8 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Meal Option</label>
              <select
                value={mealPeriod}
                onChange={(e) => setMealPeriod(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="Breakfast / Tiffin">🥐 Breakfast / Tiffin</option>
                <option value="Lunch">🍛 Lunch</option>
                <option value="Dinner">🫓 Dinner</option>
                <option value="Snacks & Drinks">🧃 Snacks & Drinks</option>
                <option value="Full Day Combo">🍱 Full Day Combo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Dietary Preference</label>
              <select
                value={dietPref}
                onChange={(e) => setDietPref(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-all"
              >
                <option value="Veg Only">🥦 Veg Only</option>
                <option value="Non-Veg Allowed">🍗 Non-Veg Allowed</option>
                <option value="Egg Allowed">🍳 Egg Allowed</option>
                <option value="Vegan Only">🌱 Vegan Only</option>
              </select>
            </div>
          </div>

          {/* Quick Budget Range Toggle Pills */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Quick Budget Cap Toggle</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'Auto', label: `⚡ Auto-Daily Cap (₹${autoMealBudget.toFixed(0)})` },
                { id: 'Under 30', label: '🏷️ Under ₹30 (Ultra Saver)' },
                { id: 'Under 60', label: '💰 Under ₹60 (Economy)' },
                { id: 'Under 120', label: '💎 Under ₹120 (Standard)' },
                { id: 'Under 200', label: '👑 Under ₹200 (Feast)' },
                { id: 'Custom', label: '⚙️ Custom Range' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setBudgetToggle(pill.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    budgetToggle === pill.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {budgetToggle === 'Custom' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 max-w-xs">
                <label className="block text-xs font-bold text-slate-400 mb-1">Enter Custom Cap (₹)</label>
                <input
                  type="number"
                  min="10"
                  max="50000"
                  value={customCap}
                  onChange={(e) => setCustomCap(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold text-sm"
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Tier Cards Section */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : !suggestedTiers ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-white/10">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">No Meal Combinations Found</h3>
            <p className="text-slate-400 text-sm mt-1">Try increasing the budget cap range or adjusting dietary filters.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-extrabold text-white mb-4">Recommended Basket Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suggestedTiers.map((tier, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card flex flex-col justify-between p-6 border border-white/10"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${tier.badgeColor}`}>
                        {tier.type} Option
                      </span>
                      <span className="text-xs font-bold text-slate-400">Cap: ₹{effectiveCap.toFixed(0)}</span>
                    </div>

                    <h3 className="text-lg font-extrabold text-white mt-1">{tier.title}</h3>
                    <p className="text-xs text-slate-400 mb-4">{tier.subtitle}</p>

                    <div className="space-y-2.5 mb-6 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                      <span className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Basket Items</span>
                      {tier.combo.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between text-xs font-bold text-slate-200">
                          <span>• {item.name}</span>
                          <span className="text-indigo-300">₹{item.costCredits.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Basket Values Card */}
                    <div className="bg-slate-900/90 rounded-2xl p-4 border border-white/10 space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-300">🛒 Basket Total Value:</span>
                        <span className="text-xl font-extrabold text-white">₹{tier.combo.cost.toFixed(1)}</span>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                          <Dumbbell className="w-3.5 h-3.5" />
                          <span>Protein: {tier.combo.protein.toFixed(1)}g</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Calories: {tier.combo.calories} kcal</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTrackMeal(tier.type, tier.combo)}
                    className={`w-full bg-gradient-to-r ${tier.color} text-white font-extrabold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Track This Meal Expense (₹{tier.combo.cost.toFixed(1)})</span>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
