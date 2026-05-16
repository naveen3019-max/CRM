export const ROLES = Object.freeze({
  ADMIN: "admin",
  SALES: "sales",
  CUSTOMER: "customer",
  VENDOR: "vendor",
  ELECTRICIAN: "electrician",
  FIELD_WORK: "field_work",
  SERVICE_PROFESSIONAL: "service_professional"
});

export const SERVICE_CATEGORIES = Object.freeze([
  "electrician",
  "plumber",
  "internet_installation",
  "cctv_technician",
  "ac_service",
  "carpenter",
  "painter",
  "appliance_repair",
  "general_technician"
]);

export const LANGUAGE_CODES = Object.freeze(["en", "hi", "kn", "te", "ta", "ml"]);

export const LEAD_STATUS = Object.freeze({
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  CLOSED: "closed"
});

export const TASK_STATUS = Object.freeze({
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed"
});

export const PROJECT_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
});

export const MESSAGE_SCOPE = Object.freeze({
  SALES_CUSTOMER: "sales_customer",
  ADMIN_SALES: "admin_sales",
  ADMIN_VENDOR: "admin_vendor",
  ADMIN_ELECTRICIAN: "admin_electrician",
  ADMIN_CUSTOMER: "admin_customer",
  ADMIN_FIELD_WORK: "admin_field_work",
  SALES_FIELD_WORK: "sales_field_work",
  SALES_VENDOR: "sales_vendor",
  VENDOR_ELECTRICIAN: "vendor_electrician",
  VENDOR_CUSTOMER: "vendor_customer",
  VENDOR_FIELD_WORK: "vendor_field_work",
  CUSTOMER_ELECTRICIAN: "customer_electrician",
  SALES_ELECTRICIAN: "sales_electrician"
  ,
  ADMIN_SERVICE_PROFESSIONAL: "admin_service_professional",
  SALES_SERVICE_PROFESSIONAL: "sales_service_professional",
  VENDOR_SERVICE_PROFESSIONAL: "vendor_service_professional"
});
