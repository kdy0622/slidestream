
import React, { useState, useRef, useEffect } from 'react';
import { SlideData, SubtitleStyle, GenerationOptions } from '../types';
import { generateTTS } from '../services/geminiService';

interface Props {
  slides: SlideData[];
  options: GenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
  subtitleStyle: SubtitleStyle;
  onPrev: () => void;
}

const VideoExporter: React.FC<Props> = ({ slides, options, setOptions, subtitleStyle, onPrev }) => {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'recording' | 'finished'>('idle');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(null);

  const handleStartGeneration = async () => {
    if (status === 'recording' || status === 'preparing') return;
    
    setStatus('preparing');
    setCurrentProgress(0);
    setVideoUrl(null);
    
    // Initialized AudioContext with 24000Hz sample rate as recommended for Gemini TTS
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = audioContext;

    try {
      const preparedSlides = [...slides];
      for (let i = 0; i < preparedSlides.length; i++) {
        setCurrentProgress(i + 1);
        // Passing the user-selected voiceName to the TTS service
        const { buffer, duration } = await generateTTS(preparedSlides[i].script, audioContext, options.voiceName, options.exportSpeed);
        preparedSlides[i].audioBuffer = buffer;
        preparedSlides[i].duration = duration;
      }
      startRecording(preparedSlides);
    } catch (error: any) {
      console.error(error);
      const isKeyError = error.message === 'API_KEY_INVALID' || error.message === 'API_KEY_MISSING';
      alert(isKeyError ? 'API 키가 유효하지 않거나 설정되지 않았습니다. 관리자에게 문의하세요.' : '비디오 제작 중 오류가 발생했습니다.');
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

    // 자막 위치 하단 밀착 (기존 80 -> 40)
    let y = canvas.height - (40 * scaleFactor);
    if (subtitleStyle.position === 'middle') y = (canvas.height - totalHeight) / 2 + fontSize;
    if (subtitleStyle.position === 'top') y = (40 * scaleFactor) + fontSize;

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r}, ${g}, ${b}`;
    };

    ctx.fillStyle = `rgba(${hexToRgb(subtitleStyle.backgroundColor)}, ${subtitleStyle.backgroundOpacity})`;
    const px = 40 * scaleFactor, py = 15 * scaleFactor;
    const rx = (canvas.width - maxLineWidth) / 2 - px;
    const ry = y - fontSize - py + (fontSize * 0.2);
    const rw = maxLineWidth + px * 2;
    const rh = totalHeight + py * 2 - (fontSize * 0.2);
    const radius = 10 * scaleFactor;
    
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(rx, ry, rw, rh, radius);
    } else {
      ctx.rect(rx, ry, rw, rh);
    }
    ctx.fill();

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

    const [w, h] = options.resolution === '1080p' ? [1920, 1080] : [1280, 720];
    canvas.width = w;
    canvas.height = h;

    setStatus('recording');
    const chunks: Blob[] = [];
    const canvasStream = canvas.captureStream(30);
    const audioDest = audioContextRef.current!.createMediaStreamDestination();
    
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8000000 });
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

        if (options.showSubtitles) {
          const segments = slide.script.split('\n').filter(s => s.trim().length > 0);
          const segmentCount = segments.length;
          
          if (segmentCount > 0) {
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
    };

    let audioDelay = 0;
    preparedSlides.forEach((slide) => {
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = slide.audioBuffer!;
      source.connect(audioDest);
      source.start(audioContextRef.current!.currentTime + audioDelay);
      audioDelay += slide.duration!;
    });

    renderLoop();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b1120] overflow-hidden px-12 py-8">
      <div className="mb-8">
        <button 
          onClick={onPrev}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-sm font-bold mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
          에디터로 돌아가기
        </button>
        <h1 className="text-3xl font-black text-white">검토 및 내보내기</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-grow overflow-hidden">
        <div className="flex-grow flex flex-col min-h-0">
          <div className="relative group bg-[#111827] rounded-xl overflow-hidden border border-white/5 flex flex-col shadow-2xl">
            <div className="h-10 bg-[#1e293b]/60 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <span className="text-[11px] font-bold text-slate-300">최종_영상.webm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${status === 'finished' ? 'bg-green-500/20 text-green-500' : 'bg-slate-700 text-slate-400'}`}>
                  {status === 'finished' ? '준비됨' : status === 'recording' ? '생성중' : '대기중'}
                </span>
              </div>
            </div>

            <div className="aspect-video bg-black relative flex items-center justify-center">
              {status === 'finished' && videoUrl ? (
                <video src={videoUrl} controls className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full relative">
                  <img src={slides[0].image} className="w-full h-full object-contain opacity-40" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                    {status === 'recording' || status === 'preparing' ? (
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <div className="text-white font-black text-xl">{currentProgress} / {slides.length}</div>
                            <div className="text-slate-400 text-xs font-bold mt-2">렌더링 진행 중...</div>
                        </div>
                    ) : (
                        <button 
                            onClick={handleStartGeneration}
                            className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
                        >
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-6 px-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-green-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
               자막 생성됨 ({slides.length} 슬라이드)
            </div>
            <div className={`flex items-center gap-2 text-[11px] font-bold ${options.showSubtitles ? 'text-green-500' : 'text-slate-500'}`}>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
               자막 포함 (Burn-in)
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-80 flex flex-col shrink-0 min-h-0">
          <div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
            <h3 className="text-lg font-black text-white">내보내기 설정</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">해상도</label>
                <select 
                  value={options.resolution}
                  onChange={(e) => setOptions(prev => ({ ...prev, resolution: e.target.value as any }))}
                  className="w-full bg-[#0b1120] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-[#0b1120]/60 p-3 rounded-xl border border-white/5">
                 <div>
                    <div className="text-[11px] font-bold text-white">자막 포함하기</div>
                    <div className="text-[9px] text-slate-500 font-medium">영상에 자막을 직접 입힙니다</div>
                 </div>
                 <button 
                   onClick={() => setOptions(prev => ({ ...prev, showSubtitles: !prev.showSubtitles }))}
                   className={`w-11 h-5 rounded-full transition-all relative flex items-center px-1 ${options.showSubtitles ? 'bg-blue-600' : 'bg-slate-700'}`}
                 >
                   <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${options.showSubtitles ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">재생 속도</label>
                <div className="flex bg-[#0b1120]/80 p-1 rounded-xl border border-white/10">
                   {([0.8, 1.0, 1.2, 1.5]).map(speed => (
                     <button 
                       key={speed}
                       onClick={() => setOptions(prev => ({ ...prev, exportSpeed: speed }))}
                       className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${options.exportSpeed === speed ? 'bg-slate-800 text-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
                     >
                       {speed === 1.0 ? '보통' : speed.toFixed(1) + 'x'}
                     </button>
                   ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] font-bold pt-2">
                 <span className="text-slate-500">포맷</span>
                 <span className="bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-400">WebM</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-[#0b1120]/60 border border-white/5 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">상태</div>
                  <div className="text-xs font-black text-white">{status === 'finished' ? '완료' : status === 'recording' ? '진행중' : '대기중'}</div>
               </div>
               <div className="bg-[#0b1120]/60 border border-white/5 rounded-xl p-3">
                  <div className="text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">슬라이드</div>
                  <div className="text-xs font-black text-white">{slides.length}개</div>
               </div>
            </div>

            <button 
              onClick={handleStartGeneration}
              disabled={status === 'recording' || status === 'preparing'}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              WebM 생성
            </button>
          </div>

          <div className="mt-6 bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 shadow-lg">
             <div className="shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <p className="text-[10px] font-medium text-slate-300 leading-relaxed">
               브라우저에서 비디오가 렌더링되어 .webm 파일로 다운로드됩니다. 슬라이드 수와 선택한 속도에 따라 시간이 걸릴 수 있습니다.
             </p>
          </div>
        </aside>
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoExporter;
