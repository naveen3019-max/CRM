-- Password for all seeded users: ChangeMe@123
-- bcrypt hash generated for demo environments only.
INSERT INTO users (name, email, password_hash, role) VALUES
('Platform Admin', 'admin@verbenatech.com', '$2a$10$Att9VtmygxIzzSxMalu/uOITRkS6qb9UD.KRhQXbm0Gq/w9X5zx/m', 'admin'),
('Sales One', 'sales1@verbenatech.com', '$2a$10$Att9VtmygxIzzSxMalu/uOITRkS6qb9UD.KRhQXbm0Gq/w9X5zx/m', 'sales'),
('Customer One', 'customer1@verbenatech.com', '$2a$10$Att9VtmygxIzzSxMalu/uOITRkS6qb9UD.KRhQXbm0Gq/w9X5zx/m', 'customer'),
('Vendor One', 'vendor1@verbenatech.com', '$2a$10$Att9VtmygxIzzSxMalu/uOITRkS6qb9UD.KRhQXbm0Gq/w9X5zx/m', 'vendor'),
('Electrician One', 'electrician1@verbenatech.com', '$2a$10$Att9VtmygxIzzSxMalu/uOITRkS6qb9UD.KRhQXbm0Gq/w9X5zx/m', 'electrician'),
('Field Work One', 'fieldwork1@verbenatech.com', '$2a$10$Att9VtmygxIzzSxMalu/uOITRkS6qb9UD.KRhQXbm0Gq/w9X5zx/m', 'field_work')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
password_hash = VALUES(password_hash),
role = VALUES(role);

INSERT INTO leads (customer_id, assigned_sales_id, status, source, title, budget, created_by)
SELECT c.id, s.id, 'new', 'website', 'Solar setup inquiry', 5000.00, a.id
FROM users c
INNER JOIN users s ON s.email = 'sales1@verbenatech.com'
INNER JOIN users a ON a.email = 'admin@verbenatech.com'
WHERE c.email = 'customer1@verbenatech.com'
	AND NOT EXISTS (
		SELECT 1 FROM leads l
		WHERE l.customer_id = c.id AND l.title = 'Solar setup inquiry'
	);

INSERT INTO projects_orders (lead_id, customer_id, vendor_id, status, total_amount)
SELECT l.id, c.id, v.id, 'active', 3500.00
FROM users c
INNER JOIN users v ON v.email = 'vendor1@verbenatech.com'
INNER JOIN leads l ON l.customer_id = c.id AND l.title = 'Solar setup inquiry'
WHERE c.email = 'customer1@verbenatech.com'
	AND NOT EXISTS (
		SELECT 1 FROM projects_orders p
		WHERE p.lead_id = l.id AND p.customer_id = c.id
	);

INSERT INTO tasks (title, description, lead_id, project_order_id, assigned_to, role_type, status, created_by)
SELECT 'Vendor material dispatch', 'Send installation kit to site', l.id, p.id, v.id, 'vendor', 'pending', a.id
FROM users v
INNER JOIN users a ON a.email = 'admin@verbenatech.com'
INNER JOIN users c ON c.email = 'customer1@verbenatech.com'
INNER JOIN leads l ON l.customer_id = c.id AND l.title = 'Solar setup inquiry'
INNER JOIN projects_orders p ON p.lead_id = l.id
WHERE v.email = 'vendor1@verbenatech.com'
	AND NOT EXISTS (
		SELECT 1 FROM tasks t
		WHERE t.title = 'Vendor material dispatch' AND t.assigned_to = v.id
	);

INSERT INTO tasks (title, description, lead_id, project_order_id, assigned_to, role_type, status, created_by)
SELECT 'Electrical installation', 'Complete panel wiring and testing', l.id, p.id, e.id, 'electrician', 'in_progress', a.id
FROM users e
INNER JOIN users a ON a.email = 'admin@verbenatech.com'
INNER JOIN users c ON c.email = 'customer1@verbenatech.com'
INNER JOIN leads l ON l.customer_id = c.id AND l.title = 'Solar setup inquiry'
INNER JOIN projects_orders p ON p.lead_id = l.id
WHERE e.email = 'electrician1@verbenatech.com'
	AND NOT EXISTS (
		SELECT 1 FROM tasks t
		WHERE t.title = 'Electrical installation' AND t.assigned_to = e.id
	);

INSERT INTO tasks (title, description, lead_id, project_order_id, assigned_to, role_type, status, created_by)
SELECT 'Field inspection report', 'Capture site readiness photos and final checklist', l.id, p.id, f.id, 'field_work', 'pending', a.id
FROM users f
INNER JOIN users a ON a.email = 'admin@verbenatech.com'
INNER JOIN users c ON c.email = 'customer1@verbenatech.com'
INNER JOIN leads l ON l.customer_id = c.id AND l.title = 'Solar setup inquiry'
INNER JOIN projects_orders p ON p.lead_id = l.id
WHERE f.email = 'fieldwork1@verbenatech.com'
	AND NOT EXISTS (
		SELECT 1 FROM tasks t
		WHERE t.title = 'Field inspection report' AND t.assigned_to = f.id
	);
