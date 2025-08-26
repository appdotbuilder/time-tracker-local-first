import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { formatTimeForInput, createDateWithTime } from './utils';
import type { TimeEntry, Customer, Project, UpdateTimeEntryInput } from '../../../server/src/schema';

interface EditTimeEntryDialogProps {
  entry: TimeEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryUpdated?: (entry: TimeEntry) => void;
}

export function EditTimeEntryDialog({ 
  entry, 
  open, 
  onOpenChange,
  onEntryUpdated
}: EditTimeEntryDialogProps) {
  const [formData, setFormData] = useState<UpdateTimeEntryInput>({
    id: entry.id,
    description: entry.description,
    start_time: entry.start_time,
    end_time: entry.end_time,
    customer_id: entry.customer_id,
    project_id: entry.project_id,
    tags: [...entry.tags]
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(entry.start_time);
  const [startTimeStr, setStartTimeStr] = useState(formatTimeForInput(entry.start_time));
  const [endTimeStr, setEndTimeStr] = useState(entry.end_time ? formatTimeForInput(entry.end_time) : '');
  const [currentTag, setCurrentTag] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      // We need organization_id for this query, but we don't have it in the component props
      // In a real app, this would be available through context or props
      const result = await trpc.getCustomers.query({
        organization_id: 'org-1' // Mock organization ID
      });
      setCustomers(result);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const result = await trpc.getProjects.query({
        organization_id: 'org-1', // Mock organization ID
        ...(formData.customer_id && { customer_id: formData.customer_id })
      });
      setProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (open) {
      // Reset form data when entry changes
      setFormData({
        id: entry.id,
        description: entry.description,
        start_time: entry.start_time,
        end_time: entry.end_time,
        customer_id: entry.customer_id,
        project_id: entry.project_id,
        tags: [...entry.tags]
      });
      setSelectedDate(entry.start_time);
      setStartTimeStr(formatTimeForInput(entry.start_time));
      setEndTimeStr(entry.end_time ? formatTimeForInput(entry.end_time) : '');
      setCurrentTag('');
      
      loadCustomers();
      loadProjects();
    }
  }, [open, entry, loadCustomers, loadProjects]);

  useEffect(() => {
    // Update projects when customer changes
    if (formData.customer_id) {
      loadProjects();
    }
  }, [formData.customer_id, loadProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Create start_time from selected date and time
      const startDateTime = createDateWithTime(startTimeStr);
      startDateTime.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      
      // Create end_time if provided
      let endDateTime: Date | null = null;
      if (endTimeStr) {
        endDateTime = createDateWithTime(endTimeStr);
        endDateTime.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      }

      const updateData: UpdateTimeEntryInput = {
        id: entry.id,
        description: formData.description,
        start_time: startDateTime,
        end_time: endDateTime,
        customer_id: formData.customer_id,
        project_id: formData.project_id,
        tags: formData.tags || []
      };

      const result = await trpc.updateTimeEntry.mutate(updateData);

      if (onEntryUpdated) {
        onEntryUpdated(result);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update time entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !(formData.tags || []).includes(currentTag.trim())) {
      setFormData((prev: UpdateTimeEntryInput) => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev: UpdateTimeEntryInput) => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Entry ✏️</DialogTitle>
          <DialogDescription>
            Update your time entry details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: UpdateTimeEntryInput) => ({ ...prev, description: e.target.value }))
              }
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate.toLocaleDateString()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTimeStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTimeStr(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTimeStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTimeStr(e.target.value)}
                placeholder="Leave empty for active timer"
              />
            </div>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select 
              value={formData.customer_id || ''} 
              onValueChange={(value) => setFormData((prev: UpdateTimeEntryInput) => ({ 
                ...prev, 
                customer_id: value || null,
                project_id: null // Reset project when customer changes
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select 
              value={formData.project_id || ''} 
              onValueChange={(value) => setFormData((prev: UpdateTimeEntryInput) => ({ 
                ...prev, 
                project_id: value || null 
              }))}
              disabled={!formData.customer_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  formData.customer_id 
                    ? "Select a project (optional)" 
                    : "Select a customer first"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Project</SelectItem>
                {projects
                  .filter(project => !formData.customer_id || project.customer_id === formData.customer_id)
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.tags || []).map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={currentTag}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTag(e.target.value)}
                onKeyPress={handleTagKeyPress}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}