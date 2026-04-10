import sanitizeHtml from 'sanitize-html';

/**
 * Strips all HTML tags and attributes from a string.
 * Use this as a class-transformer @Transform() function on any DTO field
 * that accepts user-authored text (bio, descriptions, comments, messages, etc.)
 * to prevent stored XSS.
 */
export function stripHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}
