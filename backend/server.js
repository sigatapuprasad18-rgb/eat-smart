const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { CATALOG_DATA, parseCatalogItem } = require('./seedData');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Models
const Profile = require('./models/Profile');
const MenuItem = require('./models/MenuItem');
const MealLog = require('./models/MealLog');
const Transaction = require('./models/Transaction');

// Helper for Real-Time Billing Cycle
function getRealtimeCycleDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const formatDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

// ---------------------------------------------------------
// In-Memory Fallback State (If MongoDB Service is not running)
// ---------------------------------------------------------
const { startDate: defStart, endDate: defEnd } = getRealtimeCycleDates();
let memoryProfile = {
  id: 1,
  monthlyBudget: 8600.0,
  currentBalance: 8600.0,
  cycleStartDate: defStart,
  cycleEndDate: defEnd,
  fitnessGoal: "Muscle Gain",
  targetCalories: 2200,
  targetProtein: 75,
  targetCarbs: 250,
  targetFat: 65,
  isSetupComplete: false
};

let memoryMenuItems = CATALOG_DATA.map((item, idx) => ({ id: idx + 1, _id: String(idx + 1), ...parseCatalogItem(item) }));
let memoryMealLogs = [];
let memoryTransactions = [{
  id: 1,
  _id: '1',
  timestamp: new Date().toISOString(),
  type: 'INITIAL_BUDGET',
  amount: 8600.0,
  balanceAfter: 8600.0,
  description: 'Initial monthly budget setup'
}];

// Helper to check DB connection
function isDBConnected() {
  const mongoose = require('mongoose');
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// Auto-seed MongoDB on connection
async function seedDatabaseIfEmpty() {
  try {
    if (!isDBConnected()) return;
    const { startDate, endDate } = getRealtimeCycleDates();
    let prof = await Profile.findOne({ id: 1 });
    if (!prof) {
      await Profile.create({
        id: 1,
        monthlyBudget: 8600.0,
        currentBalance: 8600.0,
        cycleStartDate: startDate,
        cycleEndDate: endDate,
        fitnessGoal: 'Muscle Gain',
        targetCalories: 2200,
        targetProtein: 75,
        isSetupComplete: false
      });
      console.log('🌱 Initialized default user Profile in MongoDB');
    }

    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      const parsed = CATALOG_DATA.map(parseCatalogItem);
      await MenuItem.insertMany(parsed);
      console.log(`🌱 Seeded ${parsed.length} menu items into MongoDB`);
    }

    const txCount = await Transaction.countDocuments();
    if (txCount === 0) {
      await Transaction.create({
        id: 1,
        timestamp: new Date().toISOString(),
        type: 'INITIAL_BUDGET',
        amount: 8600.0,
        balanceAfter: 8600.0,
        description: 'Initial monthly budget setup'
      });
      console.log('🌱 Seeded initial transaction into MongoDB');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

connectDB().then(() => {
  seedDatabaseIfEmpty();
});

// ---------------------------------------------------------
// ROUTES: Profile
// ---------------------------------------------------------
app.get('/api/profile', async (req, res) => {
  try {
    const { startDate, endDate } = getRealtimeCycleDates();
    if (isDBConnected()) {
      let prof = await Profile.findOne({ id: 1 });
      if (!prof) {
        prof = await Profile.create({
          id: 1,
          monthlyBudget: 8600.0,
          currentBalance: 8600.0,
          cycleStartDate: startDate,
          cycleEndDate: endDate,
          fitnessGoal: 'Muscle Gain',
          targetCalories: 2200,
          targetProtein: 75,
          isSetupComplete: false
        });
      } else if (prof.cycleStartDate !== startDate || prof.cycleEndDate !== endDate) {
        prof.cycleStartDate = startDate;
        prof.cycleEndDate = endDate;
        await prof.save();
      }
      return res.json(prof);
    } else {
      memoryProfile.cycleStartDate = startDate;
      memoryProfile.cycleEndDate = endDate;
      return res.json(memoryProfile);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const { monthlyBudget, currentBalance, fitnessGoal, targetCalories, targetProtein, isSetupComplete } = req.body;
    const { startDate, endDate } = getRealtimeCycleDates();

    if (isDBConnected()) {
      let prof = await Profile.findOne({ id: 1 });
      if (!prof) prof = new Profile({ id: 1 });

      if (monthlyBudget !== undefined) prof.monthlyBudget = Number(monthlyBudget);
      if (currentBalance !== undefined) prof.currentBalance = Number(currentBalance);
      prof.cycleStartDate = startDate;
      prof.cycleEndDate = endDate;
      if (fitnessGoal) prof.fitnessGoal = fitnessGoal;
      if (targetCalories) prof.targetCalories = Number(targetCalories);
      if (targetProtein) prof.targetProtein = Number(targetProtein);
      if (isSetupComplete !== undefined) prof.isSetupComplete = Boolean(isSetupComplete);

      await prof.save();
      return res.json(prof);
    } else {
      if (monthlyBudget !== undefined) memoryProfile.monthlyBudget = Number(monthlyBudget);
      if (currentBalance !== undefined) memoryProfile.currentBalance = Number(currentBalance);
      memoryProfile.cycleStartDate = startDate;
      memoryProfile.cycleEndDate = endDate;
      if (fitnessGoal) memoryProfile.fitnessGoal = fitnessGoal;
      if (targetCalories) memoryProfile.targetCalories = Number(targetCalories);
      if (targetProtein) memoryProfile.targetProtein = Number(targetProtein);
      if (isSetupComplete !== undefined) memoryProfile.isSetupComplete = Boolean(isSetupComplete);

      return res.json(memoryProfile);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// ROUTES: Menu Catalog
// ---------------------------------------------------------
app.get('/api/menu', async (req, res) => {
  try {
    if (isDBConnected()) {
      let items = await MenuItem.find({}).sort({ isFavourite: -1, category: 1, name: 1 });
      if (items.length === 0) {
        const parsed = CATALOG_DATA.map(parseCatalogItem);
        items = await MenuItem.insertMany(parsed);
      }
      return res.json(items);
    } else {
      return res.json(memoryMenuItems);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', async (req, res) => {
  try {
    const { name, category, dietType, costCredits, calories, proteinG } = req.body;
    if (!name || !costCredits) {
      return res.status(400).json({ error: 'Name and Cost Credits required' });
    }

    const protCal = Number(proteinG || 0) * 4;
    const remCal = Math.max(0, Number(calories || 0) - protCal);
    const carbsG = Number(((remCal * 0.65) / 4).toFixed(1));
    const fatG = Number(((remCal * 0.35) / 9).toFixed(1));

    const itemData = {
      name,
      category: category || 'Tiffin',
      dietType: dietType || 'Veg',
      costCredits: Number(costCredits),
      calories: Number(calories || 0),
      proteinG: Number(proteinG || 0),
      carbsG,
      fatG,
      isAvailable: true,
      isFavourite: false
    };

    if (isDBConnected()) {
      const newItem = await MenuItem.create(itemData);
      return res.status(201).json(newItem);
    } else {
      const newItem = { id: memoryMenuItems.length + 1, _id: String(memoryMenuItems.length + 1), ...itemData };
      memoryMenuItems.push(newItem);
      return res.status(201).json(newItem);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menu/:id/toggle-fav', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      const item = await MenuItem.findById(id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.isFavourite = !item.isFavourite;
      await item.save();
      return res.json(item);
    } else {
      const item = memoryMenuItems.find(i => String(i.id) === id || String(i._id) === id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.isFavourite = !item.isFavourite;
      return res.json(item);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menu/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    if (isDBConnected()) {
      const item = await MenuItem.findById(id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.isAvailable = !item.isAvailable;
      await item.save();
      return res.json(item);
    } else {
      const item = memoryMenuItems.find(i => String(i.id) === id || String(i._id) === id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      item.isAvailable = !item.isAvailable;
      return res.json(item);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// ROUTES: Meal Logs & Transactions
// ---------------------------------------------------------
app.get('/api/meals', async (req, res) => {
  try {
    if (isDBConnected()) {
      const logs = await MealLog.find({}).sort({ loggedAt: -1 });
      return res.json(logs);
    } else {
      return res.json(memoryMealLogs);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meals', async (req, res) => {
  try {
    const { mealPeriod, itemDetails, totalCredits, totalCalories, totalProtein, notes } = req.body;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const cost = Number(totalCredits);

    if (isDBConnected()) {
      const prof = await Profile.findOne({ id: 1 });
      const newBal = Math.max(0, (prof ? prof.currentBalance : 8600) - cost);

      if (prof) {
        prof.currentBalance = newBal;
        await prof.save();
      }

      const log = await MealLog.create({
        date: dateStr,
        mealPeriod: mealPeriod || 'Meal',
        itemDetails: itemDetails || [],
        totalCredits: cost,
        totalCalories: Number(totalCalories || 0),
        totalProtein: Number(totalProtein || 0),
        notes: notes || 'Logged from Meal Suggestor'
      });

      await Transaction.create({
        type: 'EXPENSE',
        amount: cost,
        balanceAfter: newBal,
        description: `Meal Expense #${log._id} (${mealPeriod || 'Meal'})`
      });

      return res.status(201).json({ log, newBalance: newBal });
    } else {
      memoryProfile.currentBalance = Math.max(0, memoryProfile.currentBalance - cost);
      const log = {
        _id: String(memoryMealLogs.length + 1),
        id: memoryMealLogs.length + 1,
        loggedAt: now.toISOString(),
        date: dateStr,
        mealPeriod: mealPeriod || 'Meal',
        itemDetails: itemDetails || [],
        totalCredits: cost,
        totalCalories: Number(totalCalories || 0),
        totalProtein: Number(totalProtein || 0),
        notes: notes || 'Logged from Meal Suggestor'
      };
      memoryMealLogs.unshift(log);

      memoryTransactions.unshift({
        _id: String(memoryTransactions.length + 1),
        id: memoryTransactions.length + 1,
        timestamp: now.toISOString(),
        type: 'EXPENSE',
        amount: cost,
        balanceAfter: memoryProfile.currentBalance,
        description: `Meal Expense #${log.id} (${mealPeriod || 'Meal'})`
      });

      return res.status(201).json({ log, newBalance: memoryProfile.currentBalance });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/meals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDBConnected()) {
      const log = await MealLog.findById(id);
      if (!log) return res.status(404).json({ error: 'Log not found' });

      const refund = log.totalCredits;
      const prof = await Profile.findOne({ id: 1 });
      const newBal = (prof ? prof.currentBalance : 0) + refund;

      if (prof) {
        prof.currentBalance = newBal;
        await prof.save();
      }

      await Transaction.create({
        type: 'REFUND',
        amount: refund,
        balanceAfter: newBal,
        description: `Reversal for deleted Meal Log #${id}`
      });

      await MealLog.findByIdAndDelete(id);
      return res.json({ message: 'Meal expense reversed', newBalance: newBal });
    } else {
      const idx = memoryMealLogs.findIndex(l => String(l.id) === id || String(l._id) === id);
      if (idx === -1) return res.status(404).json({ error: 'Log not found' });

      const log = memoryMealLogs[idx];
      memoryProfile.currentBalance += log.totalCredits;
      memoryMealLogs.splice(idx, 1);

      memoryTransactions.unshift({
        _id: String(memoryTransactions.length + 1),
        id: memoryTransactions.length + 1,
        timestamp: new Date().toISOString(),
        type: 'REFUND',
        amount: log.totalCredits,
        balanceAfter: memoryProfile.currentBalance,
        description: `Reversal for deleted Meal Log #${id}`
      });

      return res.json({ message: 'Meal expense reversed', newBalance: memoryProfile.currentBalance });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    if (isDBConnected()) {
      const txs = await Transaction.find({}).sort({ timestamp: -1 }).limit(100);
      return res.json(txs);
    } else {
      return res.json(memoryTransactions);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    const { startDate, endDate } = getRealtimeCycleDates();
    if (isDBConnected()) {
      await MenuItem.deleteMany({});
      await MealLog.deleteMany({});
      await Transaction.deleteMany({});
      await Profile.deleteMany({});

      await Profile.create({
        id: 1,
        monthlyBudget: 8600.0,
        currentBalance: 8600.0,
        cycleStartDate: startDate,
        cycleEndDate: endDate,
        fitnessGoal: 'Muscle Gain',
        targetCalories: 2200,
        targetProtein: 75,
        isSetupComplete: false
      });

      const parsed = CATALOG_DATA.map(parseCatalogItem);
      await MenuItem.insertMany(parsed);

      await Transaction.create({
        type: 'INITIAL_BUDGET',
        amount: 8600.0,
        balanceAfter: 8600.0,
        description: 'Initial monthly budget allocation'
      });
    } else {
      memoryProfile = {
        id: 1,
        monthlyBudget: 8600.0,
        currentBalance: 8600.0,
        cycleStartDate: startDate,
        cycleEndDate: endDate,
        fitnessGoal: "Muscle Gain",
        targetCalories: 2200,
        targetProtein: 75,
        targetCarbs: 250,
        targetFat: 65,
        isSetupComplete: false
      };
      memoryMenuItems = CATALOG_DATA.map((item, idx) => ({ id: idx + 1, _id: String(idx + 1), ...parseCatalogItem(item) }));
      memoryMealLogs = [];
      memoryTransactions = [{
        id: 1,
        _id: '1',
        timestamp: new Date().toISOString(),
        type: 'INITIAL_BUDGET',
        amount: 8600.0,
        balanceAfter: 8600.0,
        description: 'Initial monthly budget setup'
      }];
    }

    return res.json({ message: 'Catalog and logs reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EatSmart Express API running on http://localhost:${PORT}`);
});
