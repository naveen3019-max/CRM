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

export async function getSystemHealth() {
  const [[pendingTasks]] = await pool.query("SELECT COUNT(*) AS count FROM tasks WHERE status = 'pending'");
  const [[activeUsers]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE is_active = 1");
  const [[pendingVendors]] = await pool.query("SELECT COUNT(*) AS count FROM companies WHERE status = 'pending'");
  return {
    pendingTasks: pendingTasks.count,
    activeUsers: activeUsers.count,
    pendingVendorVerifications: pendingVendors.count,
    systemStatus: "Healthy"
  };
}

export async function getVendorPerformance() {
  const [rows] = await pool.query(`
    SELECT 
      u.name, 
      COUNT(p.id) as jobsCompleted,
      COALESCE(AVG(DATEDIFF(p.end_date, p.start_date)), 0) as avgCompletionDays
    FROM users u
    JOIN projects_orders p ON u.id = p.vendor_id
    WHERE u.role = 'vendor' AND p.status = 'completed'
    GROUP BY u.id
    ORDER BY jobsCompleted DESC
    LIMIT 5
  `);
  return rows;
}

export async function getRecentActivity(limit = 10) {
  const [rows] = await pool.query(`
    SELECT a.*, u.name as actorName
    FROM activity_logs a
    JOIN users u ON a.actor_id = u.id
    ORDER BY a.created_at DESC
    LIMIT ?
  `, [limit]);
  return rows;
}
