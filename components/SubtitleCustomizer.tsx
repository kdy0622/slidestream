
import React, { useEffect, useRef } from 'react';
import { SlideData, SubtitleStyle } from '../types';

interface Props {
  slides: SlideData[];
  style: SubtitleStyle;
  setStyle: React.Dispatch<React.SetStateAction<SubtitleStyle>>;
  onPrev: () => void;
  onNext: () => void;
}

const SubtitleCustomizer: React.FC<Props> = ({ slides, style, setStyle, onPrev, onNext }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      const text = slides[0].script || "여기에 자막이 표시됩니다. 스타일을 조절해보세요.";
      
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

      // Background
      ctx.fillStyle = `rgba(${hexToRgb(style.backgroundColor)}, ${style.backgroundOpacity})`;
      const paddingX = 40;
      const paddingY = 20;
      ctx.beginPath();
      ctx.roundRect(x - paddingX, y - textHeight/2 - paddingY, textWidth + paddingX*2, textHeight + paddingY*2, 12);
      ctx.fill();

      // Text
      ctx.fillStyle = style.textColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    };
  };

  useEffect(() => {
    drawPreview();
  }, [style, slides]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-2 space-y-6">
        <h3 className="text-2xl font-black">자막 미리보기</h3>
        <div className="bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800 aspect-video flex items-center justify-center relative">
          <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
        </div>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem] space-y-8 h-fit sticky top-8">
        <h3 className="text-xl font-bold">자막 디자인</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">글자 크기 ({style.fontSize}px)</label>
            <input 
              type="range" min="20" max="120" value={style.fontSize}
              onChange={(e) => setStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              className="w-full accent-blue-600 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">글자 색상</label>
              <div className="relative group h-12 w-full rounded-xl overflow-hidden border border-slate-700">
                <input 
                  type="color" value={style.textColor}
                  onChange={(e) => setStyle(prev => ({ ...prev, textColor: e.target.value }))}
                  className="absolute inset-0 w-full h-full scale-150 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">배경 색상</label>
              <div className="relative group h-12 w-full rounded-xl overflow-hidden border border-slate-700">
                <input 
                  type="color" value={style.backgroundColor}
                  onChange={(e) => setStyle(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="absolute inset-0 w-full h-full scale-150 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">배경 투명도 ({Math.round(style.backgroundOpacity * 100)}%)</label>
            <input 
              type="range" min="0" max="1" step="0.05" value={style.backgroundOpacity}
              onChange={(e) => setStyle(prev => ({ ...prev, backgroundOpacity: parseFloat(e.target.value) }))}
              className="w-full accent-blue-600 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">표시 위치</label>
            <div className="flex gap-2 p-1 bg-slate-800 rounded-2xl">
              {['top', 'middle', 'bottom'].map(pos => (
                <button
                  key={pos}
                  onClick={() => setStyle(prev => ({ ...prev, position: pos as any }))}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-tighter ${
                    style.position === pos ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex gap-4">
          <button onClick={onPrev} className="flex-1 py-4 rounded-2xl bg-slate-800 font-bold hover:bg-slate-700 transition-colors">이전</button>
          <button onClick={onNext} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">완료</button>
        </div>
      </div>
    </div>
  );
};

export default SubtitleCustomizer;
