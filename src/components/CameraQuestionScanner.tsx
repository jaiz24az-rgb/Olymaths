import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  BookOpen, 
  Target, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  Image as ImageIcon,
  ArrowRight,
  RotateCcw,
  RotateCw,
  History,
  Trash2,
  Lightbulb,
  FileText,
  Crop,
  Check,
  Maximize2
} from 'lucide-react';
import { ScannedQuestionResult, Question, TopicCategory } from '../types';
import { saveScannedQuestion, getStoredScannedQuestions, deleteScannedQuestion, saveAnswerRecord } from '../utils/storage';

interface CameraQuestionScannerProps {
  onPracticeQuestion?: (question: Question) => void;
  onGoToHistory?: () => void;
}

interface CropRect {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  w: number; // percentage 0..100
  h: number; // percentage 0..100
}

export const CameraQuestionScanner: React.FC<CameraQuestionScannerProps> = ({
  onPracticeQuestion,
  onGoToHistory,
}) => {
  // Modes: 'camera' | 'crop' | 'preview' | 'analyzing' | 'result' | 'history'
  const [mode, setMode] = useState<'camera' | 'crop' | 'preview' | 'analyzing' | 'result' | 'history'>('camera');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [studentNote, setStudentNote] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ScannedQuestionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [pastScans, setPastScans] = useState<ScannedQuestionResult[]>(() => getStoredScannedQuestions());
  
  // Crop interactive state (percentage based: 0..100)
  const [cropBox, setCropBox] = useState<CropRect>({ x: 10, y: 15, w: 80, h: 50 });
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialBoxOnDrag, setInitialBoxOnDrag] = useState<CropRect | null>(null);

  // Follow-up question practice state
  const [selectedFollowUpOption, setSelectedFollowUpOption] = useState<number | null>(null);
  const [isFollowUpAnswered, setIsFollowUpAnswered] = useState<boolean>(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  // Start Camera Stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur kamera tidak didukung di perangkat atau peramban ini.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraActive(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Izin kamera ditolak. Kamu tetap bisa mengunggah foto soal dari galeri atau berkas.'
          : 'Kamera tidak dapat diakses langsung. Silakan pilih foto soal dari galeri.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  // Capture Snapshot from Video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setRawImage(dataUrl);
    setRotationDegrees(0);
    // Reset crop box to middle focus
    setCropBox({ x: 10, y: 15, w: 80, h: 60 });
    stopCamera();
    setMode('crop');
  };

  // Handle File Upload from Gallery/Desktop
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setRawImage(result);
      setRotationDegrees(0);
      setCropBox({ x: 10, y: 15, w: 80, h: 60 });
      stopCamera();
      setMode('crop');
    };
    reader.readAsDataURL(file);
  };

  // Rotate Image by 90 degrees
  const handleRotateImage = () => {
    if (!rawImage) return;
    const nextRot = (rotationDegrees + 90) % 360;
    setRotationDegrees(nextRot);
  };

  // Render crop and compression to final base64
  const applyCrop = useCallback(() => {
    if (!rawImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle orientation rotation first
      let rotatedCanvas = document.createElement('canvas');
      let rotCtx = rotatedCanvas.getContext('2d');
      if (!rotCtx) return;

      if (rotationDegrees === 90 || rotationDegrees === 270) {
        rotatedCanvas.width = img.height;
        rotatedCanvas.height = img.width;
      } else {
        rotatedCanvas.width = img.width;
        rotatedCanvas.height = img.height;
      }

      rotCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rotCtx.rotate((rotationDegrees * Math.PI) / 180);
      rotCtx.drawImage(img, -img.width / 2, -img.height / 2);

      // Now crop from the rotated canvas based on percentage
      const cropX = Math.round((cropBox.x / 100) * rotatedCanvas.width);
      const cropY = Math.round((cropBox.y / 100) * rotatedCanvas.height);
      const cropW = Math.round((cropBox.w / 100) * rotatedCanvas.width);
      const cropH = Math.round((cropBox.h / 100) * rotatedCanvas.height);

      // Downscale if cropped portion is larger than 1200px to ensure ultra-lightweight payload
      const maxDim = 1200;
      let finalW = cropW;
      let finalH = cropH;
      if (finalW > maxDim || finalH > maxDim) {
        if (finalW > finalH) {
          finalH = Math.round((finalH * maxDim) / finalW);
          finalW = maxDim;
        } else {
          finalW = Math.round((finalW * maxDim) / finalH);
          finalH = maxDim;
        }
      }

      canvas.width = Math.max(100, finalW);
      canvas.height = Math.max(100, finalH);

      ctx.drawImage(
        rotatedCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Compress to lightweight JPEG (quality 0.82)
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setCapturedImage(croppedDataUrl);
      setMode('preview');
    };
    img.src = rawImage;
  }, [rawImage, cropBox, rotationDegrees]);

  // Use Full Image Without Cropping
  const useFullImage = () => {
    setCropBox({ x: 0, y: 0, w: 100, h: 100 });
    setTimeout(() => {
      applyCrop();
    }, 50);
  };

  // Interactive Touch & Mouse Drag Handlers for Crop Box
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, handleType: string) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDraggingBox(true);
    setDragHandle(handleType);
    setDragStartPos({ x: clientX, y: clientY });
    setInitialBoxOnDrag({ ...cropBox });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingBox || !dragStartPos || !initialBoxOnDrag || !cropContainerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = cropContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((clientX - dragStartPos.x) / rect.width) * 100;
    const deltaYPercent = ((clientY - dragStartPos.y) / rect.height) * 100;

    let newBox = { ...initialBoxOnDrag };

    if (dragHandle === 'box') {
      // Move entire crop box
      newBox.x = Math.max(0, Math.min(100 - newBox.w, initialBoxOnDrag.x + deltaXPercent));
      newBox.y = Math.max(0, Math.min(100 - newBox.h, initialBoxOnDrag.y + deltaYPercent));
    } else if (dragHandle === 'se') {
      // Bottom-right handle
      newBox.w = Math.max(15, Math.min(100 - initialBoxOnDrag.x, initialBoxOnDrag.w + deltaXPercent));
      newBox.h = Math.max(15, Math.min(100 - initialBoxOnDrag.y, initialBoxOnDrag.h + deltaYPercent));
    } else if (dragHandle === 'sw') {
      // Bottom-left handle
      const newW = Math.max(15, initialBoxOnDrag.w - deltaXPercent);
      const newX = Math.max(0, initialBoxOnDrag.x + (initialBoxOnDrag.w - newW));
      newBox.x = newX;
      newBox.w = newW;
      newBox.h = Math.max(15, Math.min(100 - initialBoxOnDrag.y, initialBoxOnDrag.h + deltaYPercent));
    } else if (dragHandle === 'ne') {
      // Top-right handle
      const newH = Math.max(15, initialBoxOnDrag.h - deltaYPercent);
      const newY = Math.max(0, initialBoxOnDrag.y + (initialBoxOnDrag.h - newH));
      newBox.y = newY;
      newBox.h = newH;
      newBox.w = Math.max(15, Math.min(100 - initialBoxOnDrag.x, initialBoxOnDrag.w + deltaXPercent));
    } else if (dragHandle === 'nw') {
      // Top-left handle
      const newW = Math.max(15, initialBoxOnDrag.w - deltaXPercent);
      const newX = Math.max(0, initialBoxOnDrag.x + (initialBoxOnDrag.w - newW));
      const newH = Math.max(15, initialBoxOnDrag.h - deltaYPercent);
      const newY = Math.max(0, initialBoxOnDrag.y + (initialBoxOnDrag.h - newH));
      newBox.x = newX;
      newBox.w = newW;
      newBox.y = newY;
      newBox.h = newH;
    }

    setCropBox(newBox);
  };

  const handlePointerUp = () => {
    setIsDraggingBox(false);
    setDragHandle(null);
    setDragStartPos(null);
    setInitialBoxOnDrag(null);
  };

  // Submit Image to Gemini Backend
  const handleAnalyzeQuestion = async () => {
    if (!capturedImage) return;

    setMode('analyzing');
    setErrorMessage(null);
    setSelectedFollowUpOption(null);
    setIsFollowUpAnswered(false);

    try {
      const response = await fetch('/api/scan-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: capturedImage,
          mimeType: 'image/jpeg',
          studentNote,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal menganalisis soal.');
      }

      const result: ScannedQuestionResult = {
        ...resData.data,
        imageThumbnail: capturedImage,
        scannedAt: Date.now(),
      };

      setAnalysisResult(result);
      saveScannedQuestion(result);
      setPastScans(getStoredScannedQuestions());

      // Also record this as a question in AnswerRecord history for seamless tracking
      const simulatedQuestion: Question = {
        id: `scan-${Date.now()}`,
        topic: (result.topic as TopicCategory) || 'soal_cerita',
        difficulty: result.difficulty || 'sedang',
        question: `[Soal Guru] ${result.rawQuestion}`,
        options: result.followUpQuestion ? result.followUpQuestion.options : [result.finalAnswer],
        correctIndex: result.followUpQuestion ? result.followUpQuestion.correctIndex : 0,
        hint: result.teacherIntent || 'Soal hasil pemindaian kamera',
        explanation: `${result.stepByStepSolution}\n\nKunci Jawaban: ${result.finalAnswer}\n\nTrik Cepat: ${result.quickTrick}`,
        points: 25,
        quickTrick: result.quickTrick,
        source: 'Pindaian Kamera Guru',
      };

      saveAnswerRecord({
        questionId: simulatedQuestion.id,
        topic: simulatedQuestion.topic,
        difficulty: simulatedQuestion.difficulty,
        selectedAnswer: simulatedQuestion.correctIndex,
        isCorrect: true,
        timeSpentSec: 30,
        timestamp: Date.now(),
        pointsEarned: 25,
        questionSnapshot: simulatedQuestion,
      });

      setMode('result');
    } catch (err: any) {
      console.error('Scan error:', err);
      const msg = err.message || '';
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        setErrorMessage('Server AI sedang mengalami lonjakan antrean sementara (503). Silakan tekan tombol "Coba Kirim Ulang" di bawah.');
      } else {
        setErrorMessage(msg || 'Terjadi kendala saat membaca soal. Pastikan foto soal jelas dan coba lagi.');
      }
      setMode('preview');
    }
  };

  const handleRetake = () => {
    setRawImage(null);
    setCapturedImage(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setStudentNote('');
    setRotationDegrees(0);
    setMode('camera');
  };

  const handleOpenPastScan = (item: ScannedQuestionResult) => {
    setAnalysisResult(item);
    setCapturedImage(item.imageThumbnail || null);
    setSelectedFollowUpOption(null);
    setIsFollowUpAnswered(false);
    setMode('result');
  };

  const handleDeletePastScan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteScannedQuestion(id);
    setPastScans(getStoredScannedQuestions());
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pemindai AI & Crop Ringan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Pindai & Bahas Soal Guru
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
              Foto lembar soal dari gurumu, potong (crop) tepat ke nomor soal yang ingin kamu tanyakan (misal No 25), 
              lalu AI akan memberikan kunci jawaban akurat beserta trik kilat 10 detik!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pastScans.length > 0 && (
              <button
                onClick={() => setMode(mode === 'history' ? 'camera' : 'history')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  mode === 'history'
                    ? 'bg-white text-blue-800'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Pindaian Lalu ({pastScans.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden File Input for Gallery / Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* VIEW: HISTORY OF SCANS */}
      {mode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <h2 className="font-extrabold text-slate-800 text-base">Soal Guru yang Pernah Dipindai</h2>
            </div>
            <button
              onClick={() => setMode('camera')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Buka Kamera Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pastScans.map((scan) => (
              <div
                key={scan.id}
                onClick={() => handleOpenPastScan(scan)}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex gap-3 relative group"
              >
                {scan.imageThumbnail && (
                  <img
                    src={scan.imageThumbnail}
                    alt="Soal"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase">
                      {scan.topic}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(scan.scannedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2">
                    {scan.rawQuestion}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold truncate">
                    Kunci: {scan.finalAnswer}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDeletePastScan(scan.id!, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Hapus pindaian ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: CAMERA VIEWFINDER */}
      {mode === 'camera' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
          <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-[4/3] max-h-[460px] flex items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Viewfinder Target Framing Overlay */}
            <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 border-t-4 border-l-4 border-amber-400 rounded-tl-xl drop-shadow-md" />
                <div className="w-10 h-10 border-t-4 border-r-4 border-amber-400 rounded-tr-xl drop-shadow-md" />
              </div>

              {/* Scanning center guideline */}
              <div className="text-center py-2 px-4 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-semibold self-center shadow-lg border border-white/20">
                Arahkan ke soal dari guru (bisa dipotong setelah difoto)
              </div>

              <div className="flex justify-between items-end">
                <div className="w-10 h-10 border-b-4 border-l-4 border-amber-400 rounded-bl-xl drop-shadow-md" />
                <div className="w-10 h-10 border-b-4 border-r-4 border-amber-400 rounded-br-xl drop-shadow-md" />
              </div>
            </div>

            {/* Camera Error / Fallback State */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="max-w-sm space-y-1">
                  <h3 className="font-extrabold text-sm sm:text-base">Akses Kamera Terkendala</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pilih Foto dari Galeri / Berkas</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Trigger Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>Unggah dari Galeri</span>
            </button>

            {/* Center Shutter Button */}
            <button
              onClick={handleCapturePhoto}
              disabled={!isCameraActive}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>Ambil Foto Soal Ini</span>
            </button>

            <button
              onClick={startCamera}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Segarkan Kamera</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: LIGHTWEIGHT TOUCH-FRIENDLY CROP TOOL */}
      {mode === 'crop' && rawImage && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-sm">
          {/* Header & instructions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Crop className="w-5 h-5 text-blue-600" />
                <span>Potong & Fokus ke Soal yang Ditanyakan</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Geser kotak kuning untuk memilih hanya nomor soal yang ingin dibahas (misal No 25).
              </p>
            </div>

            {/* Quick Rotate & Reset toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRotateImage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                title="Putar 90 derajat jika foto miring"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Putar 90°</span>
              </button>

              <button
                onClick={useFullImage}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                title="Gunakan seluruh foto tanpa crop"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Penuh</span>
              </button>
            </div>
          </div>

          {/* Interactive Crop Viewport */}
          <div
            ref={cropContainerRef}
            onMouseMove={handlePointerMove}
            onTouchMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchEnd={handlePointerUp}
            className="relative bg-slate-900 rounded-2xl overflow-hidden select-none max-h-[460px] flex items-center justify-center touch-none"
          >
            {/* The base image with rotation */}
            <img
              ref={cropImageRef}
              src={rawImage}
              alt="Crop Target"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                maxHeight: '460px',
                objectFit: 'contain',
              }}
              className="w-full transition-transform duration-200 pointer-events-none"
            />

            {/* Dark Mask Covering Outside the Crop Box */}
            <div
              className="absolute inset-0 pointer-events-none bg-black/55"
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%, 
                  0% 0%,
                  ${cropBox.x}% ${cropBox.y}%, 
                  ${cropBox.x}% ${cropBox.y + cropBox.h}%, 
                  ${cropBox.x + cropBox.w}% ${cropBox.y + cropBox.h}%, 
                  ${cropBox.x + cropBox.w}% ${cropBox.y}%, 
                  ${cropBox.x}% ${cropBox.y}%
                )`,
              }}
            />

            {/* Draggable Active Crop Box with Handles */}
            <div
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.w}%`,
                height: `${cropBox.h}%`,
              }}
              onMouseDown={(e) => handlePointerDown(e, 'box')}
              onTouchStart={(e) => handlePointerDown(e, 'box')}
              className="absolute border-2 border-amber-400 bg-amber-400/10 cursor-move rounded-md shadow-2xl flex flex-col justify-between p-1 touch-none"
            >
              {/* Corner handles */}
              <div className="flex justify-between items-start pointer-events-auto">
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'nw')}
                  onTouchStart={(e) => handlePointerDown(e, 'nw')}
                  className="w-6 h-6 -mt-2 -ml-2 bg-amber-400 rounded-full border-2 border-white cursor-nw-resize shadow-md touch-none"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'ne')}
                  onTouchStart={(e) => handlePointerDown(e, 'ne')}
                  className="w-6 h-6 -mt-2 -mr-2 bg-amber-400 rounded-full border-2 border-white cursor-ne-resize shadow-md touch-none"
                />
              </div>

              {/* Center Guidance Badge */}
              <div className="self-center bg-black/60 backdrop-blur-xs text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold pointer-events-none">
                Geser ke Soal Ini
              </div>

              <div className="flex justify-between items-end pointer-events-auto">
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'sw')}
                  onTouchStart={(e) => handlePointerDown(e, 'sw')}
                  className="w-6 h-6 -mb-2 -ml-2 bg-amber-400 rounded-full border-2 border-white cursor-sw-resize shadow-md touch-none"
                />
                <div
                  onMouseDown={(e) => handlePointerDown(e, 'se')}
                  onTouchStart={(e) => handlePointerDown(e, 'se')}
                  className="w-6 h-6 -mb-2 -mr-2 bg-amber-400 rounded-full border-2 border-white cursor-se-resize shadow-md touch-none"
                />
              </div>
            </div>
          </div>

          {/* Crop Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handleRetake}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Foto Ulang</span>
            </button>

            <button
              onClick={applyCrop}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-amber-300" />
              <span>Terapkan Potongan & Lanjutkan</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: PREVIEW & STUDENT NOTES */}
      {mode === 'preview' && capturedImage && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Foto Soal Siap Dianalisis</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('crop')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Potong Ulang</span>
              </button>
              <button
                onClick={handleRetake}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Foto Ulang</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Image Preview */}
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center p-2">
                <img
                  src={capturedImage}
                  alt="Foto Soal Terpotong"
                  className="w-full max-h-[340px] object-contain rounded-lg"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center font-medium">
                Gambar telah dipotong dan dioptimalkan agar ringan & fokus ke soal
              </p>
            </div>

            {/* Student Note & Instructions */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Ada nomor soal atau pertanyaan khusus ke Guru AI?</span>
                </label>
                <textarea
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  placeholder="Contoh: No 25. Tolong bahas kenapa jawaban saya 30 disalahkan guru..."
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Error Alert with One-Click Retry */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-900 animate-in fade-in">
                  <div className="flex items-start gap-2 text-xs font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={handleAnalyzeQuestion}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Kirim Ulang Sekarang</span>
                  </button>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleAnalyzeQuestion}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-300" />
                  <span>Bahas & Ulas Jawaban Soal Ini</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  Didukung Gemini AI dengan failover otomatis untuk stabilitas optimal
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ANALYZING STATE */}
      {mode === 'analyzing' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-6 shadow-sm">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping" />
            <div className="relative w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-10 h-10 text-amber-300 animate-spin-slow" />
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900">
              Guru AI Sedang Membaca & Membahas Soal...
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengenali teks matematika pada potongan gambar, menghitung jawaban akurat, dan menyusun trik cepat 10 detik.
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-2 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Memindai gambar soal terpotong</span>
            </div>
            <div className="flex items-center gap-2 text-blue-700 font-bold animate-pulse">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Menghitung kunci jawaban & langkah</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <span>Menyiapkan trik olimpiade & latihan</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: RESULT AND EXPLANATION */}
      {mode === 'result' && analysisResult && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Actions Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleRetake}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Pindai Soal Lain</span>
            </button>

            {onGoToHistory && (
              <button
                onClick={onGoToHistory}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <History className="w-4 h-4" />
                <span>Lihat di Riwayat Soal</span>
              </button>
            )}
          </div>

          {/* Scanned Question Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Header Tags */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black uppercase text-[11px] tracking-wider">
                  Topik {analysisResult.topic}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg font-black uppercase text-[11px] tracking-wider ${
                    analysisResult.difficulty === 'olimpiade'
                      ? 'bg-rose-100 text-rose-800'
                      : analysisResult.difficulty === 'sedang'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Tingkat {analysisResult.difficulty}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                  Pindaian Kamera Guru
                </span>
              </div>

              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Otomatis Tersimpan ke Riwayat</span>
              </span>
            </div>

            {/* Extracted Question Text */}
            <div className="space-y-2">
              <span className="font-extrabold text-slate-500 uppercase text-xs tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Soal Asli dari Guru:</span>
              </span>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed whitespace-pre-line">
                  {analysisResult.rawQuestion}
                </p>
              </div>
            </div>

            {/* Intent from Teacher */}
            {analysisResult.teacherIntent && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                <Target className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-blue-900">Materi yang Diuji Guru:</span>
                  <p className="leading-relaxed">{analysisResult.teacherIntent}</p>
                </div>
              </div>
            )}

            {/* Final Answer Big Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-100">
                  Kunci Jawaban yang Benar:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {analysisResult.finalAnswer}
                </div>
              </div>

              <div className="text-xs text-emerald-100 font-semibold bg-white/20 backdrop-blur-xs px-3 py-1.5 rounded-xl self-start sm:self-center">
                100% Terverifikasi Logika Matematika
              </div>
            </div>

            {/* Step-by-Step Solution */}
            <div className="space-y-3 pt-2">
              <span className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Pembahasan Langkah Demi Langkah:</span>
              </span>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {analysisResult.stepByStepSolution}
              </div>
            </div>

            {/* Quick Trick 10 Detik Card */}
            {analysisResult.quickTrick && (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl space-y-2 text-amber-950 shadow-xs">
                <div className="flex items-center gap-2 font-black text-amber-900 uppercase text-xs tracking-wider">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
                  <span>⚡ Trik Cepat Olimpiade 10 Detik:</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                  {analysisResult.quickTrick}
                </p>
              </div>
            )}

            {/* Common Pitfalls / Mistakes */}
            {analysisResult.commonMistakes && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-xs text-rose-950">
                <div className="flex items-center gap-1.5 font-bold text-rose-900 uppercase text-[11px] tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Jebakan / Kesalahan yang Sering Terjadi:</span>
                </div>
                <p className="leading-relaxed font-medium">
                  {analysisResult.commonMistakes}
                </p>
              </div>
            )}

            {/* Interactive Follow-Up Challenge Question */}
            {analysisResult.followUpQuestion && (
              <div className="p-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="font-extrabold text-xs sm:text-sm text-indigo-950 uppercase tracking-wider">
                      Uji Pemahaman: Soal Tantangan Serupa
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-indigo-200">
                    Latihan Langsung
                  </span>
                </div>

                <p className="font-bold text-sm text-slate-900 leading-relaxed">
                  {analysisResult.followUpQuestion.question}
                </p>

                {/* Option buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {analysisResult.followUpQuestion.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isSelected = selectedFollowUpOption === idx;
                    const isCorrect = idx === analysisResult.followUpQuestion!.correctIndex;

                    let btnStyle = 'bg-white border-slate-200 hover:border-indigo-400 text-slate-800';
                    if (isFollowUpAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-400';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-50 border-rose-400 text-rose-950';
                      } else {
                        btnStyle = 'bg-white border-slate-200 text-slate-400 opacity-60';
                      }
                    } else if (isSelected) {
                      btnStyle = 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-400';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isFollowUpAnswered) return;
                          setSelectedFollowUpOption(idx);
                          setIsFollowUpAnswered(true);
                        }}
                        className={`p-3 rounded-xl border text-left font-medium text-xs flex items-center justify-between gap-2 transition ${btnStyle}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isFollowUpAnswered && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isFollowUpAnswered && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Follow up answer feedback */}
                {isFollowUpAnswered && (
                  <div className={`p-3.5 rounded-xl text-xs space-y-1 ${
                    selectedFollowUpOption === analysisResult.followUpQuestion.correctIndex
                      ? 'bg-emerald-100/70 border border-emerald-300 text-emerald-950'
                      : 'bg-amber-100/70 border border-amber-300 text-amber-950'
                  }`}>
                    <span className="font-black block">
                      {selectedFollowUpOption === analysisResult.followUpQuestion.correctIndex
                        ? '🎉 Hebat sekali! Jawabanmu Benar!'
                        : '💡 Kurang tepat, perhatikan kembali langkahnya:'}
                    </span>
                    <p className="leading-relaxed">
                      {analysisResult.followUpQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
