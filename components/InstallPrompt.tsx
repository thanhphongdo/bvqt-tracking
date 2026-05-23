'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('install-dismissed')) {
      setDismissed(true);
      return;
    }

    // Android/Chrome: native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: no beforeinstallprompt — show manual instructions
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isIOS && !isStandalone) setShowIOS(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const onDismiss = () => {
    sessionStorage.setItem('install-dismissed', '1');
    setDismissed(true);
  };

  const isRelevantPage = pathname.startsWith('/dashboard') || pathname.startsWith('/tracking');
  if (dismissed || !isRelevantPage || (!deferredPrompt && !showIOS)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:hidden">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-lg px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="size-10 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">BVQ7 Tracking</p>
          {showIOS ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              Nhấn <Share className="inline size-3 shrink-0" /> rồi chọn
              <strong>Thêm vào Màn hình chính</strong>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Cài đặt để dùng offline</p>
          )}
        </div>
        {!showIOS && (
          <Button size="sm" className="shrink-0 rounded-xl h-8 px-3 text-xs font-semibold" onClick={onInstall}>
            Cài đặt
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Đóng"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
