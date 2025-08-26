import { db } from '../db';
import { timeEntriesTable, customersTable, projectsTable } from '../db/schema';
import { type TimeEntry } from '../schema';
import { eq, and, gte, lte, desc, isNotNull, sum, count, sql } from 'drizzle-orm';

export interface DashboardStats {
  totalTimeToday: number; // minutes
  totalTimeThisWeek: number; // minutes
  totalTimeThisMonth: number; // minutes
  totalCustomers: number;
  totalProjects: number;
  recentEntries: TimeEntry[];
  topCustomersByTime: Array<{ customer_id: string; customer_name: string; total_minutes: number }>;
  topProjectsByTime: Array<{ project_id: string; project_name: string; total_minutes: number }>;
}

export async function getDashboardStats(userId: string, organizationId: string): Promise<DashboardStats> {
  try {
    // Get date boundaries for time calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate total time for today
    const todayTimeResult = await db.select({
      totalMinutes: sum(timeEntriesTable.duration_minutes)
    })
    .from(timeEntriesTable)
    .where(and(
      eq(timeEntriesTable.user_id, userId),
      gte(timeEntriesTable.start_time, startOfToday),
      lte(timeEntriesTable.start_time, now),
      isNotNull(timeEntriesTable.duration_minutes)
    ))
    .execute();

    const totalTimeToday = todayTimeResult[0]?.totalMinutes ? parseInt(todayTimeResult[0].totalMinutes) : 0;

    // Calculate total time for this week
    const weekTimeResult = await db.select({
      totalMinutes: sum(timeEntriesTable.duration_minutes)
    })
    .from(timeEntriesTable)
    .where(and(
      eq(timeEntriesTable.user_id, userId),
      gte(timeEntriesTable.start_time, startOfWeek),
      lte(timeEntriesTable.start_time, now),
      isNotNull(timeEntriesTable.duration_minutes)
    ))
    .execute();

    const totalTimeThisWeek = weekTimeResult[0]?.totalMinutes ? parseInt(weekTimeResult[0].totalMinutes) : 0;

    // Calculate total time for this month
    const monthTimeResult = await db.select({
      totalMinutes: sum(timeEntriesTable.duration_minutes)
    })
    .from(timeEntriesTable)
    .where(and(
      eq(timeEntriesTable.user_id, userId),
      gte(timeEntriesTable.start_time, startOfMonth),
      lte(timeEntriesTable.start_time, now),
      isNotNull(timeEntriesTable.duration_minutes)
    ))
    .execute();

    const totalTimeThisMonth = monthTimeResult[0]?.totalMinutes ? parseInt(monthTimeResult[0].totalMinutes) : 0;

    // Count total customers for the organization
    const customerCountResult = await db.select({
      count: count()
    })
    .from(customersTable)
    .where(eq(customersTable.organization_id, organizationId))
    .execute();

    const totalCustomers = customerCountResult[0]?.count || 0;

    // Count total projects for the organization
    const projectCountResult = await db.select({
      count: count()
    })
    .from(projectsTable)
    .where(eq(projectsTable.organization_id, organizationId))
    .execute();

    const totalProjects = projectCountResult[0]?.count || 0;

    // Get recent time entries (last 10)
    const recentEntriesResult = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.user_id, userId))
      .orderBy(desc(timeEntriesTable.start_time))
      .limit(10)
      .execute();

    const recentEntries: TimeEntry[] = recentEntriesResult.map(entry => ({
      ...entry,
      tags: entry.tags || []
    }));

    // Get top customers by time (this month)
    const topCustomersResult = await db.select({
      customer_id: timeEntriesTable.customer_id,
      customer_name: customersTable.name,
      total_minutes: sum(timeEntriesTable.duration_minutes)
    })
    .from(timeEntriesTable)
    .innerJoin(customersTable, eq(timeEntriesTable.customer_id, customersTable.id))
    .where(and(
      eq(timeEntriesTable.user_id, userId),
      eq(customersTable.organization_id, organizationId),
      gte(timeEntriesTable.start_time, startOfMonth),
      lte(timeEntriesTable.start_time, now),
      isNotNull(timeEntriesTable.duration_minutes),
      isNotNull(timeEntriesTable.customer_id)
    ))
    .groupBy(timeEntriesTable.customer_id, customersTable.name)
    .orderBy(desc(sql`sum(${timeEntriesTable.duration_minutes})`))
    .limit(5)
    .execute();

    const topCustomersByTime = topCustomersResult.map(result => ({
      customer_id: result.customer_id!,
      customer_name: result.customer_name,
      total_minutes: result.total_minutes ? parseInt(result.total_minutes) : 0
    }));

    // Get top projects by time (this month)
    const topProjectsResult = await db.select({
      project_id: timeEntriesTable.project_id,
      project_name: projectsTable.name,
      total_minutes: sum(timeEntriesTable.duration_minutes)
    })
    .from(timeEntriesTable)
    .innerJoin(projectsTable, eq(timeEntriesTable.project_id, projectsTable.id))
    .where(and(
      eq(timeEntriesTable.user_id, userId),
      eq(projectsTable.organization_id, organizationId),
      gte(timeEntriesTable.start_time, startOfMonth),
      lte(timeEntriesTable.start_time, now),
      isNotNull(timeEntriesTable.duration_minutes),
      isNotNull(timeEntriesTable.project_id)
    ))
    .groupBy(timeEntriesTable.project_id, projectsTable.name)
    .orderBy(desc(sql`sum(${timeEntriesTable.duration_minutes})`))
    .limit(5)
    .execute();

    const topProjectsByTime = topProjectsResult.map(result => ({
      project_id: result.project_id!,
      project_name: result.project_name,
      total_minutes: result.total_minutes ? parseInt(result.total_minutes) : 0
    }));

    return {
      totalTimeToday,
      totalTimeThisWeek,
      totalTimeThisMonth,
      totalCustomers,
      totalProjects,
      recentEntries,
      topCustomersByTime,
      topProjectsByTime
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
}