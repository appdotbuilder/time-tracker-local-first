import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { User, Organization, Project, Customer, CreateProjectInput } from '../../../server/src/schema';

interface CreateProjectDialogProps {
  user: User;
  organization: Organization;
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: Project) => void;
}

export function CreateProjectDialog({ 
  user, 
  organization,
  customers, 
  open, 
  onOpenChange,
  onProjectCreated
}: CreateProjectDialogProps) {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: null,
    customer_id: '',
    organization_id: organization.id
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) return;
    
    setIsLoading(true);
    
    try {
      const projectData: CreateProjectInput = {
        name: formData.name,
        description: formData.description || null,
        customer_id: formData.customer_id,
        organization_id: organization.id
      };

      const result = await trpc.createProject.mutate({
        ...projectData,
        created_by: user.id
      });

      if (onProjectCreated) {
        onProjectCreated(result);
      }

      // Reset form
      setFormData({
        name: '',
        description: null,
        customer_id: '',
        organization_id: organization.id
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project 📁</DialogTitle>
          <DialogDescription>
            Add a new project to organize your work
          </DialogDescription>
        </DialogHeader>

        {customers.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              You need to create at least one customer before you can create projects.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateProjectInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select 
                value={formData.customer_id} 
                onValueChange={(value) => setFormData((prev: CreateProjectInput) => ({ 
                  ...prev, 
                  customer_id: value 
                }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the project (optional)"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateProjectInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.name.trim() || !formData.customer_id}
              >
                {isLoading ? 'Creating...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}