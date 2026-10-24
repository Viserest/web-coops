-- Custom SQL migration file, put your code below! --

--
-- create lunch, dinner, and special menus
--

BEGIN;
CREATE TEMP TABLE lunch_parent_id (id BLOB);
CREATE TEMP TABLE dinner_parent_id (id BLOB);
CREATE TEMP TABLE specials_parent_id (id BLOB);

INSERT INTO lunch_parent_id VALUES (randomblob(16));
INSERT INTO dinner_parent_id VALUES (randomblob(16));
INSERT INTO specials_parent_id VALUES (randomblob(16));

INSERT INTO `categories` (`id`, `name`, `position`)
	SELECT id, 'Lunch', 0 FROM lunch_parent_id
	UNION ALL
	SELECT id, 'Dinner', 1 FROM dinner_parent_id
	UNION ALL
	SELECT id, 'Specials', 2 FROM specials_parent_id;

--
-- create pizza menu
--

CREATE TEMP TABLE pizza_parent_id (id BLOB);
INSERT INTO pizza_parent_id VALUES (randomblob(16));

-- create pizza menu with lunch menu parent
INSERT INTO `categories` (`id`, `parent_id`, `name`, `position`)
	SELECT self.id, parent.id, 'Pizza', 0 FROM lunch_parent_id

-- create menu items with pizza menu parent
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `description`, `price`)
	SELECT (randomblob(16)), id, '', '', 0 FROM pizza_parent_id
	UNION ALL
	SELECT (randomblob(16)), id, '', '', 0 FROM pizza_parent_id;

DROP TABLE pizza_parent_id;

--
-- create speciality pizza menu
--

--
-- create pizza & salad menu
--

--
-- create calzone menu
--

--
-- create sandwich menu
--

--
-- create pasta menu
--

--
-- create salad menu
--

--
-- create side menu
--

--
-- create kids menu
--

DROP TABLE lunch_parent_id;
DROP TABLE dinner_parent_id;
DROP TABLE specials_parent_id;
COMMIT;
