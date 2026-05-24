/**
 * Ported from OmniaStores inventory parity.yaml
 */

const COLOR_SUFFIX_RE = /\s+(white|red|pink|gold|green|blue|silver|purple|yellow|rose gold|multicolor|moonstone|ruby|emerald|sapphire)$/i;
const TITLE_SPLIT_RE = /\s+[-–—]\s+/;

/**
 * Unescapes basic HTML entities.
 */
function htmlUnescape(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Cleans and normalizes product titles for matching across stores.
 */
export function cleanMasterTitle(title: string | null | undefined): string | null {
  if (!title) return null;

  let value = htmlUnescape(title).toLowerCase().replace(/\xa0/g, ' ').trim();
  
  // Normalize common terms
  value = value.replace(/&/g, ' and ');
  value = value.replace(/\b92\.5\b/g, '925');
  
  // Remove brand prefix
  value = value.replace(/^omnia\s+/, '');
  
  // Split by separators and take the first part
  value = value.split(TITLE_SPLIT_RE)[0];
  
  // Remove color suffixes
  value = value.replace(COLOR_SUFFIX_RE, '').trim();
  
  // Collapse whitespace
  value = value.replace(/\s+/g, ' ');
  
  return value;
}

/**
 * Returns the first value from a CSV string or the first element of an array.
 */
export function firstCsvValue(value: string | string[] | null | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.length > 0 ? value[0].trim() : null;
  return value.split(',')[0].trim() || null;
}

/**
 * Generates and triggers a CSV download from an array of objects.
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}