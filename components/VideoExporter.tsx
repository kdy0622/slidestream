
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
  const [resolution, setResolution] = useState<Resolution>('1080p');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
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

    // Set resolution
    if (resolution === '1080p') {
        canvas.width = 1920;
        canvas.height = 1080;
    } else {
        canvas.width = 1280;
        canvas.height = 720;
    }

    setStatus('recording');
    const chunks: Blob[] = [];
    const canvasStream = canvas.captureStream(30);
    const audioDest = audioContextRef.current!.createMediaStreamDestination();
    
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks()
    ]);

    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
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

      const slide = preparedSlides[currentSlideIndex];
      const img = new Image();
      img.src = slide.image;
      img.onload = () => {
        // Draw image keeping aspect ratio or covering the set resolution
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

        // Draw Subtitle
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
    };

    renderFrame();
  };

  const drawSubtitle = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, text: string) => {
    // Scale font size based on resolution (reference is 1080p)
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
    const paddingX = 40 * scaleFactor;
    const paddingY = 20 * scaleFactor;
    ctx.beginPath();
    ctx.roundRect(x - paddingX, y - textHeight/2 - paddingY, textWidth + paddingX * 2, textHeight + paddingY * 2, 12 * scaleFactor);
    ctx.fill();

    ctx.fillStyle = subtitleStyle.textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'SlideCaster_Final.webm';
      a.click();
    }
  };

  if (status === 'preparing' || status === 'recording') {
    return (
      <div className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-[#0b1120]">
        <div className="relative mb-8">
            <div className="w-24 h-24 border-[6px] border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 w-24 h-24 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-2xl font-black mb-3">
            {status === 'preparing' ? '오디오 생성 중...' : '비디오 인코딩 중...'}
        </h3>
        <p className="text-slate-400 font-medium mb-1">
            슬라이드 {slides.length}장에 대한 {status === 'preparing' ? '음성을 합성하고' : '영상을 제작하고'} 있습니다
        </p>
        <div className="text-blue-500 font-bold text-lg mt-2">
            {currentProgress} / {slides.length}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl px-8 py-12 flex flex-col bg-[#0b1120] overflow-hidden">
      <div className="mb-10">
        <button 
          onClick={onPrev}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          에디터로 돌아가기
        </button>
        <h2 className="text-4xl font-black">검토 및 내보내기</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Left: Video Preview */}
        <div className="flex-grow flex flex-col gap-4">
            <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-bold px-2">
                    <div className="flex items-center gap-2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                        최종_영상.webm
                    </div>
                    <div className="bg-green-500/10 text-green-500 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest">준비됨</div>
                </div>

                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-white/5 group">
                    {status === 'finished' && videoUrl ? (
                        <video src={videoUrl} controls className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center relative">
                            <img src={slides[0].image} className="w-full h-full object-contain opacity-40" />
                            <div 
                                onClick={handleStartGeneration}
                                className="absolute inset-0 flex items-center justify-center cursor-pointer group/play"
                            >
                                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl group-hover/play:scale-110 transition-transform shadow-blue-600/40">
                                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-6 mt-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        자막 생성됨 ({slides.length} 슬라이드)
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        자막 포함 (Burn-in)
                    </div>
                </div>
            </div>
        </div>

        {/* Right: Settings Panel */}
        <aside className="lg:w-[380px] flex flex-col gap-6">
            <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5 space-y-8">
                <h3 className="text-lg font-bold">내보내기 설정</h3>
                
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">해상도</label>
                    <div className="relative">
                        <select 
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value as Resolution)}
                            className="w-full bg-[#1e293b] border border-white/10 text-white px-5 py-3.5 rounded-xl appearance-none text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="1080p">1080p (Full HD)</option>
                            <option value="720p">720p (HD)</option>
                        </select>
                        <svg className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">고해상도는 인코딩 시간이 더 오래 걸릴 수 있습니다.</p>
                </div>

                <div className="flex justify-between items-center py-4 border-y border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">포맷</span>
                    <span className="text-xs font-black text-white">WebM</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1e293b]/50 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">상태</div>
                        <div className="text-sm font-bold text-white">{status === 'finished' ? '완료' : '대기중'}</div>
                    </div>
                    <div className="bg-[#1e293b]/50 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">슬라이드</div>
                        <div className="text-sm font-bold text-white">{slides.length}개</div>
                    </div>
                </div>

                <button 
                    onClick={status === 'finished' ? handleDownload : handleStartGeneration}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/20 transition-all active:scale-95"
                >
                    {status === 'finished' ? (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            WebM 다운로드
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            WebM 생성
                        </>
                    )}
                </button>
            </div>

            <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-600/20 flex gap-4">
                <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                    브라우저에서 비디오가 렌더링되어 .webm 파일로 다운로드됩니다. 슬라이드 수에 따라 시간이 걸릴 수 있습니다.
                </p>
            </div>
        </aside>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoExporter;
