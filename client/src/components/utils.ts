/**
 * Format duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m", "45m", "0m")
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Parse duration string to minutes
 * Supports formats like "2h 30m", "2h", "30m", "150m", "2.5h"
 * @param durationStr - Duration string to parse
 * @returns Duration in minutes, or 0 if invalid
 */
export function parseDuration(durationStr: string): number {
  if (!durationStr.trim()) return 0;
  
  const str = durationStr.toLowerCase().trim();
  
  // Match patterns like "2h 30m", "2h", "30m"
  const hourMinuteMatch = str.match(/(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m)?/);
  if (hourMinuteMatch) {
    const hours = parseFloat(hourMinuteMatch[1] || '0');
    const minutes = parseFloat(hourMinuteMatch[2] || '0');
    return Math.round(hours * 60 + minutes);
  }
  
  // Try to parse as pure number (assume minutes)
  const numericMatch = str.match(/^(\d+(?:\.\d+)?)$/);
  if (numericMatch) {
    return Math.round(parseFloat(numericMatch[1]));
  }
  
  return 0;
}

/**
 * Format time for display in time input
 * @param date - Date object
 * @returns Formatted time string (HH:MM)
 */
export function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Create a date with today's date and specified time
 * @param timeStr - Time string in HH:MM format
 * @returns Date object with today's date and specified time
 */
export function createDateWithTime(timeStr: string): Date {
  const today = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
  return date;
}

/**
 * Calculate duration between two dates in minutes
 * @param startTime - Start date
 * @param endTime - End date
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return Math.round(diffMs / (1000 * 60));
}

/**
 * Get start of day for a date
 * @param date - Input date
 * @returns Date object set to start of day (00:00:00)
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get end of day for a date
 * @param date - Input date
 * @returns Date object set to end of day (23:59:59)
 */
export function getEndOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * Get start of week for a date (Monday)
 * @param date - Input date
 * @returns Date object set to start of week
 */
export function getStartOfWeek(date: Date): Date {
  const startOfDay = getStartOfDay(date);
  const dayOfWeek = startOfDay.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
  
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() + diff);
  return startOfWeek;
}

/**
 * Get start of month for a date
 * @param date - Input date
 * @returns Date object set to start of month
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}