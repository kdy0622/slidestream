import React, { useState } from 'react';
import { AppStep, SlideData, SubtitleStyle, GenerationOptions } from './types';
import { convertPdfToImages } from './services/pdfService';
import { generateScript } from './services/geminiService';
import ReviewStep from './components/ReviewStep';
import SettingsStep from './components/SettingsStep';
import ScriptStep from './components/ScriptStep';
import VideoExporter from './components/VideoExporter';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<{ message: string; isQuota: boolean } | null>(null);

  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>({
    fontSize: 40,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    backgroundOpacity: 0.7,
    position: 'bottom',
    fontFamily: 'Pretendard'
  });

  const [genOptions, setGenOptions] = useState<GenerationOptions>({
    audience: '4050남성',
    length: 'medium',
    voiceName: 'Kore (여성) - 차분하고 부드러운 톤',
    speakingRate: 'normal'
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    if (e.type === 'change') {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) file = target.files[0];
    } else if (e.type === 'drop') {
      const event = e as React.DragEvent;
      event.preventDefault();
      if (event.dataTransfer.files?.[0]) file = event.dataTransfer.files[0];
    }

    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setLoadingText('PDF 추출 중...');
      const images = await convertPdfToImages(file);
      if (!images || images.length === 0) throw new Error("추출된 슬라이드가 없습니다.");
      
      const newSlides: SlideData[] = images.map((img, idx) => ({
        id: `slide-${Date.now()}-${idx}`,
        image: img,
        script: ''
      }));
      setSlides(newSlides);
      setStep(AppStep.REVIEW);
    } catch (err: any) {
      setError({ message: `PDF 처리 오류: ${err.message || '파일을 읽는 도중 문제가 발생했습니다.'}`, isQuota: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingText('AI 대본 생성 중...');
    const updatedSlides = [...slides];
    
    try {
      for (let i = 0; i < updatedSlides.length; i++) {
        setLoadingText(`슬라이드 분석 중... (${i + 1}/${updatedSlides.length})`);
        const script = await generateScript(updatedSlides[i].image, genOptions.audience, genOptions.length);
        updatedSlides[i].script = script;
      }
      setSlides(updatedSlides);
      setStep(AppStep.SCRIPT);
    } catch (err: any) {
      const isQuota = err.message === 'QUOTA_EXCEEDED' || err.message?.includes('429') || err.message?.includes('quota');
      setError({ 
        message: isQuota ? "API 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요." : `대본 생성 오류: ${err.message || 'AI 서비스 연결에 실패했습니다.'}`, 
        isQuota 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 className="text-xl font-black text-white mb-2">{error.isQuota ? "할당량 초과" : "오류 발생"}</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">{error.message}</p>
          <button 
            onClick={() => setError(null)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-sm transition-all"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 flex flex-col h-screen overflow-hidden">
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-[#0b1120] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center shadow-lg">
             <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span className="text-base font-bold tracking-tight">SlideCaster</span>
        </div>

        {step !== AppStep.UPLOAD && (
          <div className="flex items-center gap-3">
            {[
              { id: AppStep.REVIEW, label: '검토' },
              { id: AppStep.SETTINGS, label: '설정' },
              { id: AppStep.SCRIPT, label: '대본' },
              { id: AppStep.EXPORT, label: '내보내기' }
            ].map((s, idx) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  step === s.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[10px] font-bold hidden md:inline ${step === s.id ? 'text-white' : 'text-slate-500'}`}>
                  {s.label}
                </span>
                {idx < 3 && <div className="w-3 h-[1px] bg-slate-800 ml-1"></div>}
              </div>
            ))}
          </div>
        )}
        <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20"></div>
      </header>

      <main className="flex-grow flex flex-col items-center overflow-hidden">
        {step === AppStep.UPLOAD && (
          <div className="w-full max-w-4xl py-12 flex flex-col items-center text-center px-6 overflow-y-auto">
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">슬라이드를 <span className="text-blue-500">영상으로</span></h1>
            <p className="text-slate-400 text-sm md:text-base mb-10 max-w-xl">PDF를 업로드하세요. AI가 대본, 음성, 자막을 제작합니다.</p>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileUpload}
              className="w-full max-w-lg aspect-video drop-zone rounded-3xl bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer group hover:bg-slate-800/20 border-2 border-dashed border-white/5"
            >
              <div className="bg-blue-600/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <h3 className="text-base font-bold mb-1">PDF 파일을 여기에 놓으세요</h3>
              <p className="text-slate-500 text-[11px] mb-6">최대 50MB</p>
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-black text-sm shadow-xl cursor-pointer transition-all active:scale-95">
                파일 선택
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        )}

        {step === AppStep.REVIEW && (
          <ReviewStep 
            slides={slides} 
            onRemove={removeSlide}
            onNext={() => setStep(AppStep.SETTINGS)}
          />
        )}

        {step === AppStep.SETTINGS && (
          <SettingsStep 
            slides={slides}
            options={genOptions}
            setOptions={setGenOptions}
            style={subtitleStyle}
            setStyle={setSubtitleStyle}
            onPrev={() => setStep(AppStep.REVIEW)}
            onNext={handleStartGeneration}
          />
        )}

        {step === AppStep.SCRIPT && (
          <ScriptStep 
            slides={slides} 
            options={genOptions}
            onUpdate={(id, script) => setSlides(prev => prev.map(s => s.id === id ? { ...s, script } : s))}
            onPrev={() => setStep(AppStep.SETTINGS)}
            onNext={() => setStep(AppStep.EXPORT)}
          />
        )}

        {step === AppStep.EXPORT && (
          <VideoExporter 
            slides={slides} 
            subtitleStyle={subtitleStyle}
            onPrev={() => setStep(AppStep.SCRIPT)}
          />
        )}
      </main>

      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100]">
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-black mb-1">{loadingText}</p>
            <p className="text-slate-500 animate-pulse text-[11px] font-medium uppercase tracking-widest">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;