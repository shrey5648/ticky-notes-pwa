import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockComments, mockActivities, saveStore } from '@/lib/mockStore';

// GET list comments for a note
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('note_id');

    if (!noteId) {
      return NextResponse.json({ error: 'note_id is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('note_comments')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fetch comments error:', error);
        return NextResponse.json({ comments: [] });
      }

      return NextResponse.json({ comments: data || [] });
    } else {
      const comments = mockComments
        .filter((c) => c.note_id === noteId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return NextResponse.json({ comments });
    }
  } catch (err) {
    console.error('GET comments error:', err);
    return NextResponse.json({ comments: [] });
  }
}

// POST post a comment on a note
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { note_id, comment_text, mentions = [] } = await req.json();

    if (!note_id || !comment_text || !comment_text.trim()) {
      return NextResponse.json({ error: 'note_id and comment_text are required' }, { status: 400 });
    }

    const commentObject = {
      id: `comment-${Date.now()}`,
      note_id,
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      comment_text: comment_text.trim(),
      mentions,
      created_at: new Date().toISOString(),
    };

    const activityObject = {
      id: `act-${Date.now()}`,
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      action_type: 'comment' as const,
      entity_type: 'note' as const,
      entity_id: note_id,
      description: `Commented on note: "${comment_text.trim().substring(0, 40)}${comment_text.length > 40 ? '...' : ''}"`,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data: comment, error } = await supabaseAdmin
        .from('note_comments')
        .insert({
          note_id,
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          comment_text: comment_text.trim(),
          mentions,
        })
        .select()
        .single();

      if (error) {
        console.error('Create comment error:', error);
        return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
      }

      // Log activity
      await supabaseAdmin.from('workspace_activities').insert({
        user_id: user.id,
        username: user.username,
        display_name: user.display_name,
        action_type: 'comment',
        entity_type: 'note',
        entity_id: note_id,
        description: activityObject.description,
      });

      return NextResponse.json({ comment });
    } else {
      mockComments.push(commentObject);
      mockActivities.unshift(activityObject);
      saveStore();
      return NextResponse.json({ comment: commentObject });
    }
  } catch (err) {
    console.error('POST comment error:', err);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
