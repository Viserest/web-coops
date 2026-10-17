
--
-- address
--

CREATE TABLE IF NOT EXISTS addresses (
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	user_id BLOB NOT NULL REFERENCES users(id),
	street_number INT,
	code TEXT,
	street TEXT,
	city TEXT,
	state TEXT,
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

--
-- options
--

CREATE TABLE IF NOT EXISTS options (
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	which INT,
	-- Boolean (1)
	-- Repeating (2)
	question TEXT NOT NULL,
	price INT,
	repeat_min INT, -- repeating
	repeat_max INT, -- repeating
);

--
-- menu
--

CREATE TABLE IF NOT EXISTS categories (
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	name TEXT NOT NULL UNIQUE,
	position INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	menu_id BLOB NOT NULL REFERENCES menus(id),
	option_id BLOB REFERENCES item_options(id),
	-- details
	name TEXT NOT NULL,
	description TEXT,
	price INT NOT NULL
);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_menu_items_option ON menu_items(option_id);

--
-- order
--

CREATE TABLE IF NOT EXISTS order_items (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	order_id BLOB NOT NULL REFERENCES orders(id),
	menu_item_id BLOB NOT NULL REFERENCES menu_items(id),
	-- details
	unit_price INT NOT NULL,
	instructions TEXT,
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

CREATE TABLE IF NOT EXISTS orders (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	user_id BLOB NOT NULL REFERENCES users(id),
	-- details
	subtotal INT NOT NULL,
	tax INT NOT NULL,
	total INT NOT NULL,
);
CREATE INDEX idx_orders_user ON orders(user_id);
