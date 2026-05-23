'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!videoRef.current) return;
    try {
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      const controls = await readerRef.current.decodeFromVideoDevice(
        undefined, // default device
        videoRef.current,
        (result) => {
          if (result) {
            onScan(result.getText());
          }
        }
      );
      controlsRef.current = controls;
      setStarted(true);
    } catch (err) {
      setError((err as Error).message);
      setStarted(false);
    }
  }, [onScan]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    if (paused) {
      stop();
      setStarted(false);
    }
  }, [paused, stop]);

  if (!started) {
    return (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-3 rounded-xl border bg-muted/40 p-4">
        <CameraOff className="size-10 text-muted-foreground" />
        <p className="text-center text-sm text-muted-foreground">
          {error ? <>Lỗi camera: {error}</> : <>Nhấn để bật camera quét mã</>}
        </p>
        <Button onClick={start}>
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
