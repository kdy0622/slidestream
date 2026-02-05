
import React from 'react';
import { SlideData, AudienceLevel, ScriptLength } from '../types';

interface Props {
  slides: SlideData[];
  onUpdateScript: (id: string, script: string) => void;
  onGenerateAll: () => void;
  genOptions: { audience: AudienceLevel; length: ScriptLength };
  setGenOptions: React.Dispatch<React.SetStateAction<{ audience: AudienceLevel; length: ScriptLength }>>;
  onNext: () => void;
}

const SlideEditor: React.FC<Props> = ({ slides, onUpdateScript, onGenerateAll, genOptions, setGenOptions, onNext }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-card p-6 rounded-[2rem] flex flex-wrap gap-6 items-end justify-between">
        <div className="flex flex-wrap gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">청중 수준</label>
            <select 
              value={genOptions.audience}
              onChange={(e) => setGenOptions(prev => ({ ...prev, audience: e.target.value as AudienceLevel }))}
              className="bg-slate-800 border-none text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 w-40 font-semibold"
            >
              {/* Corrected options to match AudienceLevel type definition in types.ts */}
              {['30세이하여성', '30세이하남성', '4050여성', '4050남성', '5060여성', '5060남성', '70이상', '전문가', '직접 입력'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">대본 목표 길이</label>
            <select 
              value={genOptions.length}
              onChange={(e) => setGenOptions(prev => ({ ...prev, length: e.target.value as ScriptLength }))}
              className="bg-slate-800 border-none text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500 w-48 font-semibold"
            >
              <option value="short">짧게 (30초 내외)</option>
              <option value="medium">보통 (1분 내외)</option>
              <option value="long">길게 (3분 내외)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onGenerateAll}
            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all border border-slate-700 shadow-lg"
          >
            전체 대본 AI 자동 생성
          </button>
          <button 
            onClick={onNext}
            disabled={slides.some(s => !s.script)}
            className="bg-blue-600 text-white hover:bg-blue-500 px-10 py-3 rounded-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-600/20"
          >
            스타일 설정 →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {slides.map((slide, idx) => (
          <div key={slide.id} className="glass-card rounded-[2rem] overflow-hidden flex flex-col border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="aspect-video bg-slate-950 flex items-center justify-center relative">
              <img src={slide.image} alt={`Slide ${idx + 1}`} className="max-h-full max-w-full object-contain" />
              <div className="absolute top-4 left-4 bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                SLIDE {idx + 1}
              </div>
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-slate-400">발표 시나리오</label>
                <div className="text-[10px] text-slate-600 font-mono">{slide.script.length} chars</div>
              </div>
              <textarea
                value={slide.script}
                onChange={(e) => onUpdateScript(slide.id, e.target.value)}
                placeholder="슬라이드를 보고 설명할 대본을 입력하거나 AI 생성을 누르세요..."
                className="w-full flex-grow p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-200 text-sm leading-relaxed h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SlideEditor;
