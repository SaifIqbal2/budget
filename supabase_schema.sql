-- ============================================
-- BUDGETPRO - SUPABASE SQL SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste & Run)
-- ============================================

-- 1. CATEGORIES TABLE
-- Stores expense categories (Food, Transport, Bills, etc.)
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EXPENSES TABLE
-- Stores all expense entries
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    employee_name TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. INCOMES TABLE
-- Stores all income entries
CREATE TABLE IF NOT EXISTS incomes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'other')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3.1 TASKS TABLE
-- Stores freelancer tasks and payment status
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_number TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    freelancer_name TEXT,
    amount DECIMAL(12,2) CHECK (amount >= 0),
    income_id UUID REFERENCES incomes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'received' CHECK (status IN ('received','in_progress','completed','payment_drafted','paid')),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','other')),
    date_received DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. BANK BALANCE TABLE
-- Stores opening bank balance for each month
CREATE TABLE IF NOT EXISTS bank_balance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(month, year, user_id)
);

-- 5. CASH WITHDRAWALS TABLE
-- Bank se cash nikalna (bank balance kam, cash balance zyada)
CREATE TABLE IF NOT EXISTS cash_withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. BANK DEPOSITS TABLE
-- Manually bank mein paisa add karna (income se alag)
-- Sirf bank balance aur total balance mein add hoga
CREATE TABLE IF NOT EXISTS bank_deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 7. CASH DEPOSITS TABLE
-- Manually cash add karna (income se alag)
-- Sirf cash balance aur total balance mein add hoga
CREATE TABLE IF NOT EXISTS cash_deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 8. CASH TO BANK TRANSFERS
-- Cash se bank mein transfer karna (Cash balance kam hoga, Bank balance zyada hoga)
CREATE TABLE IF NOT EXISTS cash_to_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Only authenticated admin can access data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_to_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Categories: Any authenticated user can read, only authenticated can insert/update/delete
CREATE POLICY "Authenticated users can read categories"
    ON categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
    ON categories FOR DELETE
    TO authenticated
    USING (true);

-- Expenses: Users can only access their own data
CREATE POLICY "Users can read own expenses"
    ON expenses FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
    ON expenses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
    ON expenses FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
    ON expenses FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Incomes: Users can only access their own data
CREATE POLICY "Users can read own incomes"
    ON incomes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incomes"
    ON incomes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incomes"
    ON incomes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own incomes"
    ON incomes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Bank Balance: Users can only access their own data
CREATE POLICY "Users can read own bank_balance"
    ON bank_balance FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank_balance"
    ON bank_balance FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank_balance"
    ON bank_balance FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank_balance"
    ON bank_balance FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Cash Withdrawals: Users can only access their own data
CREATE POLICY "Users can read own cash_withdrawals"
    ON cash_withdrawals FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash_withdrawals"
    ON cash_withdrawals FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cash_withdrawals"
    ON cash_withdrawals FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cash_withdrawals"
    ON cash_withdrawals FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Bank Deposits: Users can only access their own data
CREATE POLICY "Users can read own bank_deposits"
    ON bank_deposits FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank_deposits"
    ON bank_deposits FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank_deposits"
    ON bank_deposits FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank_deposits"
    ON bank_deposits FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Cash Deposits: Users can only access their own data
CREATE POLICY "Users can read own cash_deposits"
    ON cash_deposits FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash_deposits"
    ON cash_deposits FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cash_deposits"
    ON cash_deposits FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cash_deposits"
    ON cash_deposits FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Cash To Bank Transfers: Users can only access their own data
CREATE POLICY "Users can read own cash_to_bank"
    ON cash_to_bank FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash_to_bank"
    ON cash_to_bank FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cash_to_bank"
    ON cash_to_bank FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cash_to_bank"
    ON cash_to_bank FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Tasks: Users can only access their own data
CREATE POLICY "Users can read own tasks"
    ON tasks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
    ON tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON tasks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- DEFAULT CATEGORIES (INSERT AFTER RUNNING ABOVE)
-- ============================================
INSERT INTO categories (name, icon, color) VALUES
    ('Food & Dining', '🍔', '#f97316'),
    ('Transport', '🚗', '#3b82f6'),
    ('Bills & Utilities', '💡', '#eab308'),
    ('Shopping', '🛍️', '#ec4899'),
    ('Health', '🏥', '#10b981'),
    ('Education', '📚', '#8b5cf6'),
    ('Entertainment', '🎬', '#f43f5e'),
    ('Rent', '🏠', '#06b6d4'),
    ('Family', '👨‍👩‍👧‍👦', '#14b8a6'),
    ('Business', '💼', '#6366f1'),
    ('Employee Payment', '👷', '#f97316'),
    ('Savings', '🏦', '#22c55e'),
    ('Other', '📁', '#64748b')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date_received ON tasks(date_received);
CREATE INDEX IF NOT EXISTS idx_bank_balance_month_year ON bank_balance(month, year);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_date ON cash_withdrawals(date);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_user_id ON cash_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_date ON bank_deposits(date);
CREATE INDEX IF NOT EXISTS idx_bank_deposits_user_id ON bank_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_deposits_date ON cash_deposits(date);
CREATE INDEX IF NOT EXISTS idx_cash_deposits_user_id ON cash_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_to_bank_date ON cash_to_bank(date);
CREATE INDEX IF NOT EXISTS idx_cash_to_bank_user_id ON cash_to_bank(user_id);

-- ============================================
-- MIGRATIONS (run these in Supabase SQL Editor if you already have the `tasks` table)
-- 1) Create a sequence and numeric `task_number` column that auto-increments from 1
-- 2) Rename `freelancer_name` to `client_name` for clarity
-- Run the following statements (copy-paste and execute):

-- create sequence (if not exists)
-- CREATE SEQUENCE IF NOT EXISTS tasks_task_number_seq START 1;

-- add a numeric auto-increment column that uses the sequence for new rows
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_number_int BIGINT DEFAULT nextval('tasks_task_number_seq');

-- populate existing rows (optional)
-- UPDATE tasks SET task_number_int = nextval('tasks_task_number_seq') WHERE task_number_int IS NULL;

-- drop old text column and rename (optional)
-- ALTER TABLE tasks DROP COLUMN IF EXISTS task_number;
-- ALTER TABLE tasks RENAME COLUMN task_number_int TO task_number;

-- rename freelancer column to client_name
-- ALTER TABLE tasks RENAME COLUMN IF EXISTS freelancer_name TO client_name;

-- NOTE: If you prefer `GENERATED ALWAYS AS IDENTITY` instead of a manual sequence,
-- you can use: ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_number BIGINT GENERATED BY DEFAULT AS IDENTITY;


-- ============================================
-- DONE! 
-- Now go to Authentication → Users → Add User
-- to create your admin account
-- ============================================
