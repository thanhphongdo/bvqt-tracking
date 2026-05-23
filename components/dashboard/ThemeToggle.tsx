'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="size-8" />; // avoid hydration mismatch
  }

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
      title="Đổi giao diện (Sáng/Tối/Hệ thống)"
    >
      {theme === 'light' ? (
        <Sun className="size-4 animate-in fade-in zoom-in-50 duration-200" />
      ) : theme === 'dark' ? (
        <Moon className="size-4 animate-in fade-in zoom-in-50 duration-200" />
      ) : (
        <Laptop className="size-4 animate-in fade-in zoom-in-50 duration-200" />
      )}
    </Button>
  );
}
