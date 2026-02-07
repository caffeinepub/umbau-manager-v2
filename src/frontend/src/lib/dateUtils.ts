/**
 * Date utility functions for the Umbau Manager application
 */

/**
 * Checks if a given date (as bigint timestamp) falls within the current calendar week
 * Week starts on Monday (German standard)
 */
export function isThisWeek(timestamp: bigint): boolean {
  const date = new Date(Number(timestamp) / 1000000);
  const today = new Date();
  
  // Get Monday of current week
  const currentMonday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, Monday is 1
  currentMonday.setDate(today.getDate() + diff);
  currentMonday.setHours(0, 0, 0, 0);
  
  // Get Sunday of current week
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);
  currentSunday.setHours(23, 59, 59, 999);
  
  return date >= currentMonday && date <= currentSunday;
}

/**
 * Gets the start and end dates of the current week (Monday to Sunday)
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  
  // Get Monday of current week
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  // Get Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: monday, end: sunday };
}

/**
 * Formats a bigint timestamp to German date format
 */
export function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

/**
 * Formats a bigint timestamp to German date and time format
 */
export function formatDateTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toLocaleString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Converts a Date object to bigint timestamp (nanoseconds)
 */
export function dateToBigInt(date: Date): bigint {
  return BigInt(date.getTime() * 1000000);
}

/**
 * Converts a bigint timestamp to Date object
 */
export function bigIntToDate(timestamp: bigint): Date {
  return new Date(Number(timestamp) / 1000000);
}
