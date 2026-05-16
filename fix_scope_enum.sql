USE verbena_crm;
ALTER TABLE conversations MODIFY COLUMN scope ENUM('sales_customer','admin_sales','admin_vendor','admin_electrician','admin_field_work','admin_customer','sales_vendor','vendor_electrician','vendor_customer','vendor_field_work','customer_electrician','sales_electrician') NOT NULL;
