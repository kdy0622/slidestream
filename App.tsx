
import React, { useState, useEffect } from 'react';
import { AppStep, SlideData, SubtitleStyle, AudienceLevel, ScriptLength, GenerationOptions, SpeakingRate } from './types';
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
      setLoadingText('PDF에서 슬라이드를 추출하는 중...');
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
    setLoadingText('AI가 슬라이드를 분석하여 대본을 작성하고 있습니다...');
    const updatedSlides = [...slides];
    
    try {
      for (let i = 0; i < updatedSlides.length; i++) {
        setLoadingText(`대본 작성 중... (${i + 1}/${updatedSlides.length})`);
        const script = await generateScript(updatedSlides[i].image, genOptions.audience, genOptions.length);
        updatedSlides[i].script = script;
      }
      setSlides(updatedSlides);
      setStep(AppStep.SCRIPT);
    } catch (err: any) {
      const isQuota = err.message === 'QUOTA_EXCEEDED';
      setError({ 
        message: isQuota ? "현재 시스템의 AI 사용량이 초과되었습니다. 잠시 후 다시 시도하거나, 아래 버튼을 눌러 본인의 API 키를 사용하여 계속 진행할 수 있습니다." : `대본 생성 오류: ${err.message || 'AI 서비스 연결에 실패했습니다.'}`, 
        isQuota 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenKeySelection = async () => {
    try {
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        setError(null); // Proceed assuming success after closing dialog
      }
    } catch (e) {
      console.error("Failed to open key selection", e);
    }
  };

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-8">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] max-w-lg w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
             <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-4">{error.isQuota ? "할당량 초과 안내" : "오류 발생"}</h2>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">{error.message}</p>
          
          <div className="flex flex-col gap-4">
            {error.isQuota && (
              <button 
                onClick={handleOpenKeySelection}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-95"
              >
                본인 API 키 등록하기
              </button>
            )}
            <button 
              onClick={() => setError(null)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-sm transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 flex flex-col">
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0b1120]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-600/20">
             <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span className="text-lg font-bold tracking-tight">SlideCaster</span>
        </div>

        {step !== AppStep.UPLOAD && (
          <div className="flex items-center gap-6">
            {[
              { id: AppStep.REVIEW, label: '검토' },
              { id: AppStep.SETTINGS, label: '설정' },
              { id: AppStep.SCRIPT, label: '대본' },
              { id: AppStep.EXPORT, label: '내보내기' }
            ].map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[11px] font-medium hidden sm:inline ${step === s.id ? 'text-white' : 'text-slate-500'}`}>
                  {s.label}
                </span>
                {idx < 3 && <div className="w-4 h-[1px] bg-slate-800 ml-2"></div>}
              </div>
            ))}
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20"></div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        {step === AppStep.UPLOAD && (
          <div className="w-full max-w-5xl py-12 md:py-24 flex flex-col items-center text-center px-6">
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">슬라이드를 순식간에 <br/><span className="text-blue-500">영상으로 제작하세요</span></h1>
            <p className="text-slate-400 text-base md:text-xl mb-12 max-w-2xl">PDF를 업로드하세요. AI가 대본을 작성하고, 목소리를 입히고, 완벽한 자막까지 제작합니다.</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {['AI 대본 작성', 'TTS 음성', '자동 자막'].map(t => (
                <div key={t} className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-full text-xs font-medium">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  {t}
                </div>
              ))}
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileUpload}
              className="w-full max-w-xl aspect-video drop-zone rounded-[2.5rem] bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer group hover:bg-slate-800/20"
            >
              <div className="bg-blue-600/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-1">PDF를 드래그 앤 드롭하세요</h3>
              <p className="text-slate-500 text-sm mb-10">또는 클릭하여 파일 선택</p>
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black shadow-2xl shadow-blue-600/20 cursor-pointer transition-all active:scale-95">
                파일 탐색기 열기
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
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-black mb-2">{loadingText}</p>
            <p className="text-slate-500 animate-pulse text-sm font-medium">작업이 완료될 때까지 창을 닫지 마세요.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
