import React, { useState, useRef, useEffect } from 'react';
import { SlideData, SubtitleStyle } from '../types';
import { generateTTS } from '../services/geminiService';

interface Props {
  slides: SlideData[];
  subtitleStyle: SubtitleStyle;
  onPrev: () => void;
}

const VideoExporter: React.FC<Props> = ({ slides, subtitleStyle, onPrev }) => {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'recording' | 'finished'>('idle');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    if (status === 'idle') {
      handleStartGeneration();
    }
    return () => {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
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

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const drawSubtitle = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string) => {
    if (!text.trim()) return;

    const scaleFactor = canvas.height / 1080;
    const fontSize = subtitleStyle.fontSize * scaleFactor;
    ctx.font = `bold ${fontSize}px 'Pretendard', sans-serif`;
    
    const maxWidth = canvas.width * 0.85;
    const lines = wrapText(ctx, text, maxWidth);
    
    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    const maxLineWidth = Math.max(...lines.map(l => ctx.measureText(l).width));

    let y = canvas.height - (150 * scaleFactor);
    if (subtitleStyle.position === 'middle') y = (canvas.height - totalHeight) / 2 + fontSize;
    if (subtitleStyle.position === 'top') y = (100 * scaleFactor) + fontSize;

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };

    // Background
    ctx.fillStyle = `rgba(${hexToRgb(subtitleStyle.backgroundColor)}, ${subtitleStyle.backgroundOpacity})`;
    const px = 40 * scaleFactor, py = 25 * scaleFactor;
    const rx = (canvas.width - maxLineWidth) / 2 - px;
    const ry = y - fontSize - py + (fontSize * 0.2);
    const rw = maxLineWidth + px * 2;
    const rh = totalHeight + py * 2 - (fontSize * 0.2);
    const radius = 20 * scaleFactor;
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, radius);
    } else {
      ctx.rect(rx, ry, rw, rh);
    }
    ctx.fill();

    // Text
    ctx.fillStyle = subtitleStyle.textColor;
    ctx.textBaseline = 'bottom';
    lines.forEach((line, i) => {
      const lineW = ctx.measureText(line).width;
      ctx.fillText(line, (canvas.width - lineW) / 2, y + (i * lineHeight));
    });
  };

  const startRecording = (preparedSlides: SlideData[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000 });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setStatus('finished');
    };

    recorder.start();

    let currentSlideIndex = 0;
    let slideStartTime = audioContextRef.current!.currentTime;

    const renderLoop = () => {
      if (currentSlideIndex >= preparedSlides.length) {
        recorder.stop();
        return;
      }

      const slide = preparedSlides[currentSlideIndex];
      const elapsed = audioContextRef.current!.currentTime - slideStartTime;

      // Draw background image
      const img = new Image();
      img.src = slide.image;
      
      const drawFrame = () => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

        // Subtitle Splitting Logic
        const segments = slide.script.split('\n').filter(s => s.trim().length > 0);
        const segmentCount = segments.length;
        
        if (segmentCount > 0) {
            // Calculate which segment to show based on time
            // We use character count to give each segment proportional time
            const totalChars = segments.join('').length;
            let cumulativeTime = 0;
            let currentSegmentText = segments[segmentCount - 1];

            for (let i = 0; i < segmentCount; i++) {
                const segmentWeight = segments[i].length / totalChars;
                const segmentDuration = slide.duration! * segmentWeight;
                if (elapsed <= cumulativeTime + segmentDuration) {
                    currentSegmentText = segments[i];
                    break;
                }
                cumulativeTime += segmentDuration;
            }
            drawSubtitle(ctx, canvas, currentSegmentText);
        }

        if (elapsed >= slide.duration!) {
          currentSlideIndex++;
          slideStartTime = audioContextRef.current!.currentTime;
          setCurrentProgress(currentSlideIndex + 1);
          renderLoop();
        } else {
          requestRef.current = requestAnimationFrame(renderLoop);
        }
      };

      img.onload = drawFrame;
      img.onerror = () => {
          currentSlideIndex++;
          renderLoop();
      };
    };

    // Play all audio buffers sequentially to the destination
    let audioDelay = 0;
    preparedSlides.forEach((slide) => {
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = slide.audioBuffer!;
      source.connect(audioDest);
      // Also connect to speakers so user can hear while recording? (Optional, here we just record)
      source.start(audioContextRef.current!.currentTime + audioDelay);
      audioDelay += slide.duration!;
    });

    renderLoop();
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `SlideStream_Video_${Date.now()}.webm`;
      a.click();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b1120] overflow-hidden">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-[#0b1120]">
        <button 
          onClick={onPrev}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-xs font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
          이전으로 돌아가기
        </button>

        <button 
          onClick={handleDownload}
          disabled={status !== 'finished'}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-black transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 12l5 5 5-5M12 4v12"/></svg>
          비디오 다운로드
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-8 bg-[#0b1120] relative">
        {status === 'finished' && videoUrl ? (
          <div className="w-full max-w-5xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/10">
            <video src={videoUrl} controls className="w-full h-full object-contain" autoPlay />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center grayscale blur-md pointer-events-none">
               <img src={slides[0]?.image} className="max-h-full max-w-full object-contain" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-black mb-2">
                {status === 'preparing' ? 'AI 음성 합성 중...' : '고화질 영상 인코딩 중...'}
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-4">
                브라우저 탭을 닫지 마세요. 배경에서 영상이 제작되고 있습니다.
              </p>
              <div className="text-blue-500 font-black text-2xl">
                {currentProgress} / {slides.length}
              </div>
            </div>
          </div>
        )}
      </main>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoExporter;