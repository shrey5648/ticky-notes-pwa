import { useState, useEffect } from 'react';
import { NoteConnection } from '@/lib/types';
import { getLocalConnections, saveLocalConnections, saveSingleLocalConnection, deleteLocalConnection } from '@/lib/db';

export function useConnections(user: any, currentBoardId: string) {
  const [connections, setConnections] = useState<NoteConnection[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load from local storage for instant rendering
    let localStoredConns: NoteConnection[] = [];
    if (typeof window !== 'undefined') {
      try {
        const rawConns = localStorage.getItem(`connections-${currentBoardId}`) || localStorage.getItem('connections-global');
        if (rawConns) localStoredConns = JSON.parse(rawConns);
      } catch (e) {}
    }

    getLocalConnections().then((dbConns) => {
      const connMap = new Map<string, NoteConnection>();
      localStoredConns.forEach((c) => connMap.set(c.id, c));
      dbConns.forEach((c) => {
        if (!c.board_id || c.board_id === currentBoardId) connMap.set(c.id, c);
      });
      const initialConns = Array.from(connMap.values());
      setConnections(initialConns);

      // Fetch remote API if online
      fetch(`/api/connections?board_id=${currentBoardId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.connections && Array.isArray(data.connections)) {
            data.connections.forEach((c: NoteConnection) => connMap.set(c.id, c));
            const mergedConns = Array.from(connMap.values());
            setConnections(mergedConns);
            saveLocalConnections(mergedConns);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`connections-${currentBoardId}`, JSON.stringify(mergedConns));
            }
          }
        })
        .catch((err) => console.error('Failed to fetch connections:', err));
    });
  }, [user, currentBoardId]);

  const handleCreateConnection = async (fromId: string, toId: string) => {
    const newConn: NoteConnection = {
      id: `conn-${Date.now()}`,
      board_id: currentBoardId,
      from_note_id: fromId,
      to_note_id: toId,
      label: '',
      color: '#ff9800',
      style: 'solid',
      created_at: new Date().toISOString(),
    };
    setConnections((prev) => {
      const updated = [...prev, newConn];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`connections-${currentBoardId}`, JSON.stringify(updated));
        localStorage.setItem('connections-global', JSON.stringify(updated));
      }
      return updated;
    });
    await saveSingleLocalConnection(newConn);
    fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConn),
    }).catch((err) => console.error('Failed to create connection:', err));
  };

  const handleUpdateConnection = async (id: string, updates: Partial<NoteConnection>) => {
    setConnections((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      if (typeof window !== 'undefined') {
        localStorage.setItem(`connections-${currentBoardId}`, JSON.stringify(updated));
        localStorage.setItem('connections-global', JSON.stringify(updated));
      }
      return updated;
    });
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      await saveSingleLocalConnection({ ...conn, ...updates });
    }
    fetch('/api/connections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch((err) => console.error('Failed to update connection:', err));
  };

  const handleDeleteConnection = async (id: string) => {
    setConnections((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`connections-${currentBoardId}`, JSON.stringify(updated));
        localStorage.setItem('connections-global', JSON.stringify(updated));
      }
      return updated;
    });
    await deleteLocalConnection(id);
    fetch(`/api/connections?id=${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete connection:', err)
    );
  };

  return {
    connections,
    onCreateConnection: handleCreateConnection,
    onUpdateConnection: handleUpdateConnection,
    onDeleteConnection: handleDeleteConnection,
  };
}
