import axios from 'axios';
import { UserProfile, MenuItem, MealLog, Transaction } from './types';

const API_BASE = 'http://localhost:5000/api';

export const api = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await axios.get(`${API_BASE}/profile`);
    return res.data;
  },
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await axios.put(`${API_BASE}/profile`, data);
    return res.data;
  },
  getMenu: async (): Promise<MenuItem[]> => {
    const res = await axios.get(`${API_BASE}/menu`);
    return res.data;
  },
  addMenuItem: async (data: Partial<MenuItem>): Promise<MenuItem> => {
    const res = await axios.post(`${API_BASE}/menu`, data);
    return res.data;
  },
  toggleFav: async (id: string): Promise<MenuItem> => {
    const res = await axios.put(`${API_BASE}/menu/${id}/toggle-fav`);
    return res.data;
  },
  toggleStatus: async (id: string): Promise<MenuItem> => {
    const res = await axios.put(`${API_BASE}/menu/${id}/toggle-status`);
    return res.data;
  },
  getMeals: async (): Promise<MealLog[]> => {
    const res = await axios.get(`${API_BASE}/meals`);
    return res.data;
  },
  logMeal: async (data: {
    mealPeriod: string;
    itemDetails: any[];
    totalCredits: number;
    totalCalories: number;
    totalProtein: number;
    notes?: string;
  }): Promise<{ log: MealLog; newBalance: number }> => {
    const res = await axios.post(`${API_BASE}/meals`, data);
    return res.data;
  },
  deleteMeal: async (id: string): Promise<{ message: string; newBalance: number }> => {
    const res = await axios.delete(`${API_BASE}/meals/${id}`);
    return res.data;
  },
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await axios.get(`${API_BASE}/transactions`);
    return res.data;
  },
  seedDatabase: async (): Promise<{ message: string }> => {
    const res = await axios.post(`${API_BASE}/seed`);
    return res.data;
  }
};
