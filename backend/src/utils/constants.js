export const ROLES = Object.freeze({
  ADMIN: "admin",
  SALES: "sales",
  CUSTOMER: "customer",
  VENDOR: "vendor",
  ELECTRICIAN: "electrician",
  FIELD_WORK: "field_work"
});

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
  ADMIN_FIELD_WORK: "admin_field_work"
});
