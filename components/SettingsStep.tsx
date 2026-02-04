
import React, { useEffect, useRef, useState } from 'react';
import { SlideData, GenerationOptions, SubtitleStyle, AudienceLevel, ScriptLength, SpeakingRate } from '../types';

interface Props {
  slides: SlideData[];
  options: GenerationOptions;
  setOptions: React.Dispatch<React.SetStateAction<GenerationOptions>>;
  style: SubtitleStyle;
  setStyle: React.Dispatch<React.SetStateAction<SubtitleStyle>>;
  onPrev: () => void;
  onNext: () => void;
}

const SettingsStep: React.FC<Props> = ({ slides, options, setOptions, style, setStyle, onPrev, onNext }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);

  const voices = [
    { id: 'Kore', label: 'Kore (여성) - 차분하고 부드러운 톤' },
    { id: 'Puck', label: 'Puck (남성) - 안정적이고 신뢰감 있는 톤' },
    { id: 'Charon', label: 'Charon (남성) - 깊고 권위 있는 톤' },
    { id: 'Fenrir', label: 'Fenrir (남성) - 에너지 넘치고 강한 톤' },
    { id: 'Zephyr', label: 'Zephyr (여성) - 밝고 명확한 톤' },
  ];

  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || slides.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = slides[0].image;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const text = "자막 스타일이 여기에 표시됩니다.";
      let fontSize = style.fontSize;
      ctx.font = `bold ${fontSize}px 'Pretendard'`;
      
      const maxWidth = canvas.width * 0.9;
      while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px 'Pretendard'`;
      }

      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const x = (canvas.width - textWidth) / 2;
      let y = canvas.height - 100;
      if (style.position === 'middle') y = canvas.height / 2;
      if (style.position === 'top') y = 100;

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
      };

      ctx.fillStyle = `rgba(${hexToRgb(style.backgroundColor)}, ${style.backgroundOpacity})`;
      const px = 40, py = 20;
      ctx.beginPath();
      const rx = x - px, ry = y - textHeight/2 - py, rw = textWidth + px*2, rh = textHeight + py*2, radius = 12;
      
      // Fallback for roundRect
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

      ctx.fillStyle = style.textColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    };
  };

  useEffect(() => {
    drawPreview();
  }, [style, slides]);

  const audienceLevels: { level: AudienceLevel, desc: string, icon: any }[] = [
    { level: '30세이하여성', desc: '젊은 여성 취향의 세련된 대본.', icon: <span>✨</span> },
    { level: '30세이하남성', desc: '젊은 남성 취향의 트렌디한 대본.', icon: <span>🚀</span> },
    { level: '4050여성', desc: '4050 여성에게 친근하고 품격 있는 대본.', icon: <span>🌸</span> },
    { level: '4050남성', desc: '4050 남성에게 신뢰감 있고 전문적인 대본.', icon: <span>💼</span> },
    { level: '5060여성', desc: '5060 여성에게 명확하고 따뜻한 대본.', icon: <span>👵</span> },
    { level: '5060남성', desc: '5060 남성에게 점잖고 명확한 대본.', icon: <span>👴</span> },
    { level: '70이상', desc: '천천하고 이해하기 쉬운 큰 글씨 위주 대본.', icon: <span>🍀</span> },
    { level: '전문가', desc: '전문 용어 중심의 간결한 어조.', icon: <span>🎓</span> },
    { level: '직접 입력', desc: 'AI 생성 없이 직접 대본을 작성합니다.', icon: <span>✍️</span> }
  ];

  const lengths: { length: ScriptLength, label: string, desc: string }[] = [
    { length: 'short', label: '짧게', desc: '~10초/장' },
    { length: 'medium', label: '보통', desc: '~1분/장' },
    { length: 'long', label: '길게', desc: '~2분/장' }
  ];

  return (
    <div className="w-full max-w-7xl px-8 py-12 flex flex-col lg:flex-row gap-12 min-h-0 overflow-hidden">
      <div className="lg:w-1/2 flex flex-col gap-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          자막 미리보기 <span className="text-[10px] bg-blue-600/20 text-blue-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">Preview</span>
        </h3>
        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center justify-center flex-grow shadow-2xl">
          <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-white/5">
             <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>
          <p className="mt-8 text-slate-500 text-sm font-medium">슬라이드 위에 자막이 어떻게 보일지 확인하세요.</p>
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col gap-10 overflow-y-auto custom-scrollbar pr-6">
        <div>
           <div className="text-blue-500 text-[10px] font-black tracking-widest uppercase mb-1">2단계 / 4단계</div>
           <h2 className="text-4xl font-black mb-2 leading-tight">AI 페르소나 및 스타일</h2>
           <p className="text-slate-500 text-sm font-medium">내레이션과 자막 스타일을 설정하세요.</p>
        </div>

        <section>
          <h4 className="flex items-center gap-2 text-sm font-bold mb-4 text-slate-400">
             타겟 청중
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
             {audienceLevels.map(a => (
               <button 
                key={a.level}
                onClick={() => setOptions(prev => ({ ...prev, audience: a.level }))}
                className={`flex flex-col p-4 rounded-2xl border transition-all text-left group ${
                  options.audience === a.level ? 'bg-blue-600/10 border-blue-600 shadow-lg shadow-blue-600/10' : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                }`}
               >
                 <div className={`mb-3 transition-transform group-hover:scale-110 ${options.audience === a.level ? 'text-blue-500' : 'text-slate-500'}`}>{a.icon}</div>
                 <div className={`text-sm font-bold mb-1 truncate ${options.audience === a.level ? 'text-white' : 'text-slate-300'}`}>{a.level}</div>
                 <div className="text-[10px] text-slate-500 leading-tight h-6 overflow-hidden line-clamp-2">{a.desc}</div>
               </button>
             ))}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <section>
                <h4 className="flex items-center gap-2 text-sm font-bold mb-4 text-slate-400">
                    대본 길이
                </h4>
                <div className="flex gap-2">
                    {lengths.map(l => (
                    <button 
                        key={l.length}
                        onClick={() => setOptions(prev => ({ ...prev, length: l.length }))}
                        className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${
                        options.length === l.length ? 'bg-blue-600/10 border-blue-600' : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                        }`}
                    >
                        <div className="text-xs font-bold">{l.label}</div>
                        <div className="text-[9px] text-slate-500 font-mono tracking-tighter whitespace-nowrap">{l.desc}</div>
                    </button>
                    ))}
                </div>
            </section>

            <section>
                <h4 className="flex items-center gap-2 text-sm font-bold mb-4 text-slate-400">
                    말하기 속도
                </h4>
                <div className="flex bg-slate-900 rounded-2xl p-1.5 border border-white/5 h-[58px]">
                   {(['slow', 'normal', 'fast'] as SpeakingRate[]).map(r => (
                     <button 
                      key={r}
                      onClick={() => setOptions(prev => ({ ...prev, speakingRate: r }))}
                      className={`flex-1 rounded-xl text-xs font-bold transition-all ${
                        options.speakingRate === r ? 'bg-slate-800 text-blue-500 shadow-inner' : 'text-slate-600 hover:text-slate-400'
                      }`}
                     >
                       {r === 'slow' ? '느리게' : r === 'fast' ? '빠르게' : '보통'}
                     </button>
                   ))}
                </div>
            </section>
        </div>

        <section className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-bold mb-4 text-slate-400">
             음성 설정
          </h4>
          
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-tighter">목소리 선택</label>
            <div 
              onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
              className={`w-full bg-[#1e293b]/50 border px-5 py-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                isVoiceMenuOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                </div>
                <span className="text-sm font-bold text-white">{options.voiceName}</span>
              </div>
              <svg className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isVoiceMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </div>

            {isVoiceMenuOpen && (
              <div className="absolute top-full left-0 w-full mt-3 bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] animate-in fade-in zoom-in-95 duration-200">
                {voices.map(v => (
                  <div 
                    key={v.id}
                    onClick={() => {
                      setOptions(prev => ({ ...prev, voiceName: v.label }));
                      setIsVoiceMenuOpen(false);
                    }}
                    className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                      options.voiceName === v.label ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm">{v.label}</span>
                    {options.voiceName === v.label && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 space-y-8">
          <h4 className="flex items-center gap-2 text-sm font-bold mb-4 text-slate-400">
             자막 스타일 설정
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <label className="text-[10px] font-bold text-slate-500 mb-3 block uppercase tracking-widest">글꼴</label>
                <select 
                value={style.fontFamily}
                onChange={(e) => setStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full bg-slate-950 border border-white/10 text-slate-300 px-5 py-3 rounded-2xl appearance-none text-sm focus:ring-1 focus:ring-blue-600 outline-none transition-all"
                >
                <option value="Pretendard">기본 고딕 (Sans)</option>
                <option value="serif">명조체 (Serif)</option>
                <option value="monospace">코드체 (Mono)</option>
                </select>
            </div>

            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">글자 크기 (1080P)</label>
                    <span className="text-xs font-black text-blue-500">{style.fontSize}PX</span>
                </div>
                <input 
                type="range" min="24" max="80" value={style.fontSize}
                onChange={(e) => setStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="w-full accent-blue-600 h-1.5 bg-slate-950 rounded-full appearance-none cursor-pointer"
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">글자 색상</label>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-white/5">
                   <div className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden relative shadow-lg">
                      <input 
                        type="color" value={style.textColor}
                        onChange={(e) => setStyle(prev => ({ ...prev, textColor: e.target.value }))}
                        className="absolute inset-[-10px] w-[100px] h-[100px] cursor-pointer"
                      />
                   </div>
                   <span className="text-[10px] font-mono text-slate-500 truncate">{style.textColor.toUpperCase()}</span>
                </div>
             </div>
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">배경 색상</label>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-white/5">
                   <div className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden relative shadow-lg">
                      <input 
                        type="color" value={style.backgroundColor}
                        onChange={(e) => setStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="absolute inset-[-10px] w-[100px] h-[100px] cursor-pointer"
                      />
                   </div>
                   <span className="text-[10px] font-mono text-slate-500 truncate">{style.backgroundColor.toUpperCase()}</span>
                </div>
             </div>
             <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">배경 투명도</label>
                    <span className="text-[10px] font-black text-white">{Math.round(style.backgroundOpacity * 100)}%</span>
                </div>
                <input 
                type="range" min="0" max="1" step="0.05" value={style.backgroundOpacity}
                onChange={(e) => setStyle(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                className="w-full accent-blue-600 h-1.5 bg-slate-950 rounded-full appearance-none cursor-pointer"
                />
             </div>
          </div>
        </section>

        <div className="flex gap-4 pt-10 border-t border-white/5 pb-16">
           <button onClick={onPrev} className="flex-1 py-5 bg-slate-800 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-lg">이전 단계</button>
           <button 
            onClick={onNext}
            className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-4 active:scale-95"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
             대본 생성하기
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsStep;
