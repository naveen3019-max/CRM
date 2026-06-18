import { pool } from "../config/db.js";

export async function getAdminMetrics() {
  const { rows: usersRow } = await pool.query('SELECT COUNT(*) AS "totalUsers" FROM users');
  const { rows: leadRow } = await pool.query('SELECT COUNT(*) AS "totalLeads" FROM leads');
  const { rows: projectRow } = await pool.query(
    "SELECT COUNT(*) AS \"activeProjects\" FROM projects_orders WHERE status = 'active'"
  );
  const { rows: revenueRow } = await pool.query(
    "SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM projects_orders WHERE status IN ('active', 'completed')"
  );

  return {
    totalUsers: Number(usersRow[0].totalUsers),
    totalLeads: Number(leadRow[0].totalLeads),
    activeProjects: Number(projectRow[0].activeProjects),
    revenue: Number(revenueRow[0].revenue)
  };
}

export async function getSalesMetrics(salesUserId) {
  const { rows: assignedLeadRow } = await pool.query(
    'SELECT COUNT(*) AS "assignedLeads" FROM leads WHERE assigned_sales_id = $1',
    [salesUserId]
  );
  const { rows: closedLeadRow } = await pool.query(
    "SELECT COUNT(*) AS \"closedLeads\" FROM leads WHERE assigned_sales_id = $1 AND status = 'closed'",
    [salesUserId]
  );

  const assigned = Number(assignedLeadRow[0].assignedLeads);
  const closed = Number(closedLeadRow[0].closedLeads);

  const conversionRate =
    assigned > 0
      ? Math.round((closed / assigned) * 100)
      : 0;

  return {
    assignedLeads: assigned,
    closedLeads: closed,
    conversionRate
  };
}

export async function getSystemHealth() {
  const { rows: pendingTasks } = await pool.query("SELECT COUNT(*) AS count FROM tasks WHERE status = 'pending'");
  const { rows: activeUsers } = await pool.query("SELECT COUNT(*) AS count FROM users WHERE is_active = true");
  const { rows: pendingVendors } = await pool.query("SELECT COUNT(*) AS count FROM companies WHERE status = 'pending'");
  
  return {
    pendingTasks: Number(pendingTasks[0].count),
    activeUsers: Number(activeUsers[0].count),
    pendingVendorVerifications: Number(pendingVendors[0].count),
    systemStatus: "Healthy"
  };
}

export async function getVendorPerformance() {
  // DATEDIFF in Postgres requires subtraction or EXTRACT(EPOCH)
  const { rows } = await pool.query(`
    SELECT 
      u.name, 
      COUNT(p.id) as "jobsCompleted",
      COALESCE(AVG(EXTRACT(EPOCH FROM (p.end_date - p.start_date))/86400), 0) as "avgCompletionDays"
    FROM users u
    JOIN projects_orders p ON u.id = p.vendor_id
    WHERE u.role = 'vendor' AND p.status = 'completed'
    GROUP BY u.id
    ORDER BY "jobsCompleted" DESC
    LIMIT 5
  `);
  return rows;
}

export async function getRecentActivity(limit = 10) {
  const { rows } = await pool.query(`
    SELECT a.*, u.name as "actorName"
    FROM activity_logs a
    JOIN users u ON a.actor_id = u.id
    ORDER BY a.created_at DESC
    LIMIT $1
  `, [limit]);
  return rows;
}
