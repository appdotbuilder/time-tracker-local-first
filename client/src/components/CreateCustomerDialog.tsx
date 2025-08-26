import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { User, Organization, Customer, CreateCustomerInput } from '../../../server/src/schema';

interface CreateCustomerDialogProps {
  user: User;
  organization: Organization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customer: Customer) => void;
}

export function CreateCustomerDialog({ 
  user, 
  organization, 
  open, 
  onOpenChange,
  onCustomerCreated
}: CreateCustomerDialogProps) {
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    email: null,
    phone: null,
    address: null,
    organization_id: organization.id
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const customerData: CreateCustomerInput = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        organization_id: organization.id
      };

      const result = await trpc.createCustomer.mutate({
        ...customerData,
        created_by: user.id
      });

      if (onCustomerCreated) {
        onCustomerCreated(result);
      }

      // Reset form
      setFormData({
        name: '',
        email: null,
        phone: null,
        address: null,
        organization_id: organization.id
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer 🏢</DialogTitle>
          <DialogDescription>
            Create a new customer to track time for
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateCustomerInput) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com (optional)"
              value={formData.email || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateCustomerInput) => ({ 
                  ...prev, 
                  email: e.target.value || null 
                }))
              }
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567 (optional)"
              value={formData.phone || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateCustomerInput) => ({ 
                  ...prev, 
                  phone: e.target.value || null 
                }))
              }
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Street address, city, state, zip (optional)"
              value={formData.address || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: CreateCustomerInput) => ({ 
                  ...prev, 
                  address: e.target.value || null 
                }))
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}