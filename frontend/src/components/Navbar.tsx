"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Salad, Wallet, UtensilsCrossed, BookOpen, Clock, Settings, Sparkles } from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface NavbarProps {
  profile: UserProfile | null;
  onEditSetup: () => void;
}

export default function Navbar({ profile, onEditSetup }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Meal Suggestor', icon: UtensilsCrossed },
    { href: '/limits', label: 'Wallet & Limits', icon: Wallet },
    { href: '/catalog', label: 'Menu Catalog', icon: BookOpen },
    { href: '/logs', label: 'Tracked Logs', icon: Clock },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.15, rotate: 10 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25"
          >
            <Salad className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              EatSmart
            </span>
            <span className="block text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
              Mess Credit & Meal Tracker
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className="relative">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-indigo-600/30 border border-indigo-500/50 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Wallet Balance Widget */}
        <div className="flex items-center gap-3">
          {profile && (
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance</span>
                <span className="text-sm font-extrabold text-white">₹{profile.currentBalance.toFixed(1)}</span>
              </div>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEditSetup}
            className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 rounded-xl shadow-md shadow-indigo-600/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup Wallet</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
