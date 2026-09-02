export interface UserProfile {
  id?: number;
  _id?: string;
  monthlyBudget: number;
  currentBalance: number;
  cycleStartDate: string;
  cycleEndDate: string;
  fitnessGoal: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs?: number;
  targetFat?: number;
  isSetupComplete: boolean;
}

export interface MenuItem {
  _id: string;
  id?: number;
  name: string;
  category: string;
  dietType: 'Veg' | 'Non-Veg' | 'Egg' | 'Vegan';
  costCredits: number;
  calories: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  isAvailable: boolean;
  isFavourite: boolean;
}

export interface MealLogItem {
  name: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  calories?: number;
  protein?: number;
}

export interface MealLog {
  _id: string;
  id?: number;
  loggedAt: string;
  date: string;
  mealPeriod: string;
  itemDetails: MealLogItem[];
  totalCredits: number;
  totalCalories: number;
  totalProtein: number;
  notes?: string;
}

export interface Transaction {
  _id: string;
  id?: number;
  timestamp: string;
  type: 'EXPENSE' | 'TOPUP' | 'INITIAL_BUDGET' | 'REFUND';
  amount: number;
  balanceAfter: number;
  description: string;
}
