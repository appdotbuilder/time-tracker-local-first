import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, FolderOpen, Plus, Timer, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { Dashboard } from '@/components/Dashboard';
import { TimeEntriesPage } from '@/components/TimeEntriesPage';
import { CustomersPage } from '@/components/CustomersPage';
import { ProjectsPage } from '@/components/ProjectsPage';
import { CreateTimeEntryDialog } from '@/components/CreateTimeEntryDialog';
import type { User, Organization, Subscription } from '../../server/src/schema';

function App() {
  // Mock user data - in real app this would come from auth
  const [user] = useState<User>({
    id: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    created_at: new Date(),
    updated_at: new Date()
  });

  const [organization] = useState<Organization>({
    id: 'org-1',
    name: 'My Company',
    owner_id: 'user-1',
    created_at: new Date(),
    updated_at: new Date()
  });

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const loadSubscription = useCallback(async () => {
    try {
      // In a real app, this would fetch the user's subscription
      const mockSubscription: Subscription = {
        id: 'sub-1',
        user_id: user.id,
        plan: 'free',
        status: 'active',
        max_customers: 3,
        max_projects: 3,
        created_at: new Date(),
        updated_at: new Date(),
        expires_at: null
      };
      setSubscription(mockSubscription);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  }, [user.id]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const formatPlanName = (plan: string) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">TimeTracker</h1>
                <p className="text-sm text-gray-500">{organization.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {subscription && (
                <Badge className={getPlanColor(subscription.plan)}>
                  {formatPlanName(subscription.plan)} Plan
                </Badge>
              )}
              <Button 
                onClick={() => setShowCreateEntry(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
              <div className="text-sm text-gray-600">
                Welcome, {user.name}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex items-center space-x-2">
              <Timer className="h-4 w-4" />
              <span>Time Entries</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Customers</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>Projects</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard user={user} organization={organization} />
          </TabsContent>

          <TabsContent value="entries">
            <TimeEntriesPage user={user} organization={organization} />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersPage 
              user={user} 
              organization={organization} 
              subscription={subscription}
            />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsPage 
              user={user} 
              organization={organization} 
              subscription={subscription}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Time Entry Dialog */}
      <CreateTimeEntryDialog
        user={user}
        organization={organization}
        open={showCreateEntry}
        onOpenChange={setShowCreateEntry}
      />
    </div>
  );
}

export default App;