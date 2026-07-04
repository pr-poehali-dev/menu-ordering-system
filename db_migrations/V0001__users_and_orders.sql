CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'client',
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(12) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    place_id VARCHAR(60) NOT NULL,
    place_name VARCHAR(120) NOT NULL,
    items JSONB NOT NULL,
    total INTEGER NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

INSERT INTO users (name, phone, password_hash, role)
VALUES ('НИКИТОВСКИЙ', 'НИКИТОВСКИЙ', 'admin_seed', 'admin')
ON CONFLICT (phone) DO NOTHING;