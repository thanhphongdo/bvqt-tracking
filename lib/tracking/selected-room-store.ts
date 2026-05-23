'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SelectedRoomState {
  roomId: string | null;
  setRoomId: (id: string | null) => void;
}

export const useSelectedRoom = create<SelectedRoomState>()(
  persist(
    (set) => ({
      roomId: null,
      setRoomId: (id) => set({ roomId: id }),
    }),
    {
      name: 'bvq7-selected-room',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
