import streamlit as st
import pandas as pd
import sqlite3
import datetime
import calendar
import json
import itertools
from db_setup import init_db, DB_PATH, CATALOG_DATA, HISTORICAL_LOGS, parse_catalog_tuple, reload_user_catalog, reseed_everything, get_current_cycle_dates

# ---------------------------------------------------------
# Page Configuration & Styling
# ---------------------------------------------------------
st.set_page_config(
    page_title="EatSmart — Mess Credit Tracker & Meal Suggestor",
    page_icon="🥗",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
    }
    
    .stApp {
        background-color: #0b0f19;
        color: #f1f5f9;
    }

    .onboarding-banner {
        background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
        border: 2px solid #6366f1;
        border-radius: 18px;
        padding: 28px;
        margin-bottom: 28px;
        box-shadow: 0 12px 40px rgba(99, 102, 241, 0.25);
    }

    .glass-card {
        background: rgba(26, 32, 48, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 16px;
    }
    .glass-card:hover {
        border-color: rgba(99, 102, 241, 0.4);
        transform: translateY(-3px);
        box-shadow: 0 12px 40px 0 rgba(99, 102, 241, 0.15);
    }
    
    .metric-label {
        font-size: 0.78rem;
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
    }
    .metric-value {
        font-size: 1.9rem;
        font-weight: 800;
        color: #ffffff;
        margin-top: 6px;
    }
    .metric-sub {
        font-size: 0.82rem;
        margin-top: 6px;
        font-weight: 500;
    }
    .sub-green { color: #10b981; }
    .sub-yellow { color: #f59e0b; }
    .sub-red { color: #ef4444; }
    .sub-blue { color: #3b82f6; }

    .badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .badge-veg { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-nonveg { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-egg { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-vegan { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }

    .hero-banner {
        background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
        border: 1px solid #312e81;
        border-left: 6px solid #6366f1;
        padding: 24px;
        border-radius: 16px;
        margin-bottom: 24px;
    }
    .hero-title {
        font-size: 2.1rem;
        font-weight: 800;
        background: linear-gradient(90deg, #818cf8 0%, #c084fc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0;
    }
    .hero-sub {
        font-size: 0.95rem;
        color: #cbd5e1;
        margin-top: 6px;
    }

    .tier-card {
        background: #1e293b;
        border-radius: 16px;
        padding: 22px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
</style>
""", unsafe_allow_html=True)

init_db()

# ---------------------------------------------------------
# Database Helpers
# ---------------------------------------------------------
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_user_profile():
    conn = get_db_connection()
    try:
        conn.cursor().execute("ALTER TABLE user_profile ADD COLUMN is_setup_complete BOOLEAN NOT NULL DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    profile = conn.cursor().execute("SELECT * FROM user_profile WHERE id = 1").fetchone()
    conn.close()
    if profile is None:
        init_db()
        conn = get_db_connection()
        profile = conn.cursor().execute("SELECT * FROM user_profile WHERE id = 1").fetchone()
        conn.close()
    return dict(profile)

def update_user_profile(monthly_budget, current_balance, start_date, end_date, fitness_goal, target_calories, target_protein, is_setup_complete=1, target_carbs=250, target_fat=65):
    conn = get_db_connection()
    try:
        conn.cursor().execute("ALTER TABLE user_profile ADD COLUMN is_setup_complete BOOLEAN NOT NULL DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    conn.cursor().execute("""
        UPDATE user_profile 
        SET monthly_budget = ?, current_balance = ?, cycle_start_date = ?, cycle_end_date = ?, fitness_goal = ?,
            target_calories = ?, target_protein = ?, is_setup_complete = ?, target_carbs = ?, target_fat = ?
        WHERE id = 1
    """, (monthly_budget, current_balance, start_date, end_date, fitness_goal, target_calories, target_protein, is_setup_complete, target_carbs, target_fat))
    conn.commit()
    conn.close()

def get_menu_items(only_available=False):
    conn = get_db_connection()
    query = "SELECT * FROM menu_items"
    if only_available:
        query += " WHERE is_available = 1"
    query += " ORDER BY is_favourite DESC, category, name"
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def toggle_favourite(item_id, current_fav):
    new_fav = 0 if current_fav == 1 else 1
    conn = get_db_connection()
    conn.cursor().execute("UPDATE menu_items SET is_favourite = ? WHERE id = ?", (new_fav, item_id))
    conn.commit()
    conn.close()

def toggle_item_availability(item_id, current_status):
    new_status = 0 if current_status == 1 else 1
    conn = get_db_connection()
    conn.cursor().execute("UPDATE menu_items SET is_available = ? WHERE id = ?", (new_status, item_id))
    conn.commit()
    conn.close()

def log_meal_token(date_str, meal_period, items_json, total_credits, total_calories, total_protein, total_carbs=0.0, total_fat=0.0, notes="Logged from Meal Suggestor"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO meal_logs (date, meal_period, item_details, total_credits, total_calories, total_protein, total_carbs, total_fat, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (date_str, meal_period, json.dumps(items_json), total_credits, total_calories, total_protein, total_carbs, total_fat, notes))
    log_id = cursor.lastrowid

    profile = cursor.execute("SELECT current_balance FROM user_profile WHERE id = 1").fetchone()
    new_balance = max(0.0, profile['current_balance'] - total_credits)
    
    cursor.execute("UPDATE user_profile SET current_balance = ? WHERE id = 1", (new_balance,))

    cursor.execute("""
        INSERT INTO credit_transactions (type, amount, balance_after, description)
        VALUES ('EXPENSE', ?, ?, ?)
    """, (total_credits, new_balance, f"Meal Expense #{log_id} ({meal_period})"))

    conn.commit()
    conn.close()
    return log_id, new_balance

def delete_meal_log(log_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    meal = cursor.execute("SELECT * FROM meal_logs WHERE id = ?", (log_id,)).fetchone()
    if meal:
        refund_amount = meal['total_credits']
        profile = cursor.execute("SELECT current_balance FROM user_profile WHERE id = 1").fetchone()
        new_balance = profile['current_balance'] + refund_amount
        
        cursor.execute("UPDATE user_profile SET current_balance = ? WHERE id = 1", (new_balance,))
        cursor.execute("""
            INSERT INTO credit_transactions (type, amount, balance_after, description)
            VALUES ('REFUND', ?, ?, ?)
        """, (refund_amount, new_balance, f"Reversal for deleted Meal Log #{log_id}"))
        
        cursor.execute("DELETE FROM meal_logs WHERE id = ?", (log_id,))
        conn.commit()
    conn.close()

def get_meal_logs(start_date=None, end_date=None):
    conn = get_db_connection()
    query = "SELECT * FROM meal_logs"
    params = []
    if start_date and end_date:
        query += " WHERE date >= ? AND date <= ?"
        params.extend([start_date, end_date])
    query += " ORDER BY logged_at DESC"
    df = pd.read_sql_query(query, conn, params=params)
    conn.close()
    return df

def get_credit_transactions(limit=100):
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT * FROM credit_transactions ORDER BY timestamp DESC LIMIT ?", conn, params=[limit])
    conn.close()
    return df

# ---------------------------------------------------------
# Real-Time Calculations Engine
# ---------------------------------------------------------
profile = get_user_profile()
today = datetime.date.today()

c_start = today.replace(day=1)
_, l_day = calendar.monthrange(today.year, today.month)
c_end = today.replace(day=l_day)

if profile['cycle_start_date'] != c_start.strftime("%Y-%m-%d") or profile['cycle_end_date'] != c_end.strftime("%Y-%m-%d"):
    update_user_profile(
        monthly_budget=profile['monthly_budget'],
        current_balance=profile['current_balance'],
        start_date=c_start.strftime("%Y-%m-%d"),
        end_date=c_end.strftime("%Y-%m-%d"),
        fitness_goal=profile.get('fitness_goal', 'Muscle Gain'),
        target_calories=profile['target_calories'],
        target_protein=profile['target_protein'],
        is_setup_complete=profile.get('is_setup_complete', 0)
    )
    profile = get_user_profile()

days_remaining = max(1, (c_end - today).days + 1)
days_elapsed = max(1, (today - c_start).days + 1)
total_cycle_days = max(1, (c_end - c_start).days + 1)

current_balance = float(profile['current_balance'])
monthly_budget = float(profile['monthly_budget'])

base_daily_allowance = monthly_budget / total_cycle_days
safe_daily_burn = current_balance / days_remaining
safe_weekly_limit = safe_daily_burn * 7.0
safe_biweekly_limit = safe_daily_burn * 14.0

cycle_logs = get_meal_logs(profile['cycle_start_date'], profile['cycle_end_date'])
total_cycle_spent = cycle_logs['total_credits'].sum() if not cycle_logs.empty else 0.0

actual_daily_spend = total_cycle_spent / days_elapsed
runway_days = (current_balance / actual_daily_spend) if actual_daily_spend > 0 else days_remaining

today_str = today.strftime("%Y-%m-%d")
today_logs = cycle_logs[cycle_logs['date'] == today_str] if not cycle_logs.empty else pd.DataFrame()
today_spent = today_logs['total_credits'].sum() if not today_logs.empty else 0.0
today_calories = today_logs['total_calories'].sum() if not today_logs.empty else 0
today_protein = today_logs['total_protein'].sum() if not today_logs.empty else 0.0

# Sidebar
with st.sidebar:
    st.markdown("<div style='font-size: 3.2rem; line-height: 1; margin-bottom: 6px;'>🥗</div>", unsafe_allow_html=True)
    st.title("EatSmart")
    st.caption("Hostel Mess Credit Tracker & Meal Suggestor")
    st.markdown("---")
    
    st.markdown(f"🗓️ **Active Cycle:** `{c_start.strftime('%b %d')}` to `{c_end.strftime('%b %d, %Y')}`")
    st.markdown(f"⏳ **Days Left in Month:** `{days_remaining} days`")
    
    st.markdown("---")
    st.metric("💳 Current Credit Balance", f"₹{current_balance:,.1f}")
    st.metric("🔥 Rebalanced Daily Limit", f"₹{safe_daily_burn:,.1f}/day")
    
    if safe_daily_burn >= base_daily_allowance:
        st.success(f"🟢 Status: Safe Velocity (+₹{(safe_daily_burn - base_daily_allowance):,.1f}/day)")
    else:
        st.error(f"🔴 Deficit: -₹{(base_daily_allowance - safe_daily_burn):,.1f}/day below allowance")

    st.markdown("---")
    if st.button("✏️ Edit Monthly Wallet Setup", use_container_width=True):
        st.session_state.show_onboarding = True
        st.rerun()

    if st.button("⚡ Reload Menu & Historical Logs", use_container_width=True):
        reseed_everything()
        st.success("Loaded menu catalog & meal logs!")
        st.rerun()

    st.caption("SRRC Hostel Edition • Built with Python & Streamlit")

# Hero Header
st.markdown("""
<div class="hero-banner">
    <h1 class="hero-title">🥗 EatSmart — Mess Credit Tracker & Meal Suggestor</h1>
    <div class="hero-sub">Select High, Medium, or Budget-Friendly meal options, compare basket values, and track your logged meals in real time.</div>
</div>
""", unsafe_allow_html=True)

# INITIAL ONBOARDING FORM
if profile.get('is_setup_complete', 0) == 0 or st.session_state.get('show_onboarding', False):
    st.markdown("""
    <div class="onboarding-banner">
        <h2 style="margin:0; color:#818cf8; font-weight:800;">🚀 Mess Wallet Credit Setup</h2>
        <div style="color:#cbd5e1; font-size:0.95rem; margin-top:6px;">Enter your monthly mess credit allocation and current credit balance to calculate your daily allowance and unlock high, medium & budget meal suggestions.</div>
    </div>
    """, unsafe_allow_html=True)

    with st.form("onboarding_setup_form"):
        o_c1, o_c2, o_c3 = st.columns(3)
        with o_c1:
            init_budget = st.number_input("One-Time Monthly Credit Allocation (₹)", min_value=100.0, max_value=100000.0, value=float(monthly_budget if monthly_budget > 0 else 8600.0), step=100.0)
        with o_c2:
            init_balance = st.number_input("Current Remaining Credit Balance (₹)", min_value=0.0, max_value=100000.0, value=float(current_balance if current_balance > 0 else 8600.0), step=50.0)
        with o_c3:
            init_goal = st.selectbox("Personal Goal Target", ["Muscle Gain", "Weight Loss / Cutting", "Budget Saver", "Balanced Maintenance"], index=["Muscle Gain", "Weight Loss / Cutting", "Budget Saver", "Balanced Maintenance"].index(profile.get('fitness_goal', 'Muscle Gain')))

        save_onboarding = st.form_submit_button("✅ Save Wallet Setup & Open Tracker", type="primary", use_container_width=True)
        if save_onboarding:
            update_user_profile(
                monthly_budget=init_budget,
                current_balance=init_balance,
                start_date=c_start.strftime("%Y-%m-%d"),
                end_date=c_end.strftime("%Y-%m-%d"),
                fitness_goal=init_goal,
                target_calories=profile['target_calories'],
                target_protein=profile['target_protein'],
                is_setup_complete=1
            )
            st.session_state.show_onboarding = False
            st.success("Wallet setup saved!")
            st.rerun()

    st.markdown("---")

# Main Navigation Tabs (Cleaned, Overspend removed, Tracked Logs enhanced)
tab_suggest, tab_wallet, tab_catalog, tab_history, tab_settings = st.tabs([
    "🍱 Meal Suggestor", 
    "💳 Wallet & Expense Limits", 
    "🍔 Menu Catalog",
    "📜 Tracked Meal Logs & Ledger", 
    "⚙️ Settings & Profile"
])

# ---------------------------------------------------------
# TAB 1: MEAL SUGGESTOR (HIGH, MEDIUM & BUDGET TIERS)
# ---------------------------------------------------------
with tab_suggest:
    st.subheader("🍱 Personalized Meal Suggestor")
    st.caption("Compare High, Medium, and Budget-Friendly meal options with complete basket values (total price, calories, protein) to easily decide what to eat.")

    s_col1, s_col2 = st.columns(2)
    with s_col1:
        s_period = st.selectbox("Select Meal Option", ["Breakfast / Tiffin", "Lunch", "Dinner", "Snacks & Drinks", "Full Day Combo"])
    with s_col2:
        s_diet = st.selectbox("Dietary Preference", ["Veg Only", "Non-Veg Allowed", "Egg Allowed", "Vegan Only"])

    suggest_default_budget = float(round(safe_daily_burn if s_period == "Full Day Combo" else safe_daily_burn / 2.5, 1))

    st.markdown("**🎯 Quick Budget Cap Toggle:**")
    budget_toggle = st.radio(
        "Select Budget Cap Range",
        [
            f"⚡ Auto-Daily Cap (₹{suggest_default_budget:.0f})",
            "🏷️ Under ₹30 (Ultra Saver)",
            "💰 Under ₹60 (Economy)",
            "💎 Under ₹120 (Standard)",
            "👑 Under ₹200 (Feast)",
            "⚙️ Custom Budget Cap"
        ],
        horizontal=True,
        label_visibility="collapsed",
        key="budget_range_toggle"
    )

    if "Under ₹30" in budget_toggle:
        target_meal_budget = 30.0
    elif "Under ₹60" in budget_toggle:
        target_meal_budget = 60.0
    elif "Under ₹120" in budget_toggle:
        target_meal_budget = 120.0
    elif "Under ₹200" in budget_toggle:
        target_meal_budget = 200.0
    elif "Auto-Daily Cap" in budget_toggle:
        target_meal_budget = max(10.0, suggest_default_budget)
    else:
        target_meal_budget = st.number_input("Custom Budget Cap per Meal (₹)", min_value=10.0, max_value=50000.0, value=max(10.0, suggest_default_budget), step=5.0)

    st.markdown("---")

    menu_df = get_menu_items(only_available=True)
    if s_diet == "Veg Only":
        menu_df = menu_df[menu_df['diet_type'].isin(["Veg", "Vegan"])]
    elif s_diet == "Vegan Only":
        menu_df = menu_df[menu_df['diet_type'] == "Vegan"]
    elif s_diet == "Egg Allowed":
        menu_df = menu_df[menu_df['diet_type'].isin(["Veg", "Vegan", "Egg"])]

    if s_period == "Breakfast / Tiffin":
        menu_df = menu_df[menu_df['category'].isin(["Tiffin", "Bread", "Egg", "Beverage", "Side"])]
    elif s_period == "Lunch":
        menu_df = menu_df[menu_df['category'].isin(["Staple", "Veg Gravy", "Non-Veg Gravy", "Biriyani", "Chinese", "Side", "Beverage"])]
    elif s_period == "Dinner":
        menu_df = menu_df[menu_df['category'].isin(["Bread", "Tandoor", "Veg Gravy", "Non-Veg Gravy", "Biriyani", "Chinese", "Beverage"])]
    elif s_period == "Snacks & Drinks":
        menu_df = menu_df[menu_df['category'].isin(["Fast Food", "Beverage", "Dessert", "Side"])]

    items_list = menu_df.to_dict('records')

    if not items_list:
        st.warning("No dishes available under selected filters. Try adjusting dietary preference or meal option.")
    else:
        valid_combos = []
        for r in range(1, 4):
            for combo in itertools.combinations(items_list, r):
                tot_cost = sum(x['cost_credits'] for x in combo)
                if tot_cost <= target_meal_budget:
                    tot_prot = sum(x['protein_g'] for x in combo)
                    tot_cal = sum(x['calories'] for x in combo)
                    prot_efficiency = tot_prot / tot_cost if tot_cost > 0 else 0
                    
                    valid_combos.append({
                        "items": combo,
                        "cost": tot_cost,
                        "protein": tot_prot,
                        "calories": tot_cal,
                        "efficiency": prot_efficiency
                    })

        if not valid_combos:
            st.info(f"No meal combinations found under ₹{target_meal_budget:.1f}. Try increasing the max budget cap.")
        else:
            # 1. High Option: Highest Protein / Premium Basket Value
            high_combo = max(valid_combos, key=lambda x: (x['protein'], x['cost']))
            
            # 2. Budget Friendly Option: Lowest Price / Maximum Savings
            budget_combo = min(valid_combos, key=lambda x: (x['cost'], -x['protein']))
            
            # 3. Medium / Balanced Option: Moderate Price & Balanced Macros
            med_candidates = [c for c in valid_combos if c != high_combo and c != budget_combo]
            if med_candidates:
                med_combo = max(med_candidates, key=lambda x: (x['efficiency'], x['protein']))
            else:
                med_combo = high_combo

            tiers = [
                ("💎 High-Value Option", high_combo, "#818cf8", "Max Protein & Premium Dishes", "High"),
                ("⚖️ Medium / Balanced Option", med_combo, "#f59e0b", "Optimal Price-to-Nutrition Balance", "Medium"),
                ("💰 Budget Friendly Option", budget_combo, "#10b981", "Lowest Price & Maximum Savings", "Budget")
            ]

            st.markdown(f"### Select Meal Tier for **{s_period}**")

            tier_cols = st.columns(3)
            for idx, (title, cb, color, desc, tier_type) in enumerate(tiers):
                with tier_cols[idx]:
                    with st.container(border=True):
                        st.markdown(f"<h3 style='margin:0; color:{color}; font-weight:800;'>{title}</h3>", unsafe_allow_html=True)
                        st.caption(desc)
                        st.markdown("---")
                        
                        st.markdown("**Items in this basket:**")
                        for item in cb['items']:
                            st.markdown(f"• **{item['name']}** — `₹{item['cost_credits']:.1f}`  \n  <span style='color:#94a3b8; font-size:0.82rem;'>🔥 {item['calories']} kcal | 💪 {item['protein_g']}g protein</span>", unsafe_allow_html=True)
                        
                        st.markdown("---")
                        
                        m_c1, m_c2 = st.columns(2)
                        with m_c1:
                            st.metric("🛒 Basket Total", f"₹{cb['cost']:.1f}")
                        with m_c2:
                            st.metric("💪 Total Protein", f"{cb['protein']:.1f} g")
                        
                        st.write(f"🔥 **Total Calories:** `{cb['calories']} kcal`")
                        
                        st.markdown("<br>", unsafe_allow_html=True)
                        if st.button(f"Track This Meal Expense ({tier_type} ₹{cb['cost']:.1f})", key=f"btn_tier_{idx}", type="primary", use_container_width=True):
                            cart_items = [{"name": i['name'], "qty": 1, "unit_price": i['cost_credits'], "subtotal": i['cost_credits']} for i in cb['items']]
                            log_meal_token(
                                date_str=today_str,
                                meal_period=s_period,
                                items_json=cart_items,
                                total_credits=cb['cost'],
                                total_calories=cb['calories'],
                                total_protein=cb['protein'],
                                notes=f"{tier_type} Option Suggestion"
                            )
                            st.success(f"Tracked ₹{cb['cost']:.1f} meal expense! Balance updated.")
                            st.rerun()

# ---------------------------------------------------------
# TAB 2: WALLET & MULTI-TIER EXPENSE PLAN LIMITS
# ---------------------------------------------------------
with tab_wallet:
    st.subheader("💳 Wallet Credit Input & Expense Limits Plan")
    st.caption("Input your monthly mess wallet credit balance to calculate automated expense limits (Daily, Weekly, Bi-weekly caps) and avoid miscalculations.")

    with st.expander("📝 Update Monthly Wallet Credit Balance", expanded=(current_balance == monthly_budget)):
        with st.form("wallet_input_form"):
            w_c1, w_c2, w_c3 = st.columns(3)
            with w_c1:
                new_wallet_budget = st.number_input("Monthly Credit Allocation (₹)", min_value=100.0, max_value=100000.0, value=float(monthly_budget), step=100.0)
            with w_c2:
                new_wallet_current = st.number_input("Current Remaining Credit Balance (₹)", min_value=0.0, max_value=100000.0, value=float(current_balance), step=50.0)
            with w_c3:
                w_goal = st.selectbox("Personal Goal Target", ["Muscle Gain", "Weight Loss / Cutting", "Budget Saver", "Balanced Maintenance"], index=["Muscle Gain", "Weight Loss / Cutting", "Budget Saver", "Balanced Maintenance"].index(profile.get('fitness_goal', 'Muscle Gain')))
            
            save_wallet = st.form_submit_button("Update Wallet & Recalculate Limits", type="primary", use_container_width=True)
            if save_wallet:
                update_user_profile(
                    monthly_budget=new_wallet_budget,
                    current_balance=new_wallet_current,
                    start_date=profile['cycle_start_date'],
                    end_date=profile['cycle_end_date'],
                    fitness_goal=w_goal,
                    target_calories=profile['target_calories'],
                    target_protein=profile['target_protein'],
                    is_setup_complete=1
                )
                st.success("Wallet credit balance updated! All expense limits recalculated.")
                st.rerun()

    st.markdown("---")
    st.markdown("### 📌 Structured Expense Limits (To Avoid Miscalculations)")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class="glass-card">
            <div class="metric-label">Current Credit Balance</div>
            <div class="metric-value">₹{current_balance:,.1f}</div>
            <div class="metric-sub sub-green">Allocated: ₹{monthly_budget:,.1f}</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="glass-card">
            <div class="metric-label">📌 Daily Expense Limit</div>
            <div class="metric-value">₹{safe_daily_burn:,.1f}</div>
            <div class="metric-sub sub-blue">Per day cap</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="glass-card">
            <div class="metric-label">📌 Weekly Expense Limit</div>
            <div class="metric-value">₹{safe_weekly_limit:,.1f}</div>
            <div class="metric-sub sub-yellow">7-Day allowance</div>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown(f"""
        <div class="glass-card">
            <div class="metric-label">📌 Bi-Weekly Limit</div>
            <div class="metric-value">₹{safe_biweekly_limit:,.1f}</div>
            <div class="metric-sub sub-green">14-Day allowance</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 🎛️ Interactive Credit Burn Rate Simulator")
    sim_col1, sim_col2 = st.columns([1.2, 1.0])
    with sim_col1:
        sim_max_val = max(500.0, float(round(max(safe_daily_burn, actual_daily_spend) * 1.5, 1)))
        sim_init_val = min(sim_max_val, float(round(actual_daily_spend if (actual_daily_spend > 0 and actual_daily_spend <= sim_max_val) else min(sim_max_val, safe_daily_burn), 1)))
        
        sim_daily_spend = st.slider(
            "Proposed Daily Spend (₹ / day)",
            min_value=10.0,
            max_value=sim_max_val,
            value=sim_init_val,
            step=5.0
        )
        sim_total_future_spend = sim_daily_spend * days_remaining
        sim_projected_end_bal = current_balance - sim_total_future_spend
        
        if sim_daily_spend > 0:
            sim_days_last = current_balance / sim_daily_spend
            sim_depletion_date = today + datetime.timedelta(days=int(sim_days_last))
        else:
            sim_depletion_date = c_end

    with sim_col2:
        if sim_projected_end_bal >= 0:
            st.success(f"""
            #### 🟢 Projected End Balance: **+₹{sim_projected_end_bal:,.1f} SURPLUS**
            - **Estimated Spend for remaining {days_remaining} days:** ₹{sim_total_future_spend:,.1f}
            - **Credits will last until:** `{sim_depletion_date.strftime('%d %b %Y')}` (Full cycle covered!)
            """)
        else:
            st.error(f"""
            #### 🔴 Projected End Balance: **-₹{abs(sim_projected_end_bal):,.1f} DEFICIT**
            - **Estimated Spend for remaining {days_remaining} days:** ₹{sim_total_future_spend:,.1f}
            - **Credits will run out early on:** `{sim_depletion_date.strftime('%d %b %Y')}` ({int(current_balance/sim_daily_spend)} days from now)
            """)

# ---------------------------------------------------------
# TAB 3: MENU CATALOG & PREFERENCES
# ---------------------------------------------------------
with tab_catalog:
    st.subheader("🍔 Menu Catalog & Customization Preferences")

    catalog_df = get_menu_items(only_available=False)
    col_cat1, col_cat2 = st.columns([2, 1])

    with col_cat1:
        st.markdown("### Existing Menu Items")
        all_cats = list(catalog_df['category'].unique())
        cat_filter = st.multiselect("Filter Category", options=all_cats, default=all_cats, key="cat_multiselect")
        
        filtered_catalog = catalog_df[catalog_df['category'].isin(cat_filter)]
        st.dataframe(
            filtered_catalog[['id', 'name', 'category', 'diet_type', 'cost_credits', 'calories', 'protein_g', 'is_favourite', 'is_available']],
            column_config={
                "id": "ID",
                "name": "Dish Name",
                "category": "Category",
                "diet_type": "Diet",
                "cost_credits": st.column_config.NumberColumn("Cost (₹)", format="₹%.1f"),
                "calories": "Calories",
                "protein_g": st.column_config.NumberColumn("Protein (g)", format="%.1fg"),
                "is_favourite": st.column_config.CheckboxColumn("❤️ Fav?"),
                "is_available": st.column_config.CheckboxColumn("Available?")
            },
            use_container_width=True,
            hide_index=True
        )

        st.markdown("#### Custom Preferences & Availability")
        toggle_c1, toggle_c2, toggle_c3 = st.columns([2, 1, 1])
        with toggle_c1:
            item_to_toggle = st.selectbox("Select Item", options=catalog_df['id'].tolist(), format_func=lambda x: f"{x}: {catalog_df[catalog_df['id'] == x]['name'].values[0]}", key="toggle_select")
        with toggle_c2:
            st.markdown("<br>", unsafe_allow_html=True)
            if st.button("❤️ Toggle Fav", key="toggle_fav_btn"):
                cur_fav = catalog_df[catalog_df['id'] == item_to_toggle]['is_favourite'].values[0]
                toggle_favourite(item_to_toggle, cur_fav)
                st.rerun()
        with toggle_c3:
            st.markdown("<br>", unsafe_allow_html=True)
            if st.button("Toggle Status", key="toggle_btn"):
                cur_status = catalog_df[catalog_df['id'] == item_to_toggle]['is_available'].values[0]
                toggle_item_availability(item_to_toggle, cur_status)
                st.rerun()

    with col_cat2:
        st.markdown("### ➕ Add Custom Item")
        with st.form("add_item_form"):
            new_name = st.text_input("Dish Name")
            new_cat = st.text_input("Category", value="Tiffin")
            new_diet = st.selectbox("Diet Type", ["Veg", "Non-Veg", "Egg", "Vegan"])
            new_cost = st.number_input("Cost (Credits/₹)", min_value=1.0, value=45.0, step=1.0)
            new_cal = st.number_input("Calories (kcal)", min_value=0, value=300, step=10)
            new_prot = st.number_input("Protein (g)", min_value=0.0, value=10.0, step=0.5)
            
            submitted = st.form_submit_button("Save Custom Item", type="primary", use_container_width=True)
            if submitted:
                if not new_name.strip():
                    st.error("Name required.")
                else:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    cursor.execute("INSERT INTO menu_items (name, category, diet_type, cost_credits, calories, protein_g, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)",
                                   (new_name.strip(), new_cat.strip(), new_diet, new_cost, new_cal, new_prot))
                    conn.commit()
                    conn.close()
                    st.success(f"Added {new_name}!")
                    st.rerun()

# ---------------------------------------------------------
# TAB 4: TRACKED MEAL LOGS & CREDIT LEDGER
# ---------------------------------------------------------
with tab_history:
    st.subheader("📜 Tracked Meal Expense Logs & Credit Ledger")
    st.caption("Review all meals tracked directly from your meal suggestions, monitor total credits deducted, and manage your ledger.")

    subtab1, subtab2 = st.tabs(["🍽️ Tracked Meals History", "💳 Credit Transaction Audit Ledger"])

    with subtab1:
        hist_df = get_meal_logs()
        if hist_df.empty:
            st.info("No meal expenses logged yet. Go to the Meal Suggestor tab and click 'Track This Meal Expense' to start tracking!")
        else:
            # Summary Metrics for Tracked Meals
            m_c1, m_c2, m_c3, m_c4 = st.columns(4)
            with m_c1:
                st.metric("Total Meals Tracked", f"{len(hist_df)} meals")
            with m_c2:
                st.metric("Total Credits Spent", f"₹{hist_df['total_credits'].sum():,.1f}")
            with m_c3:
                st.metric("Total Calories Tracked", f"{hist_df['total_calories'].sum():,} kcal")
            with m_c4:
                st.metric("Total Protein Tracked", f"{hist_df['total_protein'].sum():,.1f} g")

            st.markdown("---")

            # Clean Display DataFrame
            display_logs = []
            for _, r in hist_df.iterrows():
                try:
                    details = json.loads(r['item_details'])
                    items_str = ", ".join([f"{i['name']} (x{i.get('qty', 1)})" for i in details])
                except Exception:
                    items_str = r['item_details']
                    
                display_logs.append({
                    "Log #": r['id'],
                    "Logged Time": r['logged_at'],
                    "Date": r['date'],
                    "Meal Period": r['meal_period'],
                    "Items Tracked": items_str,
                    "Credits Deducted (₹)": f"₹{r['total_credits']:.1f}",
                    "Calories": f"{r['total_calories']} kcal",
                    "Protein": f"{r['total_protein']:.1f} g",
                    "Source / Notes": r['notes']
                })

            st.dataframe(pd.DataFrame(display_logs), use_container_width=True, hide_index=True)

            st.markdown("#### 🔄 Cancel / Reverse Tracked Meal Expense")
            del_c1, del_c2 = st.columns([2, 1])
            with del_c1:
                log_to_delete = st.selectbox("Select Log ID to Reverse", options=hist_df['id'].tolist(), key="del_log_select")
            with del_c2:
                st.markdown("<br>", unsafe_allow_html=True)
                if st.button("Reverse Selected Expense", type="primary", key="del_log_btn"):
                    delete_meal_log(log_to_delete)
                    st.success(f"Log #{log_to_delete} reversed and credits restored to wallet!")
                    st.rerun()

    with subtab2:
        tx_df = get_credit_transactions(100)
        if tx_df.empty:
            st.info("No transactions recorded yet.")
        else:
            st.dataframe(
                tx_df[['id', 'timestamp', 'type', 'amount', 'balance_after', 'description']],
                column_config={
                    "id": "Tx ID",
                    "timestamp": "Timestamp",
                    "type": "Type",
                    "amount": st.column_config.NumberColumn("Amount (₹)", format="₹%.1f"),
                    "balance_after": st.column_config.NumberColumn("Balance After (₹)", format="₹%.1f"),
                    "description": "Description"
                },
                use_container_width=True,
                hide_index=True
            )

# ---------------------------------------------------------
# TAB 5: SETTINGS & WALLET PROFILE
# ---------------------------------------------------------
with tab_settings:
    st.subheader("⚙️ User Profile, Goal & Budget Settings")

    col_set1, col_set2 = st.columns(2)
    with col_set1:
        st.markdown("### Update Monthly Wallet Budget & Goal")
        with st.form("settings_form"):
            s_budget = st.number_input("Monthly Wallet Budget (Credits/₹)", min_value=100.0, max_value=100000.0, value=float(profile['monthly_budget']), step=100.0)
            s_balance = st.number_input("Current Balance (Credits/₹)", min_value=0.0, max_value=100000.0, value=float(profile['current_balance']), step=50.0)
            
            s_start = st.date_input("Cycle Start Date", datetime.datetime.strptime(profile['cycle_start_date'], "%Y-%m-%d").date())
            s_end = st.date_input("Cycle End Date", datetime.datetime.strptime(profile['cycle_end_date'], "%Y-%m-%d").date())
            
            s_goal = st.selectbox("Personal Goal Target", ["Muscle Gain", "Weight Loss / Cutting", "Budget Saver", "Balanced Maintenance"], index=["Muscle Gain", "Weight Loss / Cutting", "Budget Saver", "Balanced Maintenance"].index(profile.get('fitness_goal', 'Muscle Gain')))
            s_cal = st.number_input("Target Daily Calories (kcal)", min_value=1000, max_value=5000, value=int(profile['target_calories']), step=50)
            s_prot = st.number_input("Target Daily Protein (g)", min_value=30.0, max_value=250.0, value=float(profile['target_protein']), step=5.0)

            save_settings = st.form_submit_button("Save Profile Settings", type="primary", use_container_width=True)
            if save_settings:
                update_user_profile(
                    monthly_budget=s_budget,
                    current_balance=s_balance,
                    start_date=s_start.strftime("%Y-%m-%d"),
                    end_date=s_end.strftime("%Y-%m-%d"),
                    fitness_goal=s_goal,
                    target_calories=s_cal,
                    target_protein=s_prot,
                    is_setup_complete=1
                )
                st.success("Settings updated!")
                st.rerun()

    with col_set2:
        st.markdown("### 📋 Monthly Wallet Summary")
        st.info("As per your strict budget rule, wallet credit allocation is entered **once per month** to avoid miscalculations.")
        st.write(f"- **Allocated Monthly Credit:** ₹{monthly_budget:,.1f}")
        st.write(f"- **Current Balance Remaining:** ₹{current_balance:,.1f}")
        st.write(f"- **Total Spent So Far:** ₹{(monthly_budget - current_balance):,.1f}")

        st.markdown("---")
        st.markdown("### 🔄 Reset & Load Official Student Logs")
        if st.button("Reload Official Menu & Historical Meal Logs", type="secondary", key="reset_db_btn"):
            reseed_everything()
            st.success("Database re-seeded!")
            st.rerun()
