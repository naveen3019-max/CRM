import { pool } from "../config/db.js";

export async function getAdminMetrics() {
  const [[usersRow]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
  const [[leadRow]] = await pool.query("SELECT COUNT(*) AS totalLeads FROM leads");
  const [[projectRow]] = await pool.query(
    "SELECT COUNT(*) AS activeProjects FROM projects_orders WHERE status = 'active'"
  );
  const [[revenueRow]] = await pool.query(
    "SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM projects_orders WHERE status IN ('active', 'completed')"
  );

  return {
    totalUsers: usersRow.totalUsers,
    totalLeads: leadRow.totalLeads,
    activeProjects: projectRow.activeProjects,
    revenue: Number(revenueRow.revenue)
  };
}

export async function getSalesMetrics(salesUserId) {
  const [[assignedLeadRow]] = await pool.query(
    "SELECT COUNT(*) AS assignedLeads FROM leads WHERE assigned_sales_id = ?",
    [salesUserId]
  );
  const [[closedLeadRow]] = await pool.query(
    "SELECT COUNT(*) AS closedLeads FROM leads WHERE assigned_sales_id = ? AND status = 'closed'",
    [salesUserId]
  );

  const conversionRate =
    assignedLeadRow.assignedLeads > 0
      ? Math.round((closedLeadRow.closedLeads / assignedLeadRow.assignedLeads) * 100)
      : 0;

  return {
    assignedLeads: assignedLeadRow.assignedLeads,
    closedLeads: closedLeadRow.closedLeads,
    conversionRate
  };
}
