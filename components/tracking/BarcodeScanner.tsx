'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
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
          const hints = new Map();
          hints.set(DecodeHintType.TRY_HARDER, true);
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.EAN_8,
            BarcodeFormat.EAN_13,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODABAR,
            BarcodeFormat.ITF
          ]);
          readerRef.current = new BrowserMultiFormatReader(hints);
        }

        // Try to access the environment (rear) camera with high resolution first
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        let controls;
        try {
          controls = await readerRef.current.decodeFromConstraints(
            constraints,
            videoRef.current,
            (result) => {
              if (result && isActive) {
                onScan(result.getText());
                setStarted(false); // Turn off camera immediately on success
              }
            }
          );
        } catch (constraintErr) {
          console.warn('Strict constraints failed, falling back to simple video constraint:', constraintErr);
          // Fallback if environment facingMode or resolution is rejected (e.g. desktop webcams)
          controls = await readerRef.current.decodeFromConstraints(
            { video: true },
            videoRef.current,
            (result) => {
              if (result && isActive) {
                onScan(result.getText());
                setStarted(false); // Turn off camera immediately on success
              }
            }
          );
        }

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

  const handleStop = () => {
    setStarted(false);
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
      <video ref={videoRef} className="aspect-square w-full object-cover animate-in fade-in duration-300" muted playsInline />
      
      {/* Target framing box with dimmed surrounding mask */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-3/5 rounded-lg border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Processing overlay when paused */}
      {paused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs text-white animate-in fade-in duration-200">
          <div className="size-8 animate-spin rounded-full border-2 border-white border-t-transparent mb-2" />
          <span className="text-sm font-medium">Đang xử lý kết quả...</span>
        </div>
      )}

      {/* Floating control buttons */}
      {!paused && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4">
          <Button
            variant="destructive"
            size="sm"
            className="bg-destructive/90 hover:bg-destructive text-white backdrop-blur-sm shadow-lg font-medium transition-all duration-200 border-none rounded-lg"
            onClick={handleStop}
          >
            <CameraOff className="mr-2 size-4" />
            Tắt camera
          </Button>
        </div>
      )}
    </div>
  );
}
