-- Extend conversation scopes so sales can coordinate directly with field workers.
ALTER TABLE conversations
  MODIFY COLUMN scope ENUM(
    'sales_customer',
    'admin_sales',
    'admin_vendor',
    'admin_electrician',
    'admin_customer',
    'admin_field_work',
    'sales_field_work',
    'sales_vendor',
    'vendor_electrician',
    'vendor_customer',
    'vendor_field_work',
    'customer_electrician',
    'sales_electrician'
  ) NOT NULL;