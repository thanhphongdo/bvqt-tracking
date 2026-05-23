'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { EventType, VisitEventDocWithId } from '@/types/event';

const schema = z.object({
  type: z.enum(['registered', 'room_in', 'room_out']),
  /** "yyyy-MM-ddTHH:mm" local from input[type=datetime-local] */
  timestamp: z.string().min(1, 'Bắt buộc'),
  reason: z.string().trim().min(3, 'Lý do tối thiểu 3 ký tự'),
});

type FormValues = z.infer<typeof schema>;

function tsToLocalInput(ts: Timestamp): string {
  // Format Date as `yyyy-MM-ddTHH:mm` in local time (browser tz)
  const d = ts.toDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  event: VisitEventDocWithId;
  open: boolean;
  onClose: () => void;
}

export function EditEventDialog({ event, open, onClose }: Props) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: event.type,
      timestamp: tsToLocalInput(event.timestamp),
      reason: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setSubmitting(true);
    try {
      const { db } = getFirebaseClient();
      const newTs = Timestamp.fromDate(new Date(values.timestamp));
      const ref = doc(db, 'visits', event.visitId, 'events', event.id);
      await updateDoc(ref, {
        type: values.type as EventType,
        timestamp: newTs,
        isManuallyEdited: true,
        editHistory: arrayUnion({
          at: Timestamp.now(),
          byUid: user.uid,
          before: {
            type: event.type,
            roomId: event.roomId,
            timestamp: event.timestamp,
          },
          after: {
            type: values.type as EventType,
            roomId: event.roomId,
            timestamp: newTs,
          },
          reason: values.reason,
        }),
      });
      toast.success('Đã cập nhật event');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">Đăng ký</SelectItem>
                        <SelectItem value="room_in">Vào phòng</SelectItem>
                        <SelectItem value="room_out">Ra phòng</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thời gian</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do sửa (bắt buộc)</FormLabel>
                  <FormControl>
                    <Input placeholder="vd: quên check out, ghi nhận lại thời gian đúng" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
