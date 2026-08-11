import { Note } from './types';

// Helper to strip HTML tags for clean plain text export
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .trim();
};

// Helper to trigger file download
const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 1. Export to JSON Backup
export function exportBoardToJSON(notes: Note[], boardName: string = 'Sticky Notes') {
  const payload = {
    exported_at: new Date().toISOString(),
    board_name: boardName,
    notes_count: notes.length,
    notes: notes,
  };
  const filename = `${boardName.toLowerCase().replace(/\s+/g, '-')}-backup-${Date.now()}.json`;
  downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json');
}

// 2. Export to Markdown
export function exportBoardToMarkdown(notes: Note[], boardName: string = 'Sticky Notes') {
  let md = `# 📝 ${boardName}\n`;
  md += `*Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n\n`;
  md += `---\n\n`;

  if (notes.length === 0) {
    md += `*No active notes on this board.*\n`;
  } else {
    notes.forEach((note, idx) => {
      const title = note.title || `Note ${idx + 1}`;
      const plainContent = stripHtml(note.content);
      const isPinned = note.is_pinned ? '📌 Pinned' : '';
      const tags = note.tags && note.tags.length > 0 ? `Tags: ${note.tags.map((t) => `#${t}`).join(' ')}` : '';
      const dueDate = note.due_date ? `Due: ${new Date(note.due_date).toLocaleDateString()}` : '';

      md += `## ${title}\n`;
      if (isPinned || tags || dueDate) {
        md += `> ${[isPinned, tags, dueDate].filter(Boolean).join(' | ')}\n\n`;
      }
      md += `${plainContent}\n\n`;
      md += `---\n\n`;
    });
  }

  const filename = `${boardName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
  downloadFile(filename, md, 'text/markdown');
}

// 3. Export to PNG Canvas Snapshot
export async function exportBoardToPNG(boardName: string = 'Sticky Notes') {
  try {
    const boardElement = document.querySelector('.cork-board') as HTMLElement;
    if (!boardElement) return;

    // Use SVG foreignObject trick to convert DOM element to Canvas PNG cleanly
    const width = Math.max(boardElement.scrollWidth, window.innerWidth);
    const height = Math.max(boardElement.scrollHeight, window.innerHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid pattern overlay
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Render cards into canvas
    const cards = Array.from(document.querySelectorAll('.sticky-note-card')) as HTMLElement[];
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const boardRect = boardElement.getBoundingClientRect();

      const x = rect.left - boardRect.left + boardElement.scrollLeft;
      const y = rect.top - boardRect.top + boardElement.scrollTop;
      const cardW = rect.width;
      const cardH = rect.height;

      const cardStyle = window.getComputedStyle(card);
      const bgColor = cardStyle.backgroundColor || '#fff9c4';

      // Draw shadow
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      // Draw card box
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';

      // Title
      const titleEl = card.querySelector('.note-title') as HTMLElement;
      if (titleEl) {
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(titleEl.innerText.slice(0, 22), x + 16, y + 36);
      }

      // Content
      const bodyEl = card.querySelector('.note-body') as HTMLElement;
      if (bodyEl) {
        ctx.fillStyle = '#333333';
        ctx.font = '14px sans-serif';
        const lines = stripHtml(bodyEl.innerHTML).split('\n').slice(0, 6);
        lines.forEach((line, lineIdx) => {
          ctx.fillText(line.slice(0, 32), x + 16, y + 66 + lineIdx * 20);
        });
      }
    });

    // Trigger image download
    const filename = `${boardName.toLowerCase().replace(/\s+/g, '-')}-snapshot-${Date.now()}.png`;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('PNG export failed:', err);
    alert('Failed to generate PNG snapshot.');
  }
}

// 4. Print / PDF Export
export function printBoardToPDF() {
  window.print();
}
