'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { RoomDocWithId } from '@/types/room';

interface RoomPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (room: RoomDocWithId) => void;
}

export function RoomPicker({ open, onOpenChange, onSelect }: RoomPickerProps) {
  const [rooms, setRooms] = useState<RoomDocWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { db } = getFirebaseClient();
    const q = query(
      collection(db, 'rooms'),
      where('status', '==', 'active'),
      orderBy('status'),
      orderBy('name')
    );
    const unsub = onSnapshot(q, (snap) => {
      setRooms(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomDocWithId, 'id'>) }))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chọn phòng</DialogTitle>
          <DialogDescription>
            Chọn phòng bạn đang trực. Lựa chọn này sẽ được nhớ trên máy này.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải danh sách phòng...</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có phòng nào active. Liên hệ manager để tạo phòng.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rooms.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                className="h-auto justify-start py-3"
                onClick={() => onSelect(r)}
              >
                <div className="flex flex-1 flex-col items-start gap-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.function}
                    {r.isRegistrationCounter && (
                      <Badge variant="secondary" className="ml-2">
                        Quầy đăng ký
                      </Badge>
                    )}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
