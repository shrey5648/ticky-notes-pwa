import { NextRequest, NextResponse } from 'next/server';

function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content, title = '' } = body;

    if (!content && !title) {
      return NextResponse.json({ error: 'Note content or title is required' }, { status: 400 });
    }

    const plainText = cleanHtmlText(content);
    const combinedText = `${title} ${plainText}`.trim();

    if (action === 'summarize') {
      const sentences = plainText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
      let summaryBullets: string[] = [];

      if (sentences.length <= 2) {
        summaryBullets = [plainText || title];
      } else {
        // Top 3 informative sentences
        summaryBullets = sentences.slice(0, 3).map((s) => `• ${s}`);
      }

      const formattedSummary = `
<div style="background: rgba(249, 115, 22, 0.08); padding: 10px 14px; border-left: 4px solid #f97316; border-radius: 6px; margin: 10px 0;">
  <strong>✨ AI Summary:</strong>
  <ul style="margin: 6px 0 0 16px; padding: 0;">
    ${summaryBullets.map((b) => `<li style="margin-bottom: 4px;">${b.replace(/^•\s*/, '')}</li>`).join('')}
  </ul>
</div>
`.trim();

      return NextResponse.json({
        summary: formattedSummary,
        bullets: summaryBullets,
      });
    }

    if (action === 'tag') {
      const stopWords = new Set(['the', 'and', 'with', 'this', 'that', 'from', 'have', 'for', 'are', 'your', 'about', 'note', 'will']);
      const words = combinedText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

      const freqMap: Record<string, number> = {};
      words.forEach((w) => {
        freqMap[w] = (freqMap[w] || 0) + 1;
      });

      const topTags = Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([word]) => word);

      // Contextual fallbacks if text is short
      const suggestedTags = topTags.length > 0 ? topTags : ['idea', 'notes', 'workspace'];

      return NextResponse.json({
        tags: Array.from(new Set(suggestedTags)),
      });
    }

    if (action === 'expand_ideas') {
      const ideas = [
        `🎯 Define actionable milestones & owner for "${title || 'this task'}"`,
        `📌 Schedule review checkpoint with team`,
        `💡 Explore alternative design or implementation approaches`,
        `✅ Create test cases and validation criteria`,
      ];

      const htmlIdeas = `
<div style="margin-top: 12px; padding: 10px; border: 1px dashed #3b82f6; border-radius: 8px; background: rgba(59, 130, 246, 0.05);">
  <strong style="color: #3b82f6;">💡 Brainstormed Sub-Tasks:</strong>
  <ul style="margin: 6px 0 0 16px; padding: 0;">
    ${ideas.map((i) => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
  </ul>
</div>
`.trim();

      return NextResponse.json({
        ideas,
        htmlContent: htmlIdeas,
      });
    }

    return NextResponse.json({ error: 'Invalid AI action' }, { status: 400 });
  } catch (err: any) {
    console.error('AI assistant route error:', err);
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
