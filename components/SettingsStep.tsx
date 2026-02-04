
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
    img.crossOrigin = "anonymous"; // Prevent potential tainted canvas issues
    img.src = slides[0].image;
    img.onload = () => {
      // Set fixed preview size for better performance
      canvas.width = 1280;
      canvas.height = 720;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (canvas.width - img.width * ratio) / 2;
      const centerShiftY = (canvas.height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

      const text = "자막 스타일이 여기에 표시됩니다.";
      let fontSize = style.fontSize;
      ctx.font = `bold ${fontSize}px 'Pretendard', sans-serif`;
      
      const maxWidth = canvas.width * 0.9;
      while (ctx.measureText(text).width > maxWidth && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px 'Pretendard', sans-serif`;
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
      const px = 30, py = 15;
      const rx = x - px, ry = y - textHeight/2 - py, rw = textWidth + px*2, rh = textHeight + py*2, radius = 10;
      
      ctx.beginPath();
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
    img.onerror = () => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('이미지 로드 실패', canvas.width / 2, canvas.height / 2);
    };
  };

  useEffect(() => {
    const timer = setTimeout(() => drawPreview(), 100);
    return () => clearTimeout(timer);
  }, [style, slides]);

  const audienceLevels: { level: AudienceLevel, icon: any }[] = [
    { level: '30세이하여성', icon: '✨' },
    { level: '30세이하남성', icon: '🚀' },
    { level: '4050여성', icon: '🌸' },
    { level: '4050남성', icon: '💼' },
    { level: '5060여성', icon: '👵' },
    { level: '5060남성', icon: '👴' },
    { level: '70이상', icon: '🍀' },
    { level: '전문가', icon: '🎓' },
    { level: '직접 입력', icon: '✍️' }
  ];

  return (
    <div className="w-full max-w-7xl px-4 py-6 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
      {/* Left: Preview */}
      <div className="lg:w-1/2 flex flex-col gap-4">
        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-400">
          자막 미리보기 <span className="text-[9px] bg-blue-600/20 text-blue-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">LIVE</span>
        </h3>
        <div className="bg-slate-900 rounded-3xl p-4 border border-white/5 flex flex-col items-center justify-center flex-grow shadow-xl">
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative border border-white/5">
             <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>
          <p className="mt-4 text-slate-500 text-[11px] font-medium">스타일을 조절하면 즉시 반영됩니다.</p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="lg:w-1/2 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
        <div>
           <div className="text-blue-500 text-[9px] font-black tracking-widest uppercase mb-0.5">2단계 / 4단계</div>
           <h2 className="text-2xl font-black leading-tight">AI 페르소나 및 스타일</h2>
        </div>

        {/* Target Audience */}
        <section>
          <h4 className="text-[10px] font-bold mb-2 text-slate-500 uppercase tracking-widest">타겟 청중</h4>
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-1.5">
             {audienceLevels.map(a => (
               <button 
                key={a.level}
                onClick={() => setOptions(prev => ({ ...prev, audience: a.level }))}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left group ${
                  options.audience === a.level ? 'bg-blue-600/10 border-blue-600 shadow-lg shadow-blue-600/5' : 'bg-slate-900/50 border-white/5 hover:border-white/10'
                }`}
               >
                 <span className="text-sm shrink-0">{a.icon}</span>
                 <span className={`text-[10px] font-bold truncate ${options.audience === a.level ? 'text-white' : 'text-slate-400'}`}>{a.level}</span>
               </button>
             ))}
          </div>
        </section>

        {/* Script Options */}
        <div className="grid grid-cols-2 gap-4">
            <section>
                <h4 className="text-[10px] font-bold mb-2 text-slate-500 uppercase tracking-widest">대본 길이</h4>
                <div className="flex gap-1.5">
                    {([['short', '짧게'], ['medium', '보통'], ['long', '길게']] as [ScriptLength, string][]).map(([l, label]) => (
                    <button 
                        key={l}
                        onClick={() => setOptions(prev => ({ ...prev, length: l }))}
                        className={`flex-1 py-2.5 rounded-xl border transition-all text-[11px] font-bold ${
                        options.length === l ? 'bg-blue-600/10 border-blue-600 text-white' : 'bg-slate-900/50 border-white/5 text-slate-500'
                        }`}
                    >
                        {label}
                    </button>
                    ))}
                </div>
            </section>

            <section>
                <h4 className="text-[10px] font-bold mb-2 text-slate-500 uppercase tracking-widest">말하기 속도</h4>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-white/5">
                   {(['slow', 'normal', 'fast'] as SpeakingRate[]).map(r => (
                     <button 
                      key={r}
                      onClick={() => setOptions(prev => ({ ...prev, speakingRate: r }))}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        options.speakingRate === r ? 'bg-slate-800 text-blue-500' : 'text-slate-600 hover:text-slate-400'
                      }`}
                     >
                       {r === 'slow' ? '느림' : r === 'fast' ? '빠름' : '보통'}
                     </button>
                   ))}
                </div>
            </section>
        </div>

        {/* Voice Selection */}
        <section>
          <h4 className="text-[10px] font-bold mb-2 text-slate-500 uppercase tracking-widest">내레이션 음성</h4>
          <div className="relative">
            <div 
              onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
              className={`w-full bg-[#1e293b]/50 border px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                isVoiceMenuOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                <span className="text-xs font-bold text-white truncate max-w-[200px]">{options.voiceName}</span>
              </div>
              <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isVoiceMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
            </div>
            {isVoiceMenuOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                {voices.map(v => (
                  <div 
                    key={v.id}
                    onClick={() => { setOptions(prev => ({ ...prev, voiceName: v.label })); setIsVoiceMenuOpen(false); }}
                    className={`px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                      options.voiceName === v.label ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {v.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Subtitle Style */}
        <section className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
                <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-widest">글꼴</label>
                <select 
                value={style.fontFamily}
                onChange={(e) => setStyle(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full bg-slate-950 border border-white/10 text-slate-300 px-3 py-2 rounded-xl text-[11px] font-bold outline-none"
                >
                <option value="Pretendard">기본 고딕</option>
                <option value="serif">명조체</option>
                <option value="monospace">코드체</option>
                </select>
            </div>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">크기</label>
                    <span className="text-[10px] font-black text-blue-500">{style.fontSize}PX</span>
                </div>
                <input 
                type="range" min="24" max="80" value={style.fontSize}
                onChange={(e) => setStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="w-full accent-blue-600 h-1 bg-slate-950 rounded-full appearance-none cursor-pointer"
                />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">글자색</label>
                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                   <input 
                    type="color" value={style.textColor}
                    onChange={(e) => setStyle(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-7 h-7 bg-transparent border-none cursor-pointer"
                   />
                   <span className="text-[8px] font-mono text-slate-500 uppercase">{style.textColor}</span>
                </div>
             </div>
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">배경색</label>
                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                   <input 
                    type="color" value={style.backgroundColor}
                    onChange={(e) => setStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-7 h-7 bg-transparent border-none cursor-pointer"
                   />
                   <span className="text-[8px] font-mono text-slate-500 uppercase">{style.backgroundColor}</span>
                </div>
             </div>
             <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">투명도 {Math.round(style.backgroundOpacity * 100)}%</label>
                <input 
                type="range" min="0" max="1" step="0.05" value={style.backgroundOpacity}
                onChange={(e) => setStyle(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
                className="w-full accent-blue-600 h-1 bg-slate-950 rounded-full appearance-none cursor-pointer"
                />
             </div>
          </div>
        </section>

        {/* Buttons */}
        <div className="flex gap-3 mt-2 pb-8">
           <button onClick={onPrev} className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 shadow-lg">이전 단계</button>
           <button 
            onClick={onNext}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
             대본 생성하기
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsStep;
