
import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, Resolution } from "../types";

/**
 * API 키 유효성을 검사하기 위한 테스트 호출
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    // Create instance inside function as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'hi',
    });
    return !!response.text;
  } catch (error) {
    console.error("API Key Test Failed:", error);
    return false;
  }
};

export const generateStoryboardLogic = async (
  baseImageUrl: string | null, 
  template: string, 
  customScenario?: string
): Promise<{ scenes: { prompt: string, caption: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contentsParts: any[] = [];
  
  if (baseImageUrl) {
    const mimeType = baseImageUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const base64Data = baseImageUrl.split(',')[1];
    contentsParts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
  }

  const promptText = `당신은 세계적인 영화 감독이자 비주얼 스토리텔러입니다. 
  ${customScenario ? `다음 시나리오를 바탕으로: "${customScenario}"` : "업로드된 이미지를 분석하여"} 
  "${template}" 템플릿에 맞춰 9개의 시퀀스를 기획하세요.
  
  지침:
  1. ${baseImageUrl ? "원본 이미지의 캐릭터 특징(외모, 의상)과 톤앤매너를 모든 컷에서 엄격하게 유지하세요." : "일관된 캐릭터와 화풍을 9개의 컷 전체에서 유지하세요."}
  2. 각 장면은 독립된 이미지 생성 프롬프트(영문)와 사용자가 읽을 한국어 지문(caption)으로 구성됩니다.
  3. 한국어 지문은 영화 대본처럼 현장감 있고 상세하게 작성하세요.
  
  Return ONLY valid JSON: { "scenes": [ { "prompt": "detailed english prompt for image generation", "caption": "상세한 한국어 장면 설명" } ] }`;

  contentsParts.push({ text: promptText });

  // Upgraded to gemini-3-pro-preview for complex reasoning tasks
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: contentsParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                prompt: { type: Type.STRING },
                caption: { type: Type.STRING }
              },
              required: ["prompt", "caption"]
            }
          }
        },
        required: ["scenes"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse storyboard logic", e);
    throw e;
  }
};

export const generateImage = async (
  baseImageUrl: string | null, 
  prompt: string, 
  aspectRatio: AspectRatio,
  resolution?: Resolution
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const useProModel = resolution === Resolution.RES_2K || resolution === Resolution.RES_4K;
  const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const parts: any[] = [];
  if (baseImageUrl) {
    const mimeType = baseImageUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const base64Data = baseImageUrl.split(',')[1];
    parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
  }
  
  // SINGLE 모드 대응을 위해 그리드 생성 금지 지시어 강화
  const strictPrompt = `${prompt} STRICT RULE: Create ONLY ONE SINGLE cinematic frame. DO NOT create grids, DO NOT split the image into multiple panels. Output a CLEAN full-frame image with NO borders, NO text, NO watermarks. Fill the entire aspect ratio.`;
  parts.push({ text: strictPrompt });

  const imageConfig: any = {
    aspectRatio: aspectRatio === AspectRatio.LANDSCAPE ? "16:9" : aspectRatio === AspectRatio.PORTRAIT ? "9:16" : "1:1"
  };

  if (useProModel) {
    imageConfig.imageSize = resolution === Resolution.RES_4K ? "4K" : "2K";
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: { imageConfig }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("이미지 생성에 실패했습니다. 유료 API 키 또는 프로젝트 설정(2K/4K)을 확인해주세요.");
};

export const generateGridImage = async (
  baseImageUrl: string | null, 
  template: string, 
  customScenario?: string,
  resolution?: Resolution
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const useProModel = resolution === Resolution.RES_2K || resolution === Resolution.RES_4K;
  const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const parts: any[] = [];
  if (baseImageUrl) {
    const mimeType = baseImageUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const base64Data = baseImageUrl.split(',')[1];
    parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
  }

  const prompt = `Create a professional cinematic 16:9 storyboard grid image. 
  Exactly 9 panels, 3x3 layout, thin black lines. Theme: ${template}. ${customScenario || ""}
  Maintain character consistency. No text/numbers. 16:9 final result.`;

  parts.push({ text: prompt });

  const imageConfig: any = { aspectRatio: "16:9" };
  if (useProModel) {
    imageConfig.imageSize = resolution === Resolution.RES_4K ? "4K" : "2K";
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: { imageConfig }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("그리드 이미지 생성 실패");
};

export const editSingleImage = async (
  baseImageUrl: string, 
  instructions: string, 
  aspectRatio?: string,
  resolution?: Resolution
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const useProModel = resolution === Resolution.RES_2K || resolution === Resolution.RES_4K;
    const modelName = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    const mimeType = baseImageUrl.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const base64Data = baseImageUrl.split(',')[1];

    const imageConfig: any = { aspectRatio: aspectRatio || "1:1" };
    if (useProModel) {
      imageConfig.imageSize = resolution === Resolution.RES_4K ? "4K" : "2K";
    }

    // Border Removal instruction enhancement: Use "identify and expand" strategy
    const enhancedInstructions = `
        ${instructions}
        STRICT EXECUTION: 
        1. IDENTIFY THE CENTRAL CONTENT: Detect the main scene within any grids or borders.
        2. FULL-FRAME EXPANSION: Crop out and erase ALL peripheral borders, grid lines, and watermarks. 
        3. EXTEND BACKGROUND: Regenerate and extend the edges of the central scene to perfectly fill the entire canvas from corner to corner.
        4. ABSOLUTELY CLEAN: The output must be a single, borderless, high-fidelity image with zero artifacts.
    `;

    const response = await ai.models.generateContent({
        model: modelName,
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType: mimeType } },
                { text: enhancedInstructions }
            ]
        },
        config: { imageConfig }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("이미지 편집 실패");
};
