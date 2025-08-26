import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import type { Project, Customer, UpdateProjectInput } from '../../../server/src/schema';

interface EditProjectDialogProps {
  project: Project;
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated?: (project: Project) => void;
}

export function EditProjectDialog({ 
  project,
  customers, 
  open, 
  onOpenChange,
  onProjectUpdated
}: EditProjectDialogProps) {
  const [formData, setFormData] = useState<UpdateProjectInput>({
    id: project.id,
    name: project.name,
    description: project.description,
    is_active: project.is_active
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form data when project changes
      setFormData({
        id: project.id,
        name: project.name,
        description: project.description,
        is_active: project.is_active
      });
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const updateData: UpdateProjectInput = {
        id: project.id,
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active
      };

      const result = await trpc.updateProject.mutate(updateData);

      if (onProjectUpdated) {
        onProjectUpdated(result);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project ✏️</DialogTitle>
          <DialogDescription>
            Update project information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              placeholder="Enter project name"
              value={formData.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: UpdateProjectInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* Customer (Read-only) */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <Input
              value={getCustomerName(project.customer_id)}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Customer cannot be changed after project creation
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the project (optional)"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: UpdateProjectInput) => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))
              }
              rows={3}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active || false}
              onCheckedChange={(checked) =>
                setFormData((prev: UpdateProjectInput) => ({ ...prev, is_active: checked }))
              }
            />
            <Label htmlFor="is_active">Project is active</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Inactive projects won't appear in time entry dropdowns
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name?.trim()}>
              {isLoading ? 'Updating...' : 'Update Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}