'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function GoogleSignInButton() {
  const { signInWithGoogle, loading } = useAuth();

  async function handleClick() {
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error('Đăng nhập thất bại: ' + (err as Error).message);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} size="lg" className="w-full">
      Đăng nhập với Google
    </Button>
  );
}
