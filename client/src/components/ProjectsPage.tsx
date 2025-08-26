import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  FolderOpen, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  MoreHorizontal,
  Crown,
  Play,
  Pause
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { trpc } from '@/utils/trpc';
import { CreateProjectDialog } from './CreateProjectDialog';
import { EditProjectDialog } from './EditProjectDialog';
import type { User, Organization, Project, Customer, Subscription } from '../../../server/src/schema';

interface ProjectsPageProps {
  user: User;
  organization: Organization;
  subscription: Subscription | null;
}

export function ProjectsPage({ user, organization, subscription }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getProjects.query({
        organization_id: organization.id,
        ...(selectedCustomer !== 'all' && { customer_id: selectedCustomer })
      });
      setProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [organization.id, selectedCustomer]);

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

  useEffect(() => {
    loadProjects();
    loadCustomers();
  }, [loadProjects, loadCustomers]);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && project.is_active) ||
      (statusFilter === 'inactive' && !project.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    
    try {
      await trpc.deleteProject.mutate(deletingProjectId);
      setProjects((prev: Project[]) => prev.filter(project => project.id !== deletingProjectId));
      setDeletingProjectId(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleToggleStatus = async (project: Project) => {
    try {
      const updated = await trpc.updateProject.mutate({
        id: project.id,
        is_active: !project.is_active
      });
      setProjects((prev: Project[]) => 
        prev.map(p => p.id === project.id ? updated : p)
      );
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const canCreateMore = () => {
    if (!subscription) return false;
    return projects.length < subscription.max_projects;
  };

  const activeProjects = projects.filter(p => p.is_active).length;
  const inactiveProjects = projects.length - activeProjects;
  const isOwner = user.id === organization.owner_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <FolderOpen className="h-8 w-8 mr-3 text-green-600" />
            Projects 📁
          </h2>
          <p className="text-muted-foreground">
            Manage your customer projects and organize your work
          </p>
        </div>
        
        {isOwner && (
          <div className="flex items-center gap-4">
            {subscription && (
              <div className="text-sm text-muted-foreground">
                {projects.length} / {subscription.max_projects} projects used
              </div>
            )}
            <Button 
              onClick={() => setShowCreateProject(true)}
              disabled={!canCreateMore()}
              title={!canCreateMore() ? "Project limit reached. Upgrade your plan to add more." : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        )}
      </div>

      {/* Subscription Limit Warning */}
      {subscription && projects.length >= subscription.max_projects && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <Crown className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <p className="font-medium text-orange-800">Project limit reached</p>
                <p className="text-sm text-orange-600">
                  You've reached your limit of {subscription.max_projects} projects. 
                  Upgrade to add more projects.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Projects</CardTitle>
          <CardDescription>
            Search and filter your projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
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

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectItem value="active">Active projects</SelectItem>
                <SelectItem value="inactive">Inactive projects</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCustomer('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              {subscription ? `${subscription.max_projects - projects.length} remaining` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{inactiveProjects}</div>
            <p className="text-xs text-muted-foreground">
              Currently inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              With projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4 border-b">
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/8 animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {projects.length === 0 ? 'No projects yet' : 'No projects found'}
              </h3>
              <p className="mb-4">
                {projects.length === 0 
                  ? 'Create your first project to start organizing your work' 
                  : 'Try adjusting your search terms or filters'
                }
              </p>
              {projects.length === 0 && isOwner && canCreateMore() && customers.length > 0 && (
                <Button onClick={() => setShowCreateProject(true)}>
                  Create Your First Project
                </Button>
              )}
              {projects.length === 0 && customers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You need to create at least one customer first
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                      </TableCell>
                      <TableCell>
                        {getCustomerName(project.customer_id)}
                      </TableCell>
                      <TableCell>
                        {project.description ? (
                          <span className="text-sm">{project.description}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={project.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {project.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {project.created_at.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleStatus(project)}>
                                {project.is_active ? (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditingProject(project)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingProjectId(project.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
      <CreateProjectDialog
        user={user}
        organization={organization}
        customers={customers}
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={(project: Project) => {
          setProjects((prev: Project[]) => [project, ...prev]);
        }}
      />

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          customers={customers}
          open={true}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onProjectUpdated={(updatedProject: Project) => {
            setProjects((prev: Project[]) => 
              prev.map(project => project.id === updatedProject.id ? updatedProject : project)
            );
            setEditingProject(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingProjectId} onOpenChange={() => setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All time entries associated with this project will be updated to have no project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}