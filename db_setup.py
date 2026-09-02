import sqlite3
import datetime
import calendar
import json
import os

DB_PATH = "mess_planner.db"

CATALOG_DATA = [
    # Format: (name, category, price, calories, protein_g, is_veg)
    # --- Breads & Staples ---
    ("Phulka", "Bread", 9, 80, 2.5, 1),
    ("Plain Naan", "Bread", 20, 260, 7.0, 1),
    ("Butter Naan", "Bread", 25, 310, 8.0, 1),
    ("White Rice", "Staple", 33, 260, 4.0, 1),
    ("Curd", "Side", 10, 60, 3.0, 1),
    # --- Tiffin & Dosa Counter ---
    ("Masala Dosai", "Tiffin", 38, 280, 5.0, 1),
    ("Onion Dosai", "Tiffin", 38, 250, 4.5, 1),
    ("Ghee Roast", "Tiffin", 55, 340, 5.0, 1),
    ("Idly With Ckn Curry", "Tiffin", 60, 320, 14.0, 0),
    ("Dahi Vada", "Tiffin", 40, 180, 5.0, 1),
    # --- Eggs ---
    ("Full Boil (2 Eggs)", "Egg", 22, 140, 12.0, 0),
    ("Omlet", "Egg", 33, 155, 10.0, 0),
    # --- Veg Curries & Starters ---
    ("Mutter Panneer", "Veg Gravy", 60, 360, 12.0, 1),
    ("Panneer Chat Pata", "Veg Gravy", 82, 420, 14.0, 1),
    ("Kolhapuri Paneer", "Veg Gravy", 82, 430, 14.0, 1),
    ("Chilli Panneer", "Chinese", 80, 390, 13.0, 1),
    ("Veg Burger", "Fast Food", 65, 350, 8.0, 1),
    ("Veg Biriyani", "Rice", 65, 380, 7.0, 1),
    # --- Non-Veg Curries, Starters & Biriyani ---
    ("Chicken Fried Rice", "Chinese", 93, 580, 22.0, 0),
    ("Panjabi Chicken", "Non-Veg Gravy", 109, 380, 28.0, 0),
    ("Rogan Chicken", "Non-Veg Gravy", 109, 390, 27.0, 0),
    ("Shahi Chicken", "Non-Veg Gravy", 109, 410, 26.0, 0),
    ("Chicken Masala Curry", "Non-Veg Gravy", 109, 380, 28.0, 0),
    ("Chicken Cheese Burger", "Fast Food", 70, 440, 21.0, 0),
    ("Chicken Briyani", "Biriyani", 120, 650, 30.0, 0),
    ("Deshi Ckn Biriyani", "Biriyani", 152, 720, 34.0, 0),
    ("Vankoli Biriyani (Turkey)", "Biriyani", 160, 710, 36.0, 0),
    ("Mutton Biriyani", "Biriyani", 174, 780, 32.0, 0),
    ("Tandoori Chicken", "Tandoor", 120, 360, 42.0, 0),
    ("Chicken Tikka", "Tandoor", 120, 340, 38.0, 0),
    ("Fish Fry", "Tandoor", 120, 310, 28.0, 0),
    ("Rambo Chicken", "Tandoor", 120, 390, 36.0, 0),
    # --- Beverages & Desserts ---
    ("Watermelon Juice", "Beverage", 40, 90, 1.0, 1),
    ("Mojito", "Beverage", 40, 110, 0.0, 1),
    ("Muskmelon Juice", "Beverage", 40, 95, 1.0, 1),
    ("Pineapple Juice", "Beverage", 44, 120, 0.5, 1),
    ("Grape Juice", "Beverage", 44, 130, 0.8, 1),
    ("Milkshake (Any Flavor)", "Beverage", 71, 290, 6.0, 1),
    ("Waffle", "Dessert", 60, 310, 5.0, 1),
]

HISTORICAL_LOGS = [
    ("Dinner", "Ghee Roast", 55, 340, 5.0, "2026-08-11 19:55:00"),
    ("Dinner", "Ghee Roast", 55, 340, 5.0, "2026-08-11 19:55:00"),
    ("Dinner", "Omlet", 33, 155, 10.0, "2026-08-11 19:55:00"),
    ("Dinner", "Omlet", 33, 155, 10.0, "2026-08-11 19:55:00"),
    ("Dinner", "Chicken Cheese Burger", 70, 440, 21.0, "2026-08-16 20:10:00"),
    ("Dinner", "Butter Naan", 25, 310, 8.0, "2026-08-16 20:10:00"),
    ("Dinner", "Butter Naan", 25, 310, 8.0, "2026-08-16 20:10:00"),
    ("Dinner", "Grape Juice", 44, 130, 0.8, "2026-08-16 20:10:00"),
    ("Dinner", "Shahi Chicken", 109, 410, 26.0, "2026-08-16 20:10:00"),
    ("Lunch", "Chicken Fried Rice", 93, 580, 22.0, "2026-08-17 13:34:00"),
    ("Lunch", "Watermelon Juice", 40, 90, 1.0, "2026-08-17 13:34:00"),
    ("Lunch", "Rogan Chicken", 109, 390, 27.0, "2026-08-17 13:34:00"),
    ("Dinner", "Onion Dosai", 38, 250, 4.5, "2026-08-17 20:03:00"),
    ("Dinner", "Ghee Roast", 55, 340, 5.0, "2026-08-17 20:03:00"),
    ("Dinner", "Full Boil (2 Eggs)", 22, 140, 12.0, "2026-08-17 20:03:00"),
    ("Dinner", "Masala Dosai", 38, 280, 5.0, "2026-08-18 19:39:00"),
    ("Dinner", "Masala Dosai", 38, 280, 5.0, "2026-08-18 19:39:00"),
    ("Dinner", "Full Boil (2 Eggs)", 22, 140, 12.0, "2026-08-18 19:39:00"),
    ("Lunch", "Chicken Fried Rice", 93, 580, 22.0, "2026-08-19 13:00:00"),
    ("Lunch", "Pineapple Juice", 44, 120, 0.5, "2026-08-19 13:00:00"),
    ("Dinner", "Plain Naan", 20, 260, 7.0, "2026-08-19 19:07:00"),
    ("Dinner", "Plain Naan", 20, 260, 7.0, "2026-08-19 19:07:00"),
    ("Dinner", "Tandoori Chicken", 120, 360, 42.0, "2026-08-19 19:07:00"),
    ("Dinner", "Kolhapuri Paneer", 82, 430, 14.0, "2026-08-19 19:07:00"),
    ("Dinner", "Mojito", 40, 110, 0.0, "2026-08-19 19:07:00"),
    ("Dinner", "Butter Naan", 25, 310, 8.0, "2026-08-20 20:33:00"),
    ("Dinner", "Butter Naan", 25, 310, 8.0, "2026-08-20 20:33:00"),
    ("Dinner", "Chicken Fried Rice", 93, 580, 22.0, "2026-08-20 20:33:00"),
    ("Dinner", "Full Boil (2 Eggs)", 22, 140, 12.0, "2026-08-20 20:33:00"),
    ("Dinner", "Panneer Chat Pata", 82, 420, 14.0, "2026-08-20 20:33:00"),
    ("Dinner", "Grape Juice", 44, 130, 0.8, "2026-08-20 20:33:00"),
    ("Dinner", "Mojito", 40, 110, 0.0, "2026-08-20 20:33:00"),
    ("Lunch", "Chicken Briyani", 120, 650, 30.0, "2026-08-23 12:38:00"),
    ("Lunch", "Milkshake (Any Flavor)", 71, 290, 6.0, "2026-08-23 12:38:00"),
    ("Dinner", "Masala Dosai", 38, 280, 5.0, "2026-08-23 19:23:00"),
    ("Dinner", "Masala Dosai", 38, 280, 5.0, "2026-08-23 19:23:00"),
    ("Dinner", "Full Boil (2 Eggs)", 22, 140, 12.0, "2026-08-23 19:23:00"),
    ("Dinner", "Mojito", 40, 110, 0.0, "2026-08-23 19:23:00"),
    ("Lunch", "Chicken Fried Rice", 93, 580, 22.0, "2026-08-24 13:22:00"),
    ("Lunch", "Pineapple Juice", 44, 120, 0.5, "2026-08-24 13:22:00"),
    ("Lunch", "Chilli Panneer", 80, 390, 13.0, "2026-08-24 13:22:00"),
    ("Dinner", "Butter Naan", 25, 310, 8.0, "2026-08-24 20:15:00"),
    ("Dinner", "Phulka", 9, 80, 2.5, "2026-08-24 20:15:00"),
    ("Dinner", "Phulka", 9, 80, 2.5, "2026-08-24 20:15:00"),
    ("Dinner", "Mutter Panneer", 60, 360, 12.0, "2026-08-24 20:15:00"),
    ("Lunch", "White Rice", 33, 260, 4.0, "2026-08-25 13:28:00"),
    ("Lunch", "Curd", 10, 60, 3.0, "2026-08-25 13:28:00"),
    ("Lunch", "Curd", 10, 60, 3.0, "2026-08-25 13:28:00"),
    ("Lunch", "Panjabi Chicken", 109, 380, 28.0, "2026-08-25 13:28:00"),
    ("Lunch", "Chicken Fried Rice", 93, 580, 22.0, "2026-09-01 12:38:00"),
    ("Lunch", "Chilli Panneer", 80, 390, 13.0, "2026-09-01 12:38:00"),
]

def get_current_cycle_dates():
    today = datetime.date.today()
    start_date = today.replace(day=1)
    _, last_day = calendar.monthrange(today.year, today.month)
    end_date = today.replace(day=last_day)
    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

def parse_catalog_tuple(item_tuple):
    name, category, price, calories, protein_g, is_veg = item_tuple
    if category.lower() == "egg" or "egg" in name.lower() or "omlet" in name.lower():
        diet_type = "Egg"
    elif is_veg == 1:
        diet_type = "Veg"
    else:
        diet_type = "Non-Veg"
        
    prot_cal = protein_g * 4
    rem_cal = max(0, calories - prot_cal)
    carbs_g = round((rem_cal * 0.65) / 4, 1)
    fat_g = round((rem_cal * 0.35) / 9, 1)

    return (name, category, diet_type, float(price), int(calories), float(protein_g), carbs_g, fat_g, 1, 0)

def seed_historical_logs(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM meal_logs")
    if cursor.fetchone()[0] > 0:
        return

    grouped = {}
    for slot, name, price, cal, prot, ts in HISTORICAL_LOGS:
        key = (ts, slot)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append({"name": name, "price": float(price), "calories": int(cal), "protein": float(prot)})

    sorted_keys = sorted(grouped.keys(), key=lambda x: x[0])
    current_balance = 3000.0

    for ts, slot in sorted_keys:
        items = grouped[(ts, slot)]
        item_counts = {}
        for i in items:
            nm = i['name']
            if nm not in item_counts:
                item_counts[nm] = {"name": nm, "qty": 0, "unit_price": i['price'], "calories": i['calories'], "protein": i['protein']}
            item_counts[nm]['qty'] += 1

        cart_items = []
        tot_credits = 0.0
        tot_cal = 0
        tot_prot = 0.0

        for nm, data in item_counts.items():
            qty = data['qty']
            sub_cost = data['unit_price'] * qty
            sub_cal = data['calories'] * qty
            sub_prot = data['protein'] * qty
            
            tot_credits += sub_cost
            tot_cal += sub_cal
            tot_prot += sub_prot
            
            cart_items.append({
                "name": nm,
                "qty": qty,
                "unit_price": data['unit_price'],
                "subtotal": sub_cost,
                "calories": sub_cal,
                "protein": sub_prot
            })

        date_str = ts.split(" ")[0]
        rem_cal = max(0, tot_cal - (tot_prot * 4))
        tot_carbs = round((rem_cal * 0.65) / 4, 1)
        tot_fat = round((rem_cal * 0.35) / 9, 1)

        cursor.execute("""
            INSERT INTO meal_logs (logged_at, date, meal_period, item_details, total_credits, total_calories, total_protein, total_carbs, total_fat, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Imported Historical Token')
        """, (ts, date_str, slot, json.dumps(cart_items), tot_credits, tot_cal, tot_prot, tot_carbs, tot_fat))
        
        log_id = cursor.lastrowid
        current_balance = max(0.0, current_balance - tot_credits)
        
        cursor.execute("""
            INSERT INTO credit_transactions (timestamp, type, amount, balance_after, description)
            VALUES (?, 'EXPENSE', ?, ?, ?)
        """, (ts, tot_credits, current_balance, f"Historical POS Token #{log_id} ({slot})"))

    real_start, real_end = get_current_cycle_dates()
    cursor.execute("UPDATE user_profile SET current_balance = ?, cycle_start_date = ?, cycle_end_date = ? WHERE id = 1", (current_balance, real_start, real_end))
    conn.commit()

def init_db(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    real_start, real_end = get_current_cycle_dates()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        monthly_budget REAL NOT NULL DEFAULT 3000.0,
        current_balance REAL NOT NULL DEFAULT 3000.0,
        cycle_start_date TEXT NOT NULL,
        cycle_end_date TEXT NOT NULL,
        fitness_goal TEXT NOT NULL DEFAULT 'Muscle Gain',
        target_calories INTEGER NOT NULL DEFAULT 2200,
        target_protein INTEGER NOT NULL DEFAULT 75,
        target_carbs INTEGER NOT NULL DEFAULT 250,
        target_fat INTEGER NOT NULL DEFAULT 65,
        is_setup_complete BOOLEAN NOT NULL DEFAULT 0
    );
    """)

    # Ensure schema migration for existing databases
    try:
        cursor.execute("ALTER TABLE user_profile ADD COLUMN is_setup_complete BOOLEAN NOT NULL DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        diet_type TEXT NOT NULL,
        cost_credits REAL NOT NULL,
        calories INTEGER NOT NULL,
        protein_g REAL NOT NULL,
        carbs_g REAL NOT NULL DEFAULT 30.0,
        fat_g REAL NOT NULL DEFAULT 10.0,
        is_available BOOLEAN NOT NULL DEFAULT 1,
        is_favourite BOOLEAN NOT NULL DEFAULT 0
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weekly_meal_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week TEXT NOT NULL,
        meal_period TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        FOREIGN KEY (item_id) REFERENCES menu_items(id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date TEXT NOT NULL,
        meal_period TEXT NOT NULL,
        item_details TEXT NOT NULL,
        total_credits REAL NOT NULL,
        total_calories INTEGER NOT NULL,
        total_protein REAL NOT NULL,
        total_carbs REAL DEFAULT 0.0,
        total_fat REAL DEFAULT 0.0,
        notes TEXT
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        description TEXT
    );
    """)

    cursor.execute("SELECT COUNT(*) FROM user_profile")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO user_profile (id, monthly_budget, current_balance, cycle_start_date, cycle_end_date, fitness_goal, target_calories, target_protein, target_carbs, target_fat, is_setup_complete)
            VALUES (1, 3000.0, 3000.0, ?, ?, 'Muscle Gain', 2200, 75, 250, 65, 0)
        """, (real_start, real_end))
        cursor.execute("""
            INSERT INTO credit_transactions (type, amount, balance_after, description)
            VALUES ('INITIAL_BUDGET', 3000.0, 3000.0, 'Initial monthly budget allocation')
        """)
    else:
        cursor.execute("UPDATE user_profile SET cycle_start_date = ?, cycle_end_date = ? WHERE id = 1", (real_start, real_end))

    cursor.execute("SELECT COUNT(*) FROM menu_items")
    if cursor.fetchone()[0] == 0:
        seed_items = [parse_catalog_tuple(item) for item in CATALOG_DATA]
        cursor.executemany("""
            INSERT INTO menu_items (name, category, diet_type, cost_credits, calories, protein_g, carbs_g, fat_g, is_available, is_favourite)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, seed_items)

    conn.commit()
    seed_historical_logs(conn)
    conn.close()

def reload_user_catalog():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM menu_items")
    seed_items = [parse_catalog_tuple(item) for item in CATALOG_DATA]
    cursor.executemany("""
        INSERT INTO menu_items (name, category, diet_type, cost_credits, calories, protein_g, carbs_g, fat_g, is_available, is_favourite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, seed_items)
    conn.commit()
    conn.close()

def reseed_everything():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()

if __name__ == "__main__":
    reseed_everything()
