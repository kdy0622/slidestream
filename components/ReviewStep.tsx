
import React from 'react';
import { SlideData } from '../types';

interface Props {
  slides: SlideData[];
  onRemove: (id: string) => void;
  onNext: () => void;
}

const ReviewStep: React.FC<Props> = ({ slides, onRemove, onNext }) => {
  return (
    <div className="w-full max-w-6xl px-4 py-4 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-black">슬라이드 검토 <span className="text-slate-500 font-bold ml-2 text-sm">{slides.length}개</span></h2>
        </div>
        <button 
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-black text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
        >
          다음 단계 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      <div className="bg-slate-900/30 rounded-3xl p-4 border border-white/5 overflow-y-auto custom-scrollbar flex-grow">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="group relative glass-card rounded-xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all flex flex-col bg-slate-950">
              <div className="aspect-[4/3] relative flex items-center justify-center overflow-hidden">
                <img src={slide.image} alt="" className="max-h-full max-w-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                   <button 
                    onClick={() => onRemove(slide.id)}
                    className="p-1.5 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors"
                    title="삭제"
                   >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                   </button>
                </div>
                <div className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  {idx + 1}
                </div>
              </div>
              <div className="p-2 bg-slate-900">
                <div className="text-[10px] font-bold text-slate-400 truncate">슬라이드 {idx + 1}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
