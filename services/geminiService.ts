import { GoogleGenAI, Modality } from "@google/genai";

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const handleApiError = (error: any) => {
  console.error("Gemini API Error Detail:", error);
  const errorMessage = error?.message || String(error);
  
  if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota')) {
    throw new Error("QUOTA_EXCEEDED");
  }
  
  if (errorMessage.includes('API Key must be set')) {
    throw new Error("시스템 API 키가 설정되지 않았습니다. 환경 설정을 확인해주세요.");
  }

  throw error;
};

// API 인스턴스를 안전하게 생성하는 헬퍼 함수
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("Fatal: process.env.API_KEY is missing or empty.");
    throw new Error("An API Key must be set when running in a browser");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateScript = async (
  imageData: string,
  audience: string,
  length: string
): Promise<string> => {
  const ai = getAiInstance();
  const lengthDesc = {
    short: '30초 미만 (약 2-3문장)',
    medium: '1분 미만 (약 5-7문장)',
    long: '3분 미만 (약 15-20문장)'
  }[length as 'short' | 'medium' | 'long'];

  const prompt = `
    다음 슬라이드 이미지를 보고 발표 대본을 작성해주세요.
    
    [제약 사항]
    1. 대상 청중: ${audience}
    2. 목표 길이: ${lengthDesc}
    3. 언어: 반드시 한글로만 작성하세요. 
    4. 금지 사항: 한글 옆에 영어를 병기하는 것(예: 학교(school))을 엄격히 금지합니다. 오직 한글만 사용하세요.
    5. 금지 사항: 특수문자나 이모지 사용을 금지합니다.
    6. 자연스러운 구어체로 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageData.split(',')[1] } },
          { text: prompt }
        ]
      }
    });
    return response.text?.trim() || '대본을 생성할 수 없습니다.';
  } catch (error) {
    return handleApiError(error);
  }
};

export const generateTTS = async (
  text: string,
  audioContext: AudioContext,
  playbackRate: number = 1.0
): Promise<{ buffer: AudioBuffer; duration: number }> => {
  const ai = getAiInstance();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `말하는 속도는 ${playbackRate}배속으로 들리게 자연스럽게 읽어줘: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS generation failed");

    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
    
    return {
      buffer: audioBuffer,
      duration: audioBuffer.duration
    };
  } catch (error) {
    return handleApiError(error);
  }
};