import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { mockNotes, saveStore } from '@/lib/mockStore';
import { Note } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { updates = [], creates = [], deletes = [] } = body;

    if (isSupabaseConfigured()) {
      // 1. Handle Batch Creates (Upsert to prevent conflicts)
      if (creates.length > 0) {
        const insertData = creates.map((note: any) => {
          // Remove client-specific fields that shouldn't persist in Supabase DB schema
          const { is_shared, is_admin_view, permission, shared_by_user, owner_user, ...cleanNote } = note;
          return {
            ...cleanNote,
            owner_id: user.id,
            updated_at: new Date().toISOString(),
          };
        });

        const { error: insertErr } = await supabaseAdmin
          .from('notes')
          .upsert(insertData);
        if (insertErr) {
          console.error('Batch creates error:', insertErr);
          return NextResponse.json({ error: 'Failed to batch create' }, { status: 500 });
        }
      }

      // 2. Handle Batch Updates
      if (updates.length > 0) {
        const ids = updates.map((u: any) => u.id);
        const { data: existingNotes, error: selectErr } = await supabaseAdmin
          .from('notes')
          .select('*')
          .in('id', ids);

        if (selectErr) {
          console.error('Batch updates select error:', selectErr);
          return NextResponse.json({ error: 'Failed to select existing notes' }, { status: 500 });
        }

        const updatedData = (existingNotes || [])
          .map((n) => {
            const match = updates.find((u: any) => u.id === n.id);
            if (match && (n.owner_id === user.id || user.role === 'admin')) {
              const { is_shared, is_admin_view, permission, shared_by_user, owner_user, ...cleanUpdates } = match.updates;
              return {
                ...n,
                ...cleanUpdates,
                updated_at: new Date().toISOString(),
              };
            }
            return null;
          })
          .filter(Boolean);

        if (updatedData.length > 0) {
          const { error: updateErr } = await supabaseAdmin
            .from('notes')
            .upsert(updatedData);
          if (updateErr) {
            console.error('Batch updates upsert error:', updateErr);
            return NextResponse.json({ error: 'Failed to batch update notes' }, { status: 500 });
          }
        }
      }

      // 3. Handle Batch Deletes
      if (deletes.length > 0) {
        const { error: deleteErr } = await supabaseAdmin
          .from('notes')
          .delete()
          .in('id', deletes)
          .eq('owner_id', user.id);
        if (deleteErr) {
          console.error('Batch delete error:', deleteErr);
          return NextResponse.json({ error: 'Failed to batch delete' }, { status: 500 });
        }
      }
    } else {
      // Mock Store Fallback Mode
      // 1. Handle Creates
      creates.forEach((note: any) => {
        const existingIdx = mockNotes.findIndex((n) => n.id === note.id);
        const noteData = {
          ...note,
          owner_id: user.id,
          updated_at: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          mockNotes[existingIdx] = noteData;
        } else {
          mockNotes.push(noteData);
        }
      });

      // 2. Handle Updates
      updates.forEach((item: any) => {
        const existingIdx = mockNotes.findIndex((n) => n.id === item.id);
        if (existingIdx >= 0) {
          const n = mockNotes[existingIdx];
          if (n.owner_id === user.id || user.role === 'admin') {
            mockNotes[existingIdx] = {
              ...n,
              ...item.updates,
              updated_at: new Date().toISOString(),
            };
          }
        }
      });

      // 3. Handle Deletes
      if (deletes.length > 0) {
        const deleteSet = new Set(deletes);
        for (let i = mockNotes.length - 1; i >= 0; i--) {
          if (deleteSet.has(mockNotes[i].id) && mockNotes[i].owner_id === user.id) {
            mockNotes.splice(i, 1);
          }
        }
      }

      saveStore();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Batch api route general error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
