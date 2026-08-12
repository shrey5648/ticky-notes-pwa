/**
 * Browser-side HTML sanitizer — zero external dependencies.
 * Uses the browser's DOMParser to parse HTML and removes dangerous elements/attributes.
 *
 * This prevents Stored XSS attacks from note content rendered via dangerouslySetInnerHTML.
 *
 * Allowed elements: standard text formatting, lists, links, tables, images, Tiptap editor elements.
 * Blocked: <script>, <iframe>, <object>, <embed>, <form>, event handlers (onclick, onerror, etc.)
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

// Allowed CSS properties for inline style attribute
const ALLOWED_CSS_PROPERTIES = new Set([
  'color', 'background-color', 'text-align', 'font-size', 'font-family', 
  'font-weight', 'font-style', 'text-decoration', 'border-radius', 
  'margin', 'padding', 'max-width', 'width', 'height', 'display', 
  'justify-content', 'align-items', 'gap', 'line-height', 'border', 
  'border-top', 'border-bottom', 'border-left', 'border-right'
]);

function sanitizeUrl(url: string): string | null {
  // Remove all control characters, whitespace, and tabs to prevent bypasses like "java\nscript:"
  const normalized = url.replace(/[\x00-\x20\s]/g, '');
  
  // Check if it's a safe data image URL
  const isDataImage = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,/i.test(normalized);
  
  // Check against dangerous protocols
  if (/^(javascript|vbscript|data:)/i.test(normalized) && !isDataImage) {
    return null;
  }
  
  return url;
}

function sanitizeStyle(styleString: string): string {
  const declarations = styleString.split(';');
  const cleanDeclarations: string[] = [];

  for (const decl of declarations) {
    const parts = decl.split(':');
    if (parts.length !== 2) continue;
    const prop = parts[0].trim().toLowerCase();
    const val = parts[1].trim();

    if (ALLOWED_CSS_PROPERTIES.has(prop)) {
      // Ensure the value doesn't contain javascript/expression or other malicious constructs
      const normalizedVal = val.replace(/[\x00-\x20\s]/g, '').toLowerCase();
      if (
        !normalizedVal.includes('javascript:') &&
        !normalizedVal.includes('expression(') &&
        !normalizedVal.includes('behavior:') &&
        !normalizedVal.includes('-moz-binding')
      ) {
        cleanDeclarations.push(`${prop}: ${val}`);
      }
    }
  }

  return cleanDeclarations.join('; ');
}

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
      const sanitizedUrl = sanitizeUrl(value);
      if (!sanitizedUrl) continue;
      value = sanitizedUrl;
    }

    // Sanitize style attribute — remove expressions and javascript URLs
    if (attrName === 'style') {
      value = sanitizeStyle(value);
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
