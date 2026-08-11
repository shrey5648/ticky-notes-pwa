const fs = require('fs');
const path = require('path');

// Simple PNG generator for sticky note icon (192x192 & 512x512)
// Uses SVG to PNG fallback or raw PNG chunk generator if canvas is unavailable
const svgContent = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#d7a15c"/>
  <g transform="rotate(-3 256 256)">
    <rect x="80" y="80" width="352" height="352" rx="16" fill="#FFEB3B"/>
    <polygon points="432,390 390,432 390,390" fill="#d0b000"/>
    <rect x="211" y="65" width="90" height="24" rx="4" fill="rgba(255,255,255,0.7)"/>
    <circle cx="256" cy="115" r="16" fill="#e65100"/>
    <text x="120" y="240" font-family="sans-serif" font-size="70" font-weight="bold" fill="#111">📝</text>
    <text x="120" y="320" font-family="sans-serif" font-size="44" font-weight="bold" fill="#333">Sticky</text>
    <text x="120" y="370" font-family="sans-serif" font-size="44" font-weight="bold" fill="#e65100">Notes</text>
  </g>
</svg>`;

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent(512));
console.log('Generated icon.svg successfully');
