
import React, { useState } from 'react';
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
    if ('files' in e.target && e.target.files?.[0]) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files?.[0]) {
      e.preventDefault();
      file = e.dataTransfer.files[0];
    }

    if (!file) return;

    try {
      setIsLoading(true);
      setLoadingText('PDF에서 슬라이드를 추출하는 중...');
      const images = await convertPdfToImages(file);
      const newSlides: SlideData[] = images.map((img, idx) => ({
        id: `slide-${Date.now()}-${idx}`,
        image: img,
        script: ''
      }));
      setSlides(newSlides);
      setStep(AppStep.REVIEW);
    } catch (error) {
      console.error(error);
      alert('PDF 변환 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    setIsLoading(true);
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
    } catch (error) {
      alert('대본 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 flex flex-col">
      {/* Navigation Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0b1120] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-600/20">
             <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span className="text-lg font-bold tracking-tight">SlideCaster</span>
        </div>

        {/* Step Indicator */}
        {step !== AppStep.UPLOAD && (
          <div className="flex items-center gap-8">
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
                <span className={`text-xs font-medium ${step === s.id ? 'text-white' : 'text-slate-500'}`}>
                  {s.label}
                </span>
                {idx < 3 && <div className="w-8 h-[1px] bg-slate-800 ml-4"></div>}
              </div>
            ))}
          </div>
        )}

        <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30"></div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        {step === AppStep.UPLOAD && (
          <div className="w-full max-w-5xl py-24 flex flex-col items-center text-center">
            <h1 className="text-6xl font-black mb-6">슬라이드를 순식간에 <span className="text-blue-500">영상으로</span></h1>
            <p className="text-slate-400 text-xl mb-12">PDF를 업로드하세요. AI가 대본을 작성하고, 목소리를 입히고, 자막을 제작합니다.</p>
            
            <div className="flex gap-4 mb-16">
              {['AI 대본 작성', 'TTS 음성', '자동 자막'].map(t => (
                <div key={t} className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-5 py-2.5 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  {t}
                </div>
              ))}
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileUpload}
              className="w-full max-w-2xl aspect-[1.8/1] drop-zone rounded-[3rem] bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer group hover:bg-slate-800/20"
            >
              <div className="bg-blue-600/10 p-5 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-2">PDF를 드래그 앤 드롭하세요</h3>
              <p className="text-slate-500 text-sm mb-8">또는 클릭하여 파일 선택 (최대 50MB)</p>
              <label className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-blue-600/20 cursor-pointer transition-all active:scale-95">
                PDF 파일 선택
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
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-xl font-bold mb-2">{loadingText}</p>
            <p className="text-slate-500 animate-pulse text-sm font-medium">작업이 완료될 때까지 잠시만 기다려 주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
