
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const { buffer } = await generateTTS(activeSlide.script, audioCtx);
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
        {/* Left Sidebar: Highly Compact Thumbnails */}
        <aside className="w-40 border-r border-white/5 bg-[#0b1120] flex flex-col overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-2 border-b border-white/5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Slides ({slides.length})</h3>
          </div>
          <div className="p-1.5 space-y-1.5">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveIndex(idx)}
                className={`w-full group rounded-lg overflow-hidden border transition-all ${
                  activeIndex === idx ? 'border-blue-600 ring-2 ring-blue-600/10' : 'border-transparent opacity-50'
                }`}
              >
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  <img src={slide.image} alt="" className="max-h-full max-w-full object-contain" />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center rounded text-[8px] font-black ${
                    activeIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {idx + 1}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Slide Preview Area */}
        <section className="flex-grow bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
          <div className="w-full max-w-3xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-white/5 flex items-center justify-center">
            <img 
              src={activeSlide.image} 
              alt="Active Slide" 
              className="max-h-full max-w-full object-contain" 
            />
          </div>
        </section>

        {/* Right Sidebar: Compact Editor */}
        <aside className="w-80 border-l border-white/5 bg-[#0f172a]/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
            <h2 className="text-sm font-black flex items-center gap-1.5">
              대본 편집
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            </h2>
            <button 
              onClick={handleRewrite}
              disabled={isRewriting}
              className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded text-[9px] font-black transition-all disabled:opacity-50"
            >
              AI 재생성
            </button>
          </div>

          <div className="flex-grow relative p-4">
            <textarea
              value={activeSlide.script}
              onChange={(e) => onUpdate(activeSlide.id, e.target.value)}
              className="w-full h-full bg-transparent text-slate-300 text-xs leading-relaxed focus:outline-none resize-none placeholder:text-slate-800 custom-scrollbar"
              placeholder="대본을 입력하세요..."
            />
          </div>

          <div className="p-4 bg-[#0b1120]/50 border-t border-white/5 flex gap-2 shrink-0">
              <button 
                onClick={handleAudioPreview}
                disabled={isPreviewingAudio}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                미리듣기
              </button>
          </div>
        </aside>
      </div>

      {/* Bottom Compact Footer */}
      <footer className="h-12 border-t border-white/5 bg-[#0b1120] flex items-center justify-between px-6 shrink-0">
        <button 
          onClick={onPrev}
          className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
          이전
        </button>

        <div className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
          Slide <span className="text-blue-500">{activeIndex + 1}</span> / {slides.length}
        </div>

        <button 
          onClick={() => {
            if (activeIndex < slides.length - 1) setActiveIndex(activeIndex + 1);
            else onNext();
          }}
          className="flex items-center gap-1 text-white hover:text-blue-500 transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          {activeIndex < slides.length - 1 ? '다음 슬라이드' : '최종 내보내기'}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
        </button>
      </footer>
    </div>
  );
};

export default ScriptStep;
