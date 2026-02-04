
import React, { useState, useRef, useEffect } from 'react';
import { SlideData, SubtitleStyle } from '../types';
import { generateTTS } from '../services/geminiService';

interface Props {
  slides: SlideData[];
  subtitleStyle: SubtitleStyle;
  onPrev: () => void;
}

type Resolution = '1080p' | '720p';

const VideoExporter: React.FC<Props> = ({ slides, subtitleStyle, onPrev }) => {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'recording' | 'finished'>('idle');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Automatically start generation when reaching this step if idle
    if (status === 'idle') {
      handleStartGeneration();
    }
    return () => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
    };
  }, []);

  const handleStartGeneration = async () => {
    setStatus('preparing');
    setCurrentProgress(0);
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    try {
      const preparedSlides = [...slides];
      for (let i = 0; i < preparedSlides.length; i++) {
        setCurrentProgress(i + 1);
        const { buffer, duration } = await generateTTS(preparedSlides[i].script, audioContext);
        preparedSlides[i].audioBuffer = buffer;
        preparedSlides[i].duration = duration;
      }
      startRecording(preparedSlides);
    } catch (error) {
      console.error(error);
      alert('비디오 제작 중 오류가 발생했습니다.');
      setStatus('idle');
    }
  };

  const startRecording = (preparedSlides: SlideData[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed 1080p for high quality
    canvas.width = 1920;
    canvas.height = 1080;

    setStatus('recording');
    const chunks: Blob[] = [];
    const canvasStream = canvas.captureStream(30);
    const audioDest = audioContextRef.current!.createMediaStreamDestination();
    
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks()
    ]);

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setStatus('finished');
    };

    recorder.start();

    let currentSlideIndex = 0;
    const renderFrame = () => {
      if (currentSlideIndex >= preparedSlides.length) {
        recorder.stop();
        return;
      }

      setCurrentProgress(currentSlideIndex + 1);
      const slide = preparedSlides[currentSlideIndex];
      const img = new Image();
      img.src = slide.image;
      img.onload = () => {
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

        drawSubtitle(ctx, canvas, slide.script);

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = slide.audioBuffer!;
        source.connect(audioDest);
        source.start();

        source.onended = () => {
          currentSlideIndex++;
          renderFrame();
        };
      };
      img.onerror = () => {
        currentSlideIndex++;
        renderFrame();
      };
    };

    renderFrame();
  };

  const drawSubtitle = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string) => {
    const scaleFactor = canvas.height / 1080;
    let fontSize = subtitleStyle.fontSize * scaleFactor;
    ctx.font = `bold ${fontSize}px 'Pretendard'`;
    
    const maxWidth = canvas.width * 0.9;
    while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px 'Pretendard'`;
    }

    const textWidth = ctx.measureText(text).width;
    const textHeight = fontSize;
    const x = (canvas.width - textWidth) / 2;
    let y = canvas.height - (100 * scaleFactor);
    if (subtitleStyle.position === 'middle') y = canvas.height / 2;
    if (subtitleStyle.position === 'top') y = 100 * scaleFactor;

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };

    ctx.fillStyle = `rgba(${hexToRgb(subtitleStyle.backgroundColor)}, ${subtitleStyle.backgroundOpacity})`;
    const px = 40 * scaleFactor, py = 20 * scaleFactor;
    const rx = x - px, ry = y - textHeight/2 - py, rw = textWidth + px*2, rh = textHeight + py*2, radius = 12 * scaleFactor;
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, radius);
    } else {
      ctx.moveTo(rx + radius, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, radius);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, radius);
      ctx.arcTo(rx, ry + rh, rx, ry, radius);
      ctx.arcTo(rx, ry, rx + rw, ry, radius);
      ctx.closePath();
    }
    ctx.fill();

    ctx.fillStyle = subtitleStyle.textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `SlideCaster_Final.webm`;
      a.click();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b1120] overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-[#0b1120]">
        <button 
          onClick={onPrev}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-xs font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
          이전 비디오 미리보기
        </button>

        <button 
          onClick={handleDownload}
          disabled={status !== 'finished'}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-black transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4"/></svg>
          WebM 내보내기
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-8 bg-[#0b1120] relative">
        {status === 'finished' && videoUrl ? (
          <div className="w-full max-w-5xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/10">
            <video src={videoUrl} controls className="w-full h-full object-contain" autoPlay />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            {/* Background current slide for context */}
            <div className="absolute inset-0 opacity-10 flex items-center justify-center grayscale blur-md pointer-events-none">
               <img src={slides[0].image} className="max-h-full max-w-full object-contain" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-black mb-2">
                {status === 'preparing' ? '오디오 생성 중...' : '비디오 인코딩 중...'}
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-4">
                슬라이드 {slides.length}장에 대한 음성을 합성하고 있습니다
              </p>
              <div className="text-blue-500 font-black text-2xl">
                {currentProgress} / {slides.length}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoExporter;
