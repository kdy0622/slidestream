
import React from 'react';
import { SlideData } from '../types';

interface Props {
  slides: SlideData[];
  onRemove: (id: string) => void;
  onNext: () => void;
}

const ReviewStep: React.FC<Props> = ({ slides, onRemove, onNext }) => {
  return (
    <div className="w-full max-w-7xl px-8 py-12 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold mb-2">슬라이드 검토</h2>
          <p className="text-slate-500 font-medium">PDF에서 슬라이드를 추출했습니다. 영상에 포함할 슬라이드를 검토하고 정리하세요.</p>
        </div>
        <button 
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
        >
          대본 생성 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>

      <div className="bg-slate-900/50 rounded-[2rem] p-8 border border-white/5">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
          <div className="text-sm font-bold text-slate-400">{slides.length}개 슬라이드</div>
          <div className="flex gap-2">
             <button className="p-2.5 rounded-lg bg-blue-600 text-white">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
             </button>
             <button className="p-2.5 rounded-lg bg-slate-800 text-slate-500 hover:text-slate-300">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="group glass-card rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all flex flex-col">
              <div className="aspect-[4/3] relative bg-slate-950 flex items-center justify-center overflow-hidden">
                <img src={slide.image} alt="" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <button className="p-2 bg-white/10 backdrop-blur rounded-lg hover:bg-white/20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                   <button 
                    onClick={() => onRemove(slide.id)}
                    className="p-2 bg-red-500/20 backdrop-blur rounded-lg hover:bg-red-500/40 text-red-500"
                   >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                   </button>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-white">슬라이드 {idx + 1}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-900 rounded text-slate-500 uppercase">{idx + 1} 페이지</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">대본 생성 준비 완료</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
