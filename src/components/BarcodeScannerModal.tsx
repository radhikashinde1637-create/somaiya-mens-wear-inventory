import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Flashlight, FlashlightOff, Camera, AlertCircle, RefreshCw, Keyboard, ArrowRight } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Somaiya Barcode Scanner',
  subtitle = 'Align barcode or QR code inside the box',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'somaiya-html5-qr-code';

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 beep
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      }
    } catch {
      // Audio context error or blocked
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setPermissionDenied(false);
    setErrorMessage(null);
    setIsTorchOn(false);
    setHasTorch(false);

    // Give time for DOM element to mount
    const timer = setTimeout(() => {
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        if (!isMounted) return;
        const code = decodedText.trim();
        if (!code) return;

        playBeep();
        if (navigator.vibrate) {
          try {
            navigator.vibrate(120);
          } catch {
            // vibration not permitted
          }
        }

        // Stop scanner safely
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            })
            .catch(() => {})
            .finally(() => {
              onScanSuccess(code);
            });
        } else {
          onScanSuccess(code);
        }
      };

      const qrCodeErrorCallback = () => {
        // Continuous frame analysis error - ignore
      };

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          // Rectangular box suitable for standard barcodes (EAN, UPC, Code128) and square QR codes
          const w = Math.min(Math.floor(minDim * 0.85), 320);
          const h = Math.min(Math.floor(w * 0.65), 220);
          return { width: w, height: h };
        },
        aspectRatio: window.innerWidth < 640 ? 1.0 : 1.3333,
      };

      html5QrCode
        .start(
          { facingMode: 'environment' },
          config,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        )
        .then(() => {
          if (!isMounted) return;
          setIsScanning(true);

          // Check torch capability
          try {
            const capabilities = html5QrCode.getRunningTrackCapabilities();
            if (capabilities && (capabilities as any).torch) {
              setHasTorch(true);
            }
          } catch {
            // torch capabilities not supported on this browser
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('HTML5 QR Code start error:', err);
          const errString = String(err).toLowerCase();
          if (
            errString.includes('notallowederror') ||
            errString.includes('permission') ||
            errString.includes('denied')
          ) {
            setPermissionDenied(true);
          } else {
            setErrorMessage(
              typeof err === 'string'
                ? err
                : err?.message || 'Could not start camera scanner.'
            );
          }
        });
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            }).catch(() => {});
          } else {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [isOpen]);

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle not supported on this device:', err);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScanSuccess(manualCode.trim());
  };

  const handleRetryPermission = async () => {
    setPermissionDenied(false);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      // Re-trigger by toggling state
      window.location.reload();
    } catch (err) {
      setPermissionDenied(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-neutral-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live
              </span>
            </h2>
            <p className="text-[11px] text-neutral-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Torch toggle button */}
          {hasTorch && (
            <button
              type="button"
              onClick={handleToggleTorch}
              className={`p-2.5 rounded-full border transition-all ${
                isTorchOn
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-lg shadow-amber-500/40'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
              title={isTorchOn ? 'Turn Flashlight OFF' : 'Turn Flashlight ON'}
            >
              {isTorchOn ? (
                <Flashlight className="w-5 h-5 fill-current" />
              ) : (
                <FlashlightOff className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Toggle manual code entry */}
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-colors"
            title="Type Barcode Manually"
          >
            <Keyboard className="w-5 h-5" />
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-neutral-900/90 hover:bg-red-950 hover:text-red-300 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
            title="Close Camera Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Camera Viewfinder Zone */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {/* html5-qrcode video viewport container */}
        <div
          id={scannerContainerId}
          className="w-full h-full max-w-full max-h-full flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />

        {/* Viewfinder Overlay with High-Tech Corner Brackets & Animated Laser Line */}
        {!permissionDenied && !errorMessage && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Viewfinder Target Frame */}
            <div className="relative w-72 sm:w-80 h-48 sm:h-52 rounded-2xl border border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner 1: Top Left */}
              <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl shadow-sm" />
              {/* Corner 2: Top Right */}
              <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl shadow-sm" />
              {/* Corner 3: Bottom Left */}
              <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl shadow-sm" />
              {/* Corner 4: Bottom Right */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl shadow-sm" />

              {/* Laser Scanning Animation */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce" />

              {/* Crosshair indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-4 h-0.5 bg-amber-400" />
                <div className="w-0.5 h-4 bg-amber-400" />
              </div>
            </div>

            {/* Instruction text under box */}
            <p className="mt-6 text-xs sm:text-sm font-medium text-neutral-200 bg-neutral-900/80 backdrop-blur px-4 py-1.5 rounded-full border border-neutral-700/80 shadow-lg text-center">
              बारकोड किंवा QR कोड चौकटीत धरा (Point camera at barcode)
            </p>
          </div>
        )}

        {/* Permission Denied UI (with Marathi guidance as requested) */}
        {permissionDenied && (
          <div className="absolute inset-0 z-30 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-100">
              कॅमेरा परवानगी द्या (Camera permission required)
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-sm">
              बारकोड स्कॅन करण्यासाठी कृपया ब्राउझरमध्ये कॅमेरा परवानगी (Allow Camera) द्या.
            </p>
            <div className="mt-4 p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300 max-w-sm text-left">
              <span className="font-semibold text-amber-400 block mb-1">Android Chrome वर कशी परवानगी द्यावी:</span>
              <ol className="list-decimal pl-4 space-y-1 text-neutral-400">
                <li>URL बार डावीकडील कुलूपाच्या (Lock) चिन्हावर टॅप करा</li>
                <li><strong>Permissions</strong> किंवा <strong>Site Settings</strong> निवडा</li>
                <li><strong>Camera</strong> पर्याय <strong>Allow</strong> करा</li>
                <li>पृष्ठ रिफ्रेश करा</li>
              </ol>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetryPermission}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>पुन्हा प्रयत्न करा (Retry)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium rounded-xl text-xs border border-neutral-700"
              >
                हातने बारकोड टाका (Type Code)
              </button>
            </div>
          </div>
        )}

        {/* General Camera Error UI */}
        {errorMessage && !permissionDenied && (
          <div className="absolute inset-0 z-30 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">Camera Not Available</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="mt-4 px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
            >
              Enter Barcode Number Manually
            </button>
          </div>
        )}
      </div>

      {/* Bottom Control / Manual Input Tray */}
      <div className="relative z-20 px-4 sm:px-6 py-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        {showManualInput ? (
          <form onSubmit={handleManualSubmit} className="max-w-md mx-auto space-y-2">
            <label className="block text-xs font-medium text-neutral-300">
              Manual Barcode / SKU Entry
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Type or paste barcode (e.g. 8901234567890, SMW-CSH-101)..."
                autoFocus
                className="flex-1 px-3.5 py-2.5 bg-neutral-900 border border-amber-500/50 rounded-xl text-sm font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-amber-500 disabled:opacity-40 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-md shrink-0 cursor-pointer"
              >
                <span>Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="max-w-md mx-auto flex items-center justify-between text-xs text-neutral-400">
            <span>Supports EAN-13, UPC, Code-128, QR</span>
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard Entry</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
