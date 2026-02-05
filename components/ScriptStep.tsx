
import React, { useState } from 'react';
import { SlideData, GenerationOptions } from '../types';
import { generateScript, generateTTS } from '../services/geminiService';

interface Props {
  slides: SlideData[];
  options: GenerationOptions;
  onUpdate: (id: string, script: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const ScriptStep: React.FC<Props> = ({ slides, options, onUpdate, onPrev, onNext }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);

  const activeSlide = slides[activeIndex];

  const handleRewrite = async () => {
    if (isRewriting) return;
    try {
      setIsRewriting(true);
      const newScript = await generateScript(activeSlide.image, options.audience, options.length);
      onUpdate(activeSlide.id, newScript);
    } catch (error) {
      alert('대본 재생성에 실패했습니다.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleAudioPreview = async () => {
    if (isPreviewingAudio) return;
    try {
      setIsPreviewingAudio(true);
      // Initialized AudioContext with explicit sampleRate for Gemini PCM audio
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      // Passing user-selected voiceName for the audio preview
      const { buffer } = await generateTTS(activeSlide.script, audioCtx, options.voiceName);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
      source.onended = () => setIsPreviewingAudio(false);
    } catch (error) {
      alert('오디오 생성 중 오류가 발생했습니다.');
      setIsPreviewingAudio(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b1120] overflow-hidden">
      <div className="flex-grow flex overflow-hidden">
        {/* Left Sidebar: Thumbnails */}
        <aside className="w-48 border-r border-white/5 bg-[#0b1120] flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-3 border-b border-white/5">
            <h3 className="text-xs font-bold text-slate-400">슬라이드 ({slides.length})</h3>
          </div>
          <div className="p-2 space-y-3">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveIndex(idx)}
                className={`w-full group rounded-lg overflow-hidden border-2 transition-all ${
                  activeIndex === idx ? 'border-blue-600 ring-4 ring-blue-600/10' : 'border-transparent'
                }`}
              >
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  <img src={slide.image} alt="" className="max-h-full max-w-full object-contain" />
                  <div className={`absolute top-1 left-1 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${
                    activeIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </div>
                </div>
                <div className="p-1.5 bg-slate-900/50 text-left">
                  <p className="text-[10px] font-bold text-slate-500 truncate">슬라이드 {idx + 1}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Slide Preview */}
        <section className="flex-grow bg-[#0f172a] flex items-center justify-center p-8 relative">
          <div className="w-full max-w-4xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/5 flex items-center justify-center">
            <img 
              src={activeSlide.image} 
              alt="Active Slide" 
              className="max-h-full max-w-full object-contain" 
            />
          </div>
        </section>

        {/* Right Sidebar: Script Editor */}
        <aside className="w-96 border-l border-white/5 bg-[#0b1120] flex flex-col shrink-0">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0b1120]">
            <h2 className="text-sm font-bold flex items-center gap-2">
              내레이션 대본
              <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 자동저장
              </span>
            </h2>
            <button 
              onClick={handleRewrite}
              disabled={isRewriting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              AI 다시 쓰기
            </button>
          </div>

          <div className="p-3 bg-blue-600/5 border-b border-blue-500/10">
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Tip: 엔터(Enter)를 치면 자막이 나누어집니다.</p>
          </div>

          <div className="flex-grow relative p-6 bg-[#0b1120]">
            <textarea
              value={activeSlide.script}
              onChange={(e) => onUpdate(activeSlide.id, e.target.value)}
              className="w-full h-full bg-transparent text-slate-300 text-sm leading-relaxed focus:outline-none resize-none placeholder:text-slate-800 custom-scrollbar"
              placeholder="슬라이드에 대한 설명을 입력하세요..."
            />
          </div>
        </aside>
      </div>

      {/* Footer Navigation */}
      <footer className="h-16 border-t border-white/5 bg-[#0b1120] flex items-center justify-between px-6 shrink-0">
        <button 
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-all text-sm font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
          이전 단계
        </button>

        <div className="text-slate-500 text-xs font-bold">
          {activeIndex + 1} / {slides.length} SLIDES
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleAudioPreview}
            disabled={isPreviewingAudio}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
            음성 들어보기
          </button>
          <button 
            onClick={onNext}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-black shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            영상 제작 시작
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ScriptStep;
