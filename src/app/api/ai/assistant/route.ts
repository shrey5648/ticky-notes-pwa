import { NextRequest, NextResponse } from 'next/server';

function extractCleanLines(html: string): string[] {
  if (!html) return [];
  const textWithBreaks = html
    .replace(/<\/(p|div|li|h1|h2|h3|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');

  const rawLines = textWithBreaks
    .split(/[\n.!?]+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 5);

  return Array.from(new Set(rawLines));
}

function cleanHtmlText(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content = '', title = '' } = body;

    const plainText = cleanHtmlText(content);
    const combinedText = `${title} ${plainText}`.trim();

    if (!combinedText) {
      return NextResponse.json({ error: 'Note content or title is required' }, { status: 400 });
    }

    if (action === 'summarize') {
      const extractedLines = extractCleanLines(content);
      let summaryBullets: string[] = [];

      if (extractedLines.length === 0) {
        summaryBullets = [title || plainText];
      } else if (extractedLines.length <= 3) {
        summaryBullets = extractedLines;
      } else {
        // Take top representative points across document
        summaryBullets = [
          extractedLines[0],
          extractedLines[Math.floor(extractedLines.length / 2)],
          extractedLines[extractedLines.length - 1],
        ];
      }

      // TipTap natively supports blockquote, strong, ul, li
      const formattedSummary = `
<blockquote>
  <p><strong>✨ AI Executive Summary:</strong></p>
  <ul>
    ${summaryBullets.map((b) => `<li>${b}</li>`).join('')}
  </ul>
</blockquote>
<p></p>
`.trim();

      return NextResponse.json({
        summary: formattedSummary,
        bullets: summaryBullets,
      });
    }

    if (action === 'tag') {
      const stopWords = new Set([
        'the', 'and', 'with', 'this', 'that', 'from', 'have', 'for', 'are', 'your', 'about',
        'note', 'will', 'some', 'what', 'when', 'where', 'there', 'they', 'them', 'just', 'more'
      ]);
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

      const suggestedTags = topTags.length > 0 ? topTags : ['idea', 'notes', 'workspace'];

      return NextResponse.json({
        tags: Array.from(new Set(suggestedTags)),
      });
    }

    if (action === 'expand_ideas') {
      const mainTopic = title || cleanHtmlText(content).slice(0, 30) || 'Task';
      const ideas = [
        `🎯 Action Item: Define ownership & target deadline for "${mainTopic}"`,
        `📌 Review Checkpoint: Schedule progress review with team`,
        `💡 Alternative Approach: Test alternative layout / implementation design`,
        `✅ Quality Assurance: Create validation & edge-case test plan`,
      ];

      const htmlIdeas = `
<blockquote>
  <p><strong>💡 Brainstormed Sub-Tasks:</strong></p>
  <ul>
    ${ideas.map((i) => `<li>${i}</li>`).join('')}
  </ul>
</blockquote>
<p></p>
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
