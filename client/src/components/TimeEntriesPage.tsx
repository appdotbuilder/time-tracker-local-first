import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Clock, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Play, 
  Square, 
  Edit, 
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { trpc } from '@/utils/trpc';
import { formatDuration, getStartOfDay, getEndOfDay } from './utils';
import { CreateTimeEntryDialog } from './CreateTimeEntryDialog';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import type { User, Organization, TimeEntry, Customer, Project } from '../../../server/src/schema';

interface TimeEntriesPageProps {
  user: User;
  organization: Organization;
}

export function TimeEntriesPage({ user, organization }: TimeEntriesPageProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const loadTimeEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = {
        user_id: user.id,
        ...(selectedCustomer !== 'all' && { customer_id: selectedCustomer }),
        ...(selectedProject !== 'all' && { project_id: selectedProject }),
        ...(dateRange.from && { start_date: getStartOfDay(dateRange.from) }),
        ...(dateRange.to && { end_date: getEndOfDay(dateRange.to) })
      };
      
      const result = await trpc.getTimeEntries.query(filters);
      setTimeEntries(result);
    } catch (error) {
      console.error('Failed to load time entries:', error);
      setTimeEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, selectedCustomer, selectedProject, dateRange]);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await trpc.getCustomers.query({
        organization_id: organization.id
      });
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  }, [organization.id]);

  const loadProjects = useCallback(async () => {
    try {
      const result = await trpc.getProjects.query({
        organization_id: organization.id
      });
      setProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  }, [organization.id]);

  useEffect(() => {
    loadTimeEntries();
    loadCustomers();
    loadProjects();
  }, [loadTimeEntries, loadCustomers, loadProjects]);

  const filteredEntries = timeEntries.filter(entry => 
    entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    
    try {
      await trpc.deleteTimeEntry.mutate(entryId);
      setTimeEntries((prev: TimeEntry[]) => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error('Failed to delete time entry:', error);
    }
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'No Customer';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const totalTime = filteredEntries.reduce((acc, entry) => 
    acc + (entry.duration_minutes || 0), 0
  );

  const activeEntries = filteredEntries.filter(entry => !entry.end_time);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Time Entries ⏱️</h2>
          <p className="text-muted-foreground">
            Track and manage your time entries
          </p>
        </div>
        <Button onClick={() => setShowCreateEntry(true)}>
          <Clock className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalTime)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEntries.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter your time entries by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search descriptions or tags..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Customer Filter */}
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project Filter */}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    ) : (
                      dateRange.from.toLocaleDateString()
                    )
                  ) : (
                    'Pick date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear Filters */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCustomer('all');
                setSelectedProject('all');
                setDateRange({});
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>
            {filteredEntries.length} entries found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4 border-b">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/8 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No time entries found</h3>
              <p className="mb-4">Start tracking your time to see entries here</p>
              <Button onClick={() => setShowCreateEntry(true)}>
                Create Your First Entry
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.description}
                      </TableCell>
                      <TableCell>{getCustomerName(entry.customer_id)}</TableCell>
                      <TableCell>{getProjectName(entry.project_id)}</TableCell>
                      <TableCell>
                        {entry.start_time.toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {entry.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {entry.end_time && 
                            ` - ${entry.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        {entry.duration_minutes ? formatDuration(entry.duration_minutes) : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.end_time ? (
                          <Badge variant="secondary">Completed</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            <Play className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{entry.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateTimeEntryDialog
        user={user}
        organization={organization}
        open={showCreateEntry}
        onOpenChange={setShowCreateEntry}
        onEntryCreated={(entry: TimeEntry) => {
          setTimeEntries((prev: TimeEntry[]) => [entry, ...prev]);
        }}
      />

      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={true}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onEntryUpdated={(updatedEntry: TimeEntry) => {
            setTimeEntries((prev: TimeEntry[]) => 
              prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
            );
            setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}