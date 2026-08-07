import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera, X, RotateCcw, Check, ZoomIn, ZoomOut, AlertTriangle, SwitchCamera,
  FlipHorizontal, Grid, Frame, Sparkles, RefreshCw, Eye
} from 'lucide-react';
import { CustomSelect, SelectOption } from './CustomSelect';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  outputSize?: number;
  title?: string;
}

type GuideMode = 'OVAL' | 'GRID' | 'CORNER';

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  outputSize = 600,
  title = "Studio Photo Officiel — Prise de Profil",
}) => {
  const [step, setStep] = useState<'loading' | 'live' | 'crop' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [guideMode, setGuideMode] = useState<GuideMode>('OVAL');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    setStep('loading');
    setErrorMsg('');
    stopStream();
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      const activeTrackSettings = stream.getVideoTracks()[0]?.getSettings();
      setSelectedDeviceId(deviceId || activeTrackSettings?.deviceId || videoInputs[0]?.deviceId || '');

      setStep('live');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorisez la caméra dans les paramètres de votre navigateur."
          : err?.name === 'NotFoundError'
          ? "Aucune caméra détectée sur cet ordinateur."
          : "Impossible d'accéder à la caméra."
      );
      setStep('error');
    }
  }, [stopStream]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setZoom(1);
      setRotation(0);
      setCountdown(null);
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 300);

    const video = videoRef.current;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    const cropDim = Math.min(vWidth, vHeight);
    const cropX = (vWidth - cropDim) / 2;
    const cropY = (vHeight - cropDim) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);

      if (isMirrored) {
        ctx.scale(-1, 1);
      }

      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropDim,
        cropDim,
        -outputSize / 2,
        -outputSize / 2,
        outputSize,
        outputSize
      );

      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(dataUrl);
      setStep('crop');
    }
  };

  const handleStartCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          takePhoto();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 850);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const deviceOptions: SelectOption[] = devices.map((d, index) => ({
    value: d.deviceId,
    label: d.label || `Caméra ${index + 1} (${d.deviceId.slice(0, 5)}...)`,
  }));

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 dark:bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-xl sm:max-w-2xl my-auto rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all max-h-[88vh] relative z-[100000]"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE MODALE */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Ajustement de cadrage HD & contrôle de l'effet miroir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ZONE VIDÉO ET PRÉVISUALISATION DANS UN CADRE ÉLÉGANT */}
        <div className="p-3 bg-slate-900/40 dark:bg-slate-950/60 flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative bg-slate-950 rounded-xl overflow-hidden shadow-inner aspect-[4/3] sm:aspect-[16/10] w-full flex items-center justify-center border border-slate-800/80">
            {flashEffect && <div className="absolute inset-0 bg-white z-40 animate-ping opacity-90" />}

            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                <span className="text-7xl font-black text-white drop-shadow-2xl animate-bounce">
                  {countdown}
                </span>
              </div>
            )}

            {step === 'error' ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-rose-400">
                <AlertTriangle className="w-12 h-12 mb-3 animate-bounce" />
                <p className="text-xs font-bold max-w-sm leading-relaxed">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="mt-4 px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-all cursor-pointer"
                >
                  Réessayer la Caméra
                </button>
              </div>
            ) : step === 'crop' && capturedImage ? (
              /* APERÇU VALIDATION */
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4">
                <div className="relative overflow-hidden rounded-2xl border-4 border-emerald-500 shadow-2xl bg-black w-52 h-52 sm:w-60 sm:h-60">
                  <img src={capturedImage} alt="Capture Rognée" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-950/85 text-emerald-400 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1 backdrop-blur-md">
                    <Check className="w-3 h-3" />
                    <span>Format Officiel HD (1:1)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* VUE FLUX DIRECT */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {step === 'loading' && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-indigo-400">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-xs font-bold">Connexion à la WebCam...</p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isMirrored ? 'transform -scale-x-100' : 'transform scale-x-100'
                  }`}
                />

                {/* OVERLAY DE CONTRÔLES HUD EN DIRECT */}
                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setIsMirrored(!isMirrored)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        isMirrored ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                      title="Bascule miroir (Activer / Désactiver le miroir horizontal)"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Miroir {isMirrored ? 'ON' : 'OFF'}</span>
                    </button>

                    <div className="w-px h-4 bg-slate-700/60" />

                    <button
                      type="button"
                      onClick={() => setGuideMode('OVAL')}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        guideMode === 'OVAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setGuideMode('GRID')}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        guideMode === 'GRID' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* MASQUES DE GUIDAGE SVG */}
                {guideMode === 'OVAL' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <mask id="passport-mask-2">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <ellipse cx="50" cy="46" rx="26" ry="34" fill="black" />
                      </mask>
                    </defs>
                    <rect x="0" y="0" width="100" height="100" fill="rgba(15, 23, 42, 0.72)" mask="url(#passport-mask-2)" />
                    <ellipse
                      cx="50"
                      cy="46"
                      rx="26"
                      ry="34"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="0.8"
                      strokeDasharray="2,1.5"
                      className="animate-pulse"
                    />
                    <line x1="32" y1="39" x2="68" y2="39" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="0.4" strokeDasharray="1,1" />
                  </svg>
                )}

                {guideMode === 'GRID' && (
                  <div className="absolute inset-0 z-10 pointer-events-none border border-indigo-500/30 grid grid-cols-3 grid-rows-3 bg-black/30">
                    <div className="border-r border-b border-indigo-500/20" />
                    <div className="border-r border-b border-indigo-500/20" />
                    <div className="border-b border-indigo-500/20" />
                    <div className="border-r border-b border-indigo-500/20" />
                    <div className="border-r border-b border-indigo-500/30 bg-indigo-500/5" />
                    <div className="border-b border-indigo-500/20" />
                    <div className="border-r border-indigo-500/20" />
                    <div className="border-r border-indigo-500/20" />
                    <div />
                  </div>
                )}

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700/60 text-[10.5px] font-bold flex items-center gap-2 backdrop-blur-md shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>Alignez le visage dans le repère ovale studio</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PIED DE MODALE */}
        <div className="p-3.5 border-t flex items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--border)' }}>
          {devices.length > 1 && step !== 'crop' ? (
            <div className="w-40 sm:w-56 shrink-0">
              <CustomSelect options={deviceOptions} value={selectedDeviceId} onChange={handleDeviceChange} />
            </div>
          ) : (
            <div className="shrink-0" />
          )}

          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0">
            {step === 'crop' ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep('live')}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 transition-all flex items-center gap-2 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>Reprendre</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider la Photo</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 transition-all cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={step === 'loading' || step === 'error'}
                  onClick={handleStartCountdown}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Minuteur (3s)</span>
                  <span className="sm:hidden">3s</span>
                </button>
                <button
                  type="button"
                  disabled={step === 'loading' || step === 'error'}
                  onClick={takePhoto}
                  className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  <span>Prendre la Photo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
