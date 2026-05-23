'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  paused: boolean;
}

export function BarcodeScanner({ onScan, paused }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If scanning hasn't been started by the user yet, or if it is paused, stop scanning.
    if (!started) {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      return;
    }

    if (paused) {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      return;
    }

    let isActive = true;

    async function initCamera() {
      // Small delay to ensure the video ref is fully mounted and available in the DOM
      if (!videoRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!videoRef.current || !isActive) return;

      try {
        if (!readerRef.current) {
          readerRef.current = new BrowserMultiFormatReader();
        }
        const controls = await readerRef.current.decodeFromVideoDevice(
          undefined, // default device
          videoRef.current,
          (result) => {
            if (result && isActive) {
              onScan(result.getText());
            }
          }
        );
        if (isActive) {
          controlsRef.current = controls;
        } else {
          controls.stop();
        }
      } catch (err) {
        if (isActive) {
          setError((err as Error).message || 'Không thể truy cập camera');
          setStarted(false);
        }
      }
    }

    initCamera();

    return () => {
      isActive = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [started, paused, onScan]);

  const handleStart = () => {
    setError(null);
    setStarted(true);
  };

  if (!started) {
    return (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-3 rounded-xl border bg-muted/40 p-4">
        <CameraOff className="size-10 text-muted-foreground" />
        <p className="text-center text-sm text-muted-foreground">
          {error ? <>Lỗi camera: {error}</> : <>Nhấn để bật camera quét mã</>}
        </p>
        <Button onClick={handleStart}>
          <Camera className="mr-2 size-4" />
          Bắt đầu quét
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm overflow-hidden rounded-xl border bg-black">
      <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-3/5 rounded-lg border-2 border-white/60" />
      </div>
    </div>
  );
}

