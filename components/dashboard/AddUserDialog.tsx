'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/lib/api-client';
import { Button, buttonVariants } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  role: z.enum(['admin', 'manager', 'staff']),
});

type FormValues = z.infer<typeof schema>;

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'staff' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Đã thêm user');
      setOpen(false);
      form.reset();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>Thêm user</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>
            Nhập email Google của nhân viên. Họ sẽ login bằng Google và được liên kết tự động.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue>
                          {(v: string | null) =>
                            ({ staff: 'Nhân viên', manager: 'Quản lý', admin: 'Quản trị' }[v ?? ''] ?? v ?? 'Chọn role')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Nhân viên</SelectItem>
                        <SelectItem value="manager">Quản lý</SelectItem>
                        <SelectItem value="admin">Quản trị</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang thêm...' : 'Thêm'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
