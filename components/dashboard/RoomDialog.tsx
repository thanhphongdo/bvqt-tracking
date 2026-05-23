'use client';

import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import type { RoomDocWithId } from '@/types/room';

const schema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc'),
  function: z.string().trim().min(1, 'Bắt buộc'),
  isRegistrationCounter: z.boolean(),
  autoOutWarningMinutes: z.number().int().positive('Phải > 0'),
});

type FormValues = z.infer<typeof schema>;

export function RoomDialog({
  room,
  trigger,
}: {
  room?: RoomDocWithId;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: room?.name ?? '',
      function: room?.function ?? 'general',
      isRegistrationCounter: room?.isRegistrationCounter ?? false,
      autoOutWarningMinutes: room?.autoOutWarningMinutes ?? 30,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const { db } = getFirebaseClient();
      const payload = {
        ...values,
        status: room?.status ?? 'active',
        updatedAt: serverTimestamp(),
      };
      if (room) {
        await updateDoc(doc(db, 'rooms', room.id), payload);
        toast.success('Đã cập nhật phòng');
      } else {
        await addDoc(collection(db, 'rooms'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Đã tạo phòng');
        form.reset();
      }
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? 'Sửa phòng' : 'Tạo phòng mới'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên phòng</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="function"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chức năng</FormLabel>
                  <FormControl>
                    <Input placeholder="general, xray, lab, registration, ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRegistrationCounter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">
                    Đây là quầy đăng ký (lấy sổ)
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="autoOutWarningMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cảnh báo quên check-out (phút)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
