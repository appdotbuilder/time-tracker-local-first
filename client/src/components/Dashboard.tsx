import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, FolderOpen, TrendingUp, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { formatDuration } from './utils';
import type { User, Organization } from '../../../server/src/schema';
import type { DashboardStats } from '../../../server/src/handlers/get_dashboard_stats';

interface DashboardProps {
  user: User;
  organization: Organization;
}

export function Dashboard({ user, organization }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getDashboardStats.query({
        user_id: user.id,
        organization_id: organization.id
      });
      setStats(result);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Fallback to empty stats for demo
      setStats({
        totalTimeToday: 0,
        totalTimeThisWeek: 0,
        totalTimeThisMonth: 0,
        totalCustomers: 0,
        totalProjects: 0,
        recentEntries: [],
        topCustomersByTime: [],
        topProjectsByTime: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [user.id, organization.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user.name}! 👋</h2>
        <p className="text-blue-100">
          Here's your time tracking overview for today and this week.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats?.totalTimeToday || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Time tracked today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats?.totalTimeThisWeek || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Weekly total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Top Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Entries
            </CardTitle>
            <CardDescription>
              Your latest time tracking entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentEntries && stats.recentEntries.length > 0 ? (
              <div className="space-y-3">
                {stats.recentEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.description}</p>
                      <p className="text-xs text-gray-500">
                        {entry.start_time.toLocaleDateString()}
                      </p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{entry.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      {entry.duration_minutes ? formatDuration(entry.duration_minutes) : 'Active'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No time entries yet</p>
                <p className="text-sm">Start tracking your time to see recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers by Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Top Customers
            </CardTitle>
            <CardDescription>
              Customers by total time this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topCustomersByTime && stats.topCustomersByTime.length > 0 ? (
              <div className="space-y-3">
                {stats.topCustomersByTime.slice(0, 5).map((customer, index) => (
                  <div key={customer.customer_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.customer_name}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatDuration(customer.total_minutes)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customer data yet</p>
                <p className="text-sm">Create customers and track time to see statistics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview */}
      <Card>
        <CardHeader>
          <CardTitle>This Month's Overview</CardTitle>
          <CardDescription>
            Total time tracked: {formatDuration(stats?.totalTimeThisMonth || 0)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Projects */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <FolderOpen className="h-4 w-4 mr-2" />
                Top Projects
              </h4>
              {stats?.topProjectsByTime && stats.topProjectsByTime.length > 0 ? (
                <div className="space-y-2">
                  {stats.topProjectsByTime.slice(0, 3).map((project, index) => (
                    <div key={project.project_id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{project.project_name}</span>
                      <span className="font-medium ml-2">
                        {formatDuration(project.total_minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No project data available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}