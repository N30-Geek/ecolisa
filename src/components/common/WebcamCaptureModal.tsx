import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera, RefreshCw, Check, X, SwitchCamera, AlertCircle, Sparkles, UserCheck,
  FlipHorizontal, Grid, Frame, Sun, Sliders, RotateCw, ZoomIn, ZoomOut, Eye,
  Maximize2, Crop, ShieldCheck, Image as ImageIcon
} from 'lucide-react';
import { CustomSelect, SelectOption } from './CustomSelect';

interface WebcamCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  title?: string;
  defaultAspectRatio?: 'SQUARE' | 'PASSPORT';
}

type GuideOverlayMode = 'OVAL' | 'GRID' | 'CORNER' | 'NONE';
type FilterMode = 'NORMAL' | 'STUDIO' | 'BW' | 'VIBRANT';

export const WebcamCaptureModal: React.FC<WebcamCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Studio Photo Officiel — Prise de Profil',
  defaultAspectRatio = 'SQUARE',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Équipement & Flux
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Réglages Live Caméra (Par défaut Miroir OFF pour préserver la lisibilité des textes et DroidCam)
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [guideMode, setGuideMode] = useState<GuideOverlayMode>('OVAL');
  const [aspectRatio, setAspectRatio] = useState<'SQUARE' | 'PASSPORT'>(defaultAspectRatio);

  // État de capture & Retouche Post-Capture
  const [rawCapturedCanvas, setRawCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Ajustements post-prise (Zoom, Pan, Rotation, Filtre)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<FilterMode>('NORMAL');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Initialisation WebCam & Énumération des caméras
  useEffect(() => {
    if (!isOpen) {
      stopWebcam();
      return;
    }

    const initWebcam = async () => {
      setIsLoading(true);
      setError(null);
      setCapturedImage(null);
      setRawCapturedCanvas(null);
      setCountdown(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setSelectedFilter('NORMAL');

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevices);

        const defaultDevice = videoDevices[0]?.deviceId || '';
        setSelectedDeviceId(defaultDevice);

        await startStream(defaultDevice);
      } catch (err: any) {
        console.error('[Webcam Studio] Erreur d’accès caméra :', err);
        setError('Impossible d’accéder à la WebCam. Vérifiez les autorisations de votre navigateur.');
        setIsLoading(false);
      }
    };

    initWebcam();

    return () => {
      stopWebcam();
    };
  }, [isOpen]);

  const startStream = async (deviceId?: string) => {
    stopWebcam();
    setIsLoading(true);
    setError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          setVideoResolution({ width: settings.width, height: settings.height });
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('[Webcam Studio] Erreur flux vidéo :', err);
      setError('Erreur lors du démarrage du flux vidéo HD.');
      setIsLoading(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startStream(deviceId);
  };

  // Traitement et génération de la capture rognée finale avec filtres & ajustements
  const processFinalImage = useCallback(() => {
    if (!rawCapturedCanvas) return;

    const exportWidth = aspectRatio === 'SQUARE' ? 600 : 600;
    const exportHeight = aspectRatio === 'SQUARE' ? 600 : 800;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = exportWidth;
    outCanvas.height = exportHeight;

    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Application des filtres CSS dans le contexte Canvas
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (selectedFilter === 'STUDIO') {
      filterString += ' saturate(115%) contrast(108%)';
    } else if (selectedFilter === 'BW') {
      filterString += ' grayscale(100%) contrast(115%)';
    } else if (selectedFilter === 'VIBRANT') {
      filterString += ' saturate(130%) brightness(105%)';
    }
    ctx.filter = filterString;

    ctx.save();
    ctx.translate(exportWidth / 2, exportHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calcul de la zone source depuis la capture vidéo brute
    const srcW = rawCapturedCanvas.width;
    const srcH = rawCapturedCanvas.height;

    // Ajustement miroir selon préférence
    if (isMirrored) {
      ctx.scale(-1, 1);
    }

    const aspectTarget = exportWidth / exportHeight;
    const aspectSrc = srcW / srcH;

    let drawW = exportWidth;
    let drawH = exportHeight;

    if (aspectSrc > aspectTarget) {
      drawW = exportHeight * aspectSrc;
    } else {
      drawH = exportWidth / aspectSrc;
    }

    ctx.drawImage(
      rawCapturedCanvas,
      -drawW / 2 + pan.x,
      -drawH / 2 + pan.y,
      drawW,
      drawH
    );

    ctx.restore();

    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
  }, [rawCapturedCanvas, aspectRatio, brightness, contrast, selectedFilter, rotation, zoom, isMirrored, pan]);

  // Recalculer la vue finale à chaque changement d'ajustement
  useEffect(() => {
    if (rawCapturedCanvas) {
      processFinalImage();
    }
  }, [rawCapturedCanvas, processFinalImage]);

  // Déclenchement de la capture instantanée
  const triggerCapture = () => {
    if (!videoRef.current) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 300);

    const video = videoRef.current;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = vWidth;
    tempCanvas.height = vHeight;

    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, vWidth, vHeight);
      setRawCapturedCanvas(tempCanvas);
    }
  };

  const handleStartCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          triggerCapture();
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
      {/* Fenêtre Modale flottant au-dessus de TOUT l'écran */}
      <div
        className="w-full max-w-xl sm:max-w-2xl my-auto rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all max-h-[88vh] relative z-[100000]"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE DE LA MODALE */}
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
                Studio Photo HD • Ajustement & Guide de Cadrage Interactif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
              {videoResolution.width} × {videoResolution.height} HD
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPS PRINCIPAL : ZONE DE CAPTURE OU RETOUCHE DANS UN CADRE ELEGANT */}
        <div className="p-3 bg-slate-900/40 dark:bg-slate-950/60 flex-1 flex items-center justify-center overflow-hidden">
          <div className="relative bg-slate-950 rounded-xl overflow-hidden shadow-inner aspect-[4/3] sm:aspect-[16/10] w-full flex items-center justify-center border border-slate-800/80">
            {/* Flash studio */}
            {flashEffect && <div className="absolute inset-0 bg-white z-40 animate-ping opacity-90" />}

            {/* Décompte 3-2-1 */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                <span className="text-7xl font-black text-white drop-shadow-2xl animate-bounce">
                  {countdown}
                </span>
              </div>
            )}

            {error ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-rose-400">
                <AlertCircle className="w-12 h-12 mb-3 animate-bounce" />
                <p className="text-xs font-bold max-w-sm leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={() => startStream(selectedDeviceId)}
                  className="mt-4 px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-all cursor-pointer"
                >
                  Réessayer la Caméra
                </button>
              </div>
            ) : capturedImage ? (
              /* VUE RETOUCHE & VALITATION PHOTO */
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-4">
                <div className="relative flex flex-col items-center gap-3">
                  <div
                    className={`relative overflow-hidden rounded-2xl border-4 border-emerald-500 shadow-2xl bg-black ${
                      aspectRatio === 'SQUARE' ? 'w-52 h-52 sm:w-60 sm:h-60' : 'w-44 h-60 sm:w-52 sm:h-68'
                    }`}
                  >
                    <img
                      src={capturedImage}
                      alt="Capture Retouchée"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-950/85 text-emerald-400 border border-emerald-500/40 text-[10px] font-black flex items-center gap-1 backdrop-blur-md">
                      <Check className="w-3 h-3" />
                      <span>Format {aspectRatio === 'SQUARE' ? 'Carré 1:1' : 'Passeport 3:4'}</span>
                    </div>
                  </div>

                  {/* Panneau d'ajustements rapides post-capture */}
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-slate-300 text-xs">
                    <button
                      type="button"
                      title="Diminuer le zoom"
                      onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      type="button"
                      title="Augmenter le zoom"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-4 bg-slate-800 mx-1" />

                    <button
                      type="button"
                      title="Pivoter de 90°"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-indigo-400 transition-all cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-4 bg-slate-800 mx-1" />

                    {/* Sélecteur de filtres */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedFilter('NORMAL')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedFilter === 'NORMAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Naturel
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFilter('STUDIO')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedFilter === 'STUDIO' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFilter('BW')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedFilter === 'BW' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        N&B
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* VUE EN DIRECT (LIVE STREAM WITH OVERLAY HUD) */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-indigo-400">
                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-xs font-bold">Connexion à la WebCam HD en cours...</p>
                  </div>
                )}

                {/* Flux vidéo avec contrôle du miroir (Par défaut scale-x-100 sans inversion) */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isMirrored ? 'transform -scale-x-100' : 'transform scale-x-100'
                  }`}
                />

                {/* BARRE DE CONTRÔLE HUD STUDIO SUR LA VIDÉO */}
                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setIsMirrored(!isMirrored)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        isMirrored ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                      title="Bascule effet miroir (Résout les textes inversés)"
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
                      title="Guide visage ovale officiel"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setGuideMode('GRID')}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        guideMode === 'GRID' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Grille de cadrage studio"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setGuideMode('CORNER')}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        guideMode === 'CORNER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Viseurs d'angles Cyber Studio"
                    >
                      <Frame className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('SQUARE')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                        aspectRatio === 'SQUARE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1:1 Badge
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('PASSPORT')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                        aspectRatio === 'PASSPORT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3:4 Passeport
                    </button>
                  </div>
                </div>

                {/* MASQUES DE GUIDAGE SVG EN RENDER INTERACTIF */}
                {guideMode === 'OVAL' && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <mask id="passport-mask">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <ellipse cx="50" cy="46" rx="26" ry="34" fill="black" />
                      </mask>
                    </defs>
                    <rect x="0" y="0" width="100" height="100" fill="rgba(15, 23, 42, 0.72)" mask="url(#passport-mask)" />
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
                    <line x1="50" y1="20" x2="50" y2="72" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="0.4" strokeDasharray="1,1" />
                  </svg>
                )}

                {guideMode === 'GRID' && (
                  <div className="absolute inset-0 z-10 pointer-events-none border border-indigo-500/30 grid grid-cols-3 grid-rows-3 bg-black/30">
                    <div className="border-r border-b border-indigo-500/20" />
                    <div className="border-r border-b border-indigo-500/20" />
                    <div className="border-b border-indigo-500/20" />
                    <div className="border-r border-b border-indigo-500/20" />
                    <div className="border-r border-b border-indigo-500/30 bg-indigo-500/5 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-indigo-400/40 border-dashed animate-spin" />
                    </div>
                    <div className="border-b border-indigo-500/20" />
                    <div className="border-r border-indigo-500/20" />
                    <div className="border-r border-indigo-500/20" />
                    <div />
                  </div>
                )}

                {guideMode === 'CORNER' && (
                  <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-black/40">
                    <div className="relative w-64 h-64 border border-indigo-500/40">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-indigo-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-indigo-400" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-indigo-400" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-indigo-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tag d'aide en bas de vidéo */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700/60 text-[10.5px] font-bold flex items-center gap-2 backdrop-blur-md shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>Alignez le visage au centre du repère studio</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PIED DE MODALE & BOUTONS D'ACTION */}
        <div className="p-3.5 border-t flex items-center justify-between gap-3 shrink-0" style={{ borderColor: 'var(--border)' }}>
          {/* Sélection de caméra */}
          {devices.length > 1 && !capturedImage ? (
            <div className="w-40 sm:w-56 shrink-0">
              <CustomSelect
                options={deviceOptions}
                value={selectedDeviceId}
                onChange={handleDeviceChange}
              />
            </div>
          ) : (
            <div className="shrink-0" />
          )}

          {/* Boutons d'actions toujours visibles à droite */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={() => setCapturedImage(null)}
                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reprendre</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
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
                  disabled={isLoading || !!error}
                  onClick={handleStartCountdown}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Minuteur (3s)</span>
                  <span className="sm:hidden">3s</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading || !!error}
                  onClick={triggerCapture}
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
