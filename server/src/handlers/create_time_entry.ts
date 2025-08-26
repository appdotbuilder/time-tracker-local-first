import { type CreateTimeEntryInput, type TimeEntry } from '../schema';

export async function createTimeEntry(input: CreateTimeEntryInput, userId: string): Promise<TimeEntry> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new time entry for a user.
    // Should calculate duration if end_time is provided.
    const durationMinutes = input.end_time 
        ? Math.floor((input.end_time.getTime() - input.start_time.getTime()) / (1000 * 60))
        : null;
    
    return {
        id: 'time-entry-placeholder-id',
        user_id: userId,
        customer_id: input.customer_id || null,
        project_id: input.project_id || null,
        description: input.description,
        start_time: input.start_time,
        end_time: input.end_time || null,
        duration_minutes: durationMinutes,
        tags: input.tags || [],
        created_at: new Date(),
        updated_at: new Date()
    } as TimeEntry;
}