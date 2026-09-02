"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Heart, Plus, Search, Check, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OnboardingModal from '@/components/OnboardingModal';
import { api } from '@/lib/api';
import { UserProfile, MenuItem } from '@/lib/types';

export default function MenuCatalogPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Custom Item Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tiffin');
  const [dietType, setDietType] = useState<'Veg' | 'Non-Veg' | 'Egg' | 'Vegan'>('Veg');
  const [costCredits, setCostCredits] = useState(45);
  const [calories, setCalories] = useState(300);
  const [proteinG, setProteinG] = useState(10);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prof, items] = await Promise.all([api.getProfile(), api.getMenu()]);
      setProfile(prof);
      setMenu(items);
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

  const handleToggleFav = async (id: string) => {
    const updated = await api.toggleFav(id);
    setMenu(menu.map(i => i._id === id || String(i.id) === id ? updated : i));
  };

  const handleToggleStatus = async (id: string) => {
    const updated = await api.toggleStatus(id);
    setMenu(menu.map(i => i._id === id || String(i.id) === id ? updated : i));
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem = await api.addMenuItem({
      name: name.trim(),
      category,
      dietType,
      costCredits: Number(costCredits),
      calories: Number(calories),
      proteinG: Number(proteinG)
    });

    setMenu([newItem, ...menu]);
    setName('');
  };

  const categories = ['All', ...Array.from(new Set(menu.map(i => i.category)))];

  const filteredMenu = menu.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || i.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen pb-16 bg-[#0b0f19]">
      <Navbar profile={profile} onEditSetup={() => setShowOnboarding(true)} />
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} profile={profile} onSave={handleSaveProfile} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">🍔 Mess Menu Catalog</h1>
          <p className="text-slate-400 text-sm mt-1">Browse items extracted from mess catalog, manage favourites & add custom dish preferences.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Catalog Browser */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      categoryFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMenu.map(item => (
                  <motion.div key={item._id || item.id} whileHover={{ y: -3 }} className="glass-card p-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{item.name}</span>
                        {item.isFavourite && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          item.dietType === 'Veg' ? 'bg-emerald-500/20 text-emerald-300' :
                          item.dietType === 'Non-Veg' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {item.dietType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {item.category} • ₹{item.costCredits.toFixed(1)} • {item.calories} kcal • {item.proteinG}g Prot
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFav(item._id || String(item.id))}
                        className={`p-2 rounded-xl border transition-all ${
                          item.isFavourite ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(item._id || String(item.id))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          item.isAvailable ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Disabled'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Add Custom Item Form */}
          <div className="glass-panel p-6 rounded-3xl h-fit border border-white/10">
            <h3 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              <span>Add Custom Dish</span>
            </h3>

            <form onSubmit={handleAddCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Diet Type</label>
                  <select
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Veg">Veg</option>
                    <option value="Non-Veg">Non-Veg</option>
                    <option value="Egg">Egg</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={costCredits}
                    onChange={(e) => setCostCredits(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={proteinG}
                    onChange={(e) => setProteinG(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all mt-2"
              >
                Save Custom Item
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
