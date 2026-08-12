import { useState, useEffect } from 'react';
import { Board } from '@/lib/types';

export function useBoards(user: any) {
  const [boards, setBoards] = useState<Board[]>([
    { id: 'board-default', name: 'Main Board', owner_id: user?.id || 'admin', created_at: new Date().toISOString() },
  ]);
  const [currentBoardId, setCurrentBoardId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active-board-id');
      if (saved) return saved;
    }
    return 'board-default';
  });

  const handleSelectBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active-board-id', boardId);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetch('/api/boards')
      .then((res) => res.json())
      .then((data) => {
        if (data.boards && data.boards.length > 0) {
          setBoards(data.boards);
        }
      })
      .catch((err) => console.error('Failed to fetch boards:', err));
  }, [user]);

  const handleCreateBoard = async (name: string) => {
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.board) {
        setBoards((prev) => [...prev, data.board]);
        setCurrentBoardId(data.board.id);
      }
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  return {
    boards,
    setBoards,
    currentBoardId,
    onSelectBoard: handleSelectBoard,
    onCreateBoard: handleCreateBoard,
  };
}
