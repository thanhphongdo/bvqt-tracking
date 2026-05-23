'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { todayDateVN } from '@/lib/tracking/visit-id';
import type { UserDocWithId } from '@/types/user';
import type { RoomDocWithId } from '@/types/room';

interface Props {
  room: RoomDocWithId;
  trigger: React.ReactNode;
}

export function DutyRosterDialog({ room, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayDateVN());
  const [staff, setStaff] = useState<UserDocWithId[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { db } = getFirebaseClient();
    const q = query(
      collection(db, 'users'),
      where('status', '==', 'active'),
      orderBy('status'),
      orderBy('email')
    );
    const unsub = onSnapshot(q, (snap) => {
      setStaff(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserDocWithId, 'id'>) }))
      );
    });
    return unsub;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const { db } = getFirebaseClient();
    getDoc(doc(db, 'rooms', room.id, 'duty', date))
      .then((snap) => {
        const uids: string[] = snap.exists() ? snap.data().staffUids ?? [] : [];
        setSelected(new Set(uids));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, date, room.id]);

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const { db } = getFirebaseClient();
      await setDoc(doc(db, 'rooms', room.id, 'duty', date), {
        staffUids: Array.from(selected),
      });
      toast.success('Đã lưu phân công');
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Phân công trực — {room.name}</DialogTitle>
          <DialogDescription>
            Chọn nhân viên trực phòng này theo ngày. Có thể để trống nếu không cần phân công.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1">
            <Label htmlFor="date">Ngày</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có user nào.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-2">
              {staff.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={u.uid ? selected.has(u.uid) : false}
                    onCheckedChange={() => u.uid && toggle(u.uid)}
                    disabled={!u.uid}
                  />
                  <span>{u.email}</span>
                  <span className="text-xs text-muted-foreground">({u.role})</span>
                  {!u.uid && (
                    <span className="text-xs text-muted-foreground">— chưa login</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Huỷ
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
