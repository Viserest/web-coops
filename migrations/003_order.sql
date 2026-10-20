
--
-- addresses
--

CREATE TABLE IF NOT EXISTS addresses (
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	user_id BLOB NOT NULL REFERENCES users(id),
	street_number INT NOT NULL,
	code TEXT,
	street TEXT NOT NULL,
	city TEXT NOT NULL,
	state TEXT NOT NULL
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

--
-- options
--

CREATE TABLE IF NOT EXISTS menu_options (
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	which INT NOT NULL,
	-- Boolean (1)
	-- Repeating (2)
	question TEXT NOT NULL,
	price INT,
	repeat_min INT, -- repeating
	repeat_max INT -- repeating
);

--
-- menu categories (includes highest level root-menus which don't have a parent, like lunch, dinner, specials)
--

CREATE TABLE IF NOT EXISTS categories (
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	parent_id BLOB REFERENCES categories(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	position INT NOT NULL DEFAULT 0,
	CHECK (parent_id IS NULL OR parent_id <> id) -- no self-parent
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- every (category, ancestor) pair, including the category itself at distance 0

CREATE VIEW category_ancestors AS
WITH RECURSIVE up(category_id, ancestor_id, distance) AS (
	SELECT id, id, 0 FROM categories
	UNION ALL
	SELECT u.category_id, c.parent_id, u.distance + 1
	FROM up u JOIN categories c ON c.id = u.ancestor_id
	WHERE c.parent_id IS NOT NULL
)
SELECT category_id, ancestor_id, distance FROM up;

-- blocks re-parenting a category under itself or one of its descendants

CREATE TRIGGER categories_no_cycle
BEFORE UPDATE OF parent_id ON categories
WHEN NEW.parent_id IS NOT NULL
BEGIN
	SELECT RAISE(ABORT, 'category cannot be moved under itself or its descendants')
	WHERE EXISTS (
		SELECT 1 FROM category_ancestors
	    WHERE category_id = NEW.parent_id AND ancestor_id = NEW.id
	);
END;

--
-- menu items
--

CREATE TABLE IF NOT EXISTS menu_items (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	category_id BLOB NOT NULL REFERENCES categories(id),
	option_id BLOB REFERENCES menu_options(id),
	-- details
	name TEXT NOT NULL,
	description TEXT,
	price INT NOT NULL
);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_option ON menu_items(option_id);

--
-- order items
--

CREATE TABLE IF NOT EXISTS order_items (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	order_id BLOB NOT NULL REFERENCES orders(id),
	menu_item_id BLOB NOT NULL REFERENCES menu_items(id),
	-- details
	quantity INT NOT NULL,
	unit_price INT NOT NULL,
	instructions TEXT
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

--
-- order
--

CREATE TABLE IF NOT EXISTS orders (
	-- ids
	id BLOB PRIMARY KEY CHECK (length(id) = 16),
	user_id BLOB NOT NULL REFERENCES users(id),
	-- details
	subtotal INT NOT NULL,
	tax INT NOT NULL,
	total INT NOT NULL
);
CREATE INDEX idx_orders_user ON orders(user_id);
