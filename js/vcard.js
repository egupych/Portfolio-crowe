/**
 * Generates standard vCard (version 3.0) string for an employee.
 * Compatible with iOS Contacts, Android Google Contacts, macOS, and Outlook.
 *
 * @param {object} employee - Localized employee object.
 * @param {string} [origin] - Optional base URL.
 * @returns {string} Formatted vCard 3.0 text.
 */
export function generateVCard(employee, origin) {
  const baseOrigin =
    origin ||
    (typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://portfoliocrowe.vercel.app');
  const name = (employee.name || '').trim();
  const parts = name.split(/\s+/);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  const profileUrl = `${baseOrigin.replace(/\/$/, '')}/team/${employee.id}`;

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${name}`,
    `N;CHARSET=UTF-8:${lastName};${firstName};;;`,
    'ORG;CHARSET=UTF-8:Crowe Uzbekistan',
    `TITLE;CHARSET=UTF-8:${employee.role || ''}`,
    `URL;WORK;CHARSET=UTF-8:${profileUrl}`,
  ];

  if (employee.tags && employee.tags.length) {
    lines.push(`NOTE;CHARSET=UTF-8:${employee.tags.slice(0, 5).join(', ')}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}
