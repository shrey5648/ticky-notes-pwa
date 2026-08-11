/**
 * Browser-side HTML sanitizer — zero external dependencies.
 * Uses the browser's DOMParser to parse HTML and removes dangerous elements/attributes.
 *
 * This prevents Stored XSS attacks from note content rendered via dangerouslySetInnerHTML.
 *
 * Allowed elements: standard text formatting, lists, links, tables, images, Tiptap editor elements.
 * Blocked: <script>, <iframe>, <object>, <embed>, <form>, event handlers (onclick, onerror, etc.)
 *
 * For stronger guarantees, upgrade to DOMPurify: `npm install dompurify`
 */

// Elements allowed in sanitized output
const ALLOWED_TAGS = new Set([
  // Block elements
  'p', 'div', 'span', 'br', 'hr',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Text formatting
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup', 'code', 'pre',
  // Lists
  'ul', 'ol', 'li',
  // Links and media
  'a', 'img',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Blockquote
  'blockquote',
  // Tiptap specific
  'label', 'input',
  // Details
  'details', 'summary',
]);

// Attributes allowed per element (plus a global set)
const GLOBAL_ALLOWED_ATTRS = new Set([
  'class', 'id', 'style', 'title', 'dir', 'lang',
  'data-type', 'data-checked', 'data-list-type',
]);

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  input: new Set(['type', 'checked', 'disabled']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  col: new Set(['span']),
  ol: new Set(['start', 'type']),
};

// Dangerous attribute name patterns (event handlers)
const DANGEROUS_ATTR_PATTERN = /^on/i;

// Dangerous URL schemes
const DANGEROUS_URL_PATTERN = /^\s*(javascript|vbscript|data\s*:(?!image\/(png|jpeg|gif|webp|svg\+xml)))/i;

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  // Remove disallowed tags entirely (including all children)
  if (!ALLOWED_TAGS.has(tagName)) {
    // For unknown but non-dangerous tags, keep text content
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < el.childNodes.length; i++) {
      const sanitized = sanitizeNode(el.childNodes[i]);
      if (sanitized) fragment.appendChild(sanitized);
    }
    return fragment;
  }

  // Create clean element
  const clean = document.createElement(tagName);

  // Copy allowed attributes
  const tagAttrs = TAG_ALLOWED_ATTRS[tagName];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    const attrName = attr.name.toLowerCase();

    // Skip event handlers
    if (DANGEROUS_ATTR_PATTERN.test(attrName)) continue;

    // Check if attribute is allowed
    if (!GLOBAL_ALLOWED_ATTRS.has(attrName) && !(tagAttrs && tagAttrs.has(attrName))) continue;

    let value = attr.value;

    // Sanitize URLs in href/src attributes
    if (attrName === 'href' || attrName === 'src') {
      if (DANGEROUS_URL_PATTERN.test(value)) continue;
    }

    // Sanitize style attribute — remove expressions and javascript URLs
    if (attrName === 'style') {
      value = value
        .replace(/expression\s*\(/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/url\s*\(\s*['"]?\s*javascript/gi, '');
    }

    clean.setAttribute(attrName, value);
  }

  // Force safe link attributes
  if (tagName === 'a') {
    clean.setAttribute('rel', 'noopener noreferrer');
  }

  // Only allow checkbox type for input
  if (tagName === 'input') {
    const inputType = el.getAttribute('type');
    if (inputType !== 'checkbox') return null;
    clean.setAttribute('type', 'checkbox');
    if (el.hasAttribute('checked')) clean.setAttribute('checked', '');
    clean.setAttribute('disabled', '');
  }

  // Recursively sanitize children
  for (let i = 0; i < el.childNodes.length; i++) {
    const sanitized = sanitizeNode(el.childNodes[i]);
    if (sanitized) clean.appendChild(sanitized);
  }

  return clean;
}

/**
 * Sanitize untrusted HTML string, removing dangerous elements and attributes.
 * Safe to use with `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  // Must be in browser context
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // SSR fallback: strip all tags as a safety measure
    return dirty.replace(/<[^>]*>/g, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${dirty}</body>`, 'text/html');
    const body = doc.body;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < body.childNodes.length; i++) {
      const sanitized = sanitizeNode(body.childNodes[i]);
      if (sanitized) fragment.appendChild(sanitized);
    }

    // Serialize back to HTML
    const temp = document.createElement('div');
    temp.appendChild(fragment);
    return temp.innerHTML;
  } catch (err) {
    console.error('[sanitizeHtml] Sanitization failed, stripping all tags:', err);
    return dirty.replace(/<[^>]*>/g, '');
  }
}
