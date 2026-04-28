/**
 * Format a Date object to UTC yyyyMMdd string
 * @param date - Date to format
 * @returns String in yyyyMMdd format
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format a Date object to yyyy/MM/dd string
 * @param date - Date to format
 * @returns String in yyyy/MM/dd format
 */
export function formatDateToPath(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}
