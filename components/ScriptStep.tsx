
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
    <div className="w-full h-[calc(100vh-64px)] flex flex-col bg-[#0b1120] overflow-hidden">
      <div className="flex-grow flex overflow-hidden">
        {/* Left Sidebar: Slide Thumbnails */}
        <aside className="w-64 border-r border-white/5 bg-[#0b1120] flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">슬라이드 ({slides.length})</h3>
          </div>
          <div className="p-2 space-y-2">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setActiveIndex(idx)}
                className={`w-full group rounded-xl overflow-hidden border-2 transition-all relative ${
                  activeIndex === idx ? 'border-blue-600 ring-4 ring-blue-600/10' : 'border-transparent opacity-60 hover:opacity-100'
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
                <div className="p-2 bg-slate-900/50 text-left">
                   <div className="text-[10px] font-bold truncate text-slate-400">슬라이드 {idx + 1}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Center: Large Preview Area */}
        <section className="flex-grow bg-[#0f172a] flex items-center justify-center p-12 relative overflow-hidden">
          <div className="w-full max-w-4xl aspect-video bg-black rounded-lg shadow-2xl overflow-hidden border border-white/5 flex items-center justify-center group">
            <img 
              src={activeSlide.image} 
              alt="Active Slide" 
              className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
            />
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20 bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,transparent_70%)]"></div>
        </section>

        {/* Right Sidebar: Editor */}
        <aside className="w-[450px] border-l border-white/5 bg-[#0f172a]/50 flex flex-col">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              내레이션 대본
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">저장됨</span>
          </div>

          <div className="p-4 bg-slate-900/30 flex items-center gap-2 border-b border-white/5">
            <button className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10.27 6.75h2.51c.85 0 1.54.69 1.54 1.54s-.69 1.54-1.54 1.54h-2.51V6.75zm3.27 8.5H10.27v-3.25h3.27c.85 0 1.54.69 1.54 1.54s-.69 1.71-1.54 1.71z"/></svg></button>
            <button className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg></button>
            <div className="flex-grow"></div>
            <button 
              onClick={handleRewrite}
              disabled={isRewriting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isRewriting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              다시 쓰기
            </button>
          </div>

          <div className="flex-grow relative p-6">
            <textarea
              value={activeSlide.script}
              onChange={(e) => onUpdate(activeSlide.id, e.target.value)}
              className="w-full h-full bg-transparent text-slate-300 text-sm leading-relaxed focus:outline-none resize-none placeholder:text-slate-800"
              placeholder="대본을 입력하세요..."
            />
          </div>

          <div className="p-6 bg-[#0b1120]/50 border-t border-white/5 space-y-4">
            <div className="flex gap-3">
              <button 
                onClick={handleAudioPreview}
                disabled={isPreviewingAudio}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.982 5.982 0 0115 10a5.982 5.982 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.982 3.982 0 0013 10a3.982 3.982 0 00-1.172-2.828a1 1 0 010-1.415z" fillRule="evenodd" clipRule="evenodd"/></svg>
                오디오 미리듣기
              </button>
              <button 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                비디오 미리보기
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Control Bar */}
      <footer className="h-16 border-t border-white/5 bg-[#0b1120] flex items-center justify-between px-8">
        <button 
          onClick={onPrev}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          이전
        </button>

        <div className="text-slate-500 text-sm font-bold">
          <span className="text-white">{activeIndex + 1}</span> / {slides.length}
        </div>

        <button 
          onClick={() => {
            if (activeIndex < slides.length - 1) {
              setActiveIndex(activeIndex + 1);
            } else {
              onNext();
            }
          }}
          className="flex items-center gap-2 text-white hover:text-blue-500 transition-colors text-sm font-bold"
        >
          {activeIndex < slides.length - 1 ? '다음' : '내보내기'}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </footer>
    </div>
  );
};

export default ScriptStep;
