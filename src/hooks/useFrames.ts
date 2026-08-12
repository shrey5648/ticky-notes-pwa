import { useState, useEffect } from 'react';
import { NoteFrame } from '@/lib/types';
import { getLocalFrames, saveLocalFrames, saveSingleLocalFrame, deleteLocalFrame } from '@/lib/db';

export function useFrames(user: any, currentBoardId: string) {
  const [frames, setFrames] = useState<NoteFrame[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load from local storage for instant rendering
    let localStoredFrames: NoteFrame[] = [];
    if (typeof window !== 'undefined') {
      try {
        const rawFrames = localStorage.getItem(`frames-${currentBoardId}`) || localStorage.getItem('frames-global');
        if (rawFrames) localStoredFrames = JSON.parse(rawFrames);
      } catch (e) {}
    }

    getLocalFrames().then((dbFrames) => {
      const frameMap = new Map<string, NoteFrame>();
      localStoredFrames.forEach((f) => frameMap.set(f.id, f));
      dbFrames.forEach((f) => {
        if (!f.board_id || f.board_id === currentBoardId) frameMap.set(f.id, f);
      });
      const initialFrames = Array.from(frameMap.values());
      setFrames(initialFrames);

      // Fetch remote API if online
      fetch(`/api/frames?board_id=${currentBoardId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.frames && Array.isArray(data.frames)) {
            data.frames.forEach((f: NoteFrame) => frameMap.set(f.id, f));
            const mergedFrames = Array.from(frameMap.values());
            setFrames(mergedFrames);
            saveLocalFrames(mergedFrames);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`frames-${currentBoardId}`, JSON.stringify(mergedFrames));
            }
          }
        })
        .catch((err) => console.error('Failed to fetch frames:', err));
    });
  }, [user, currentBoardId]);

  const handleCreateFrame = async () => {
    const newFrame: NoteFrame = {
      id: `frame-${Date.now()}`,
      board_id: currentBoardId,
      title: '📌 Swimlane Section',
      position_x: 120,
      position_y: 120,
      width: 450,
      height: 350,
      color: '#3b82f6',
      created_at: new Date().toISOString(),
    };
    setFrames((prev) => {
      const updated = [...prev, newFrame];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`frames-${currentBoardId}`, JSON.stringify(updated));
        localStorage.setItem('frames-global', JSON.stringify(updated));
      }
      return updated;
    });
    await saveSingleLocalFrame(newFrame);
    fetch('/api/frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFrame),
    }).catch((err) => console.error('Failed to create frame:', err));
  };

  const handleUpdateFrame = async (id: string, updates: Partial<NoteFrame>) => {
    setFrames((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      if (typeof window !== 'undefined') {
        localStorage.setItem(`frames-${currentBoardId}`, JSON.stringify(updated));
        localStorage.setItem('frames-global', JSON.stringify(updated));
      }
      return updated;
    });
    const frame = frames.find((f) => f.id === id);
    if (frame) {
      await saveSingleLocalFrame({ ...frame, ...updates });
    }
    fetch('/api/frames', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch((err) => console.error('Failed to update frame:', err));
  };

  const handleDeleteFrame = async (id: string) => {
    setFrames((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`frames-${currentBoardId}`, JSON.stringify(updated));
        localStorage.setItem('frames-global', JSON.stringify(updated));
      }
      return updated;
    });
    await deleteLocalFrame(id);
    fetch(`/api/frames?id=${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete frame:', err)
    );
  };

  return {
    frames,
    onCreateFrame: handleCreateFrame,
    onUpdateFrame: handleUpdateFrame,
    onDeleteFrame: handleDeleteFrame,
  };
}
