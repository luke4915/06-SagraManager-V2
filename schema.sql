-- schema.sql: crea tabelle base per SagraManager V2 (Postgres)
-- Esegui con: psql -U your_user -d your_db -f schema.sql

BEGIN;

-- users table (password_hash can be NULL to force change-password flow)
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT, -- NULL => no password set yet
  role            TEXT NOT NULL DEFAULT 'operator', -- e.g. admin, cucina, operator
  theme           TEXT DEFAULT 'dark',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  category TEXT,
  color TEXT DEFAULT '#3b82f6',
  allergens TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  items JSONB NOT NULL, -- array of objects: { id, name, price, quantity, note }
  total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- sessions table (for "serata")
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
);

-- user_print_settings table (which copies to print and which printer)
CREATE TABLE IF NOT EXISTS user_print_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  copy_type TEXT NOT NULL, -- e.g. 'Cliente', 'Cucina', 'Ritiro Gastronomia'
  enabled BOOLEAN DEFAULT TRUE,
  printer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Seed: minimal admin user (password_hash = NULL forces change on first login)
INSERT INTO users (username, password_hash, role)
VALUES
  ('admin', NULL, 'admin')
ON CONFLICT (username) DO NOTHING;

-- Seed: example products
INSERT INTO products (name, price, category, color)
VALUES
  ('Pizza Margherita', 8.50, 'Pizze', '#f97316'),
  ('Birra 33cl', 3.50, 'Bevande', '#60a5fa'),
  ('Patatine Fritte', 4.00, 'Street Food', '#fca5a5')
ON CONFLICT DO NOTHING;

COMMIT;
