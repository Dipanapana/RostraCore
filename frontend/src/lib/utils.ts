/**
 * Safely extract an array from API response data.
 * Handles: raw arrays, wrapped objects ({data: []}, {records: []}, etc.), null/undefined.
 */
export function ensureArray<T = any>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of ['data', 'records', 'items', 'results', 'payroll_records', 'employees', 'clients', 'shifts']) {
      if (Array.isArray((data as any)[key])) return (data as any)[key];
    }
  }
  return [];
}
