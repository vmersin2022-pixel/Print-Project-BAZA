import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedSeoData {
  title: string;
  description: string;
  mainKey: string;
  additionalKeys: string;
  bullets: string;
  searchLinks: { title: string; uri: string }[];
}

export interface TrendAnalysisResult {
  text: string;
  sources: { title: string; uri: string }[];
}

// Function to initialize the GoogleGenAI client according to strict guidelines.
const getAiClient = () => {
  // Use exclusively process.env.API_KEY
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key not found. Ensure process.env.API_KEY is properly configured.");
  }
  // Named parameter initialization
  return new GoogleGenAI({ 
    apiKey: apiKey
  });
};

/**
 * Analyzes the origin of a search trend using Gemini 3 Flash and Google Search grounding.
 */
export const analyzeTrendOrigin = async (query: string): Promise<TrendAnalysisResult> => {
  const ai = getAiClient();
  
  const prompt = `
    Проанализируй происхождение тренда по поисковому запросу: "${query}".
    
    Твоя задача — найти первоисточник или причину популярности этого товара ПРЯМО СЕЙЧАС.
    
    1. Ищи информацию в TikTok, Instagram, Pinterest, YouTube и новостных ресурсах через Google Search.
    2. Ответь на вопросы:
       - Откуда пошел этот тренд? (Конкретный блогер, мем, сериал, сезонность, событие).
       - Почему это популярно именно сейчас?
       - Кто целевая аудитория?
    
    Ответ дай в свободной форме, как аналитик маркетплейсов. Будь краток и конкретен (до 150 слов).
  `;

  try {
    const response = await ai.models.generateContent({
      // Use 'gemini-3-flash-preview' for basic text tasks with search tools.
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        temperature: 0.3,
        tools: [{googleSearch: {}}],
      }
    });

    // Access the extracted string output using .text property.
    const text = response.text || "Не удалось получить текстовый ответ.";
    
    // Extract website URLs from grounding metadata.
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri
      }));

    const uniqueSources = Array.from(new Map(sources.map((item: any) => [item.uri, item])).values()) as { title: string; uri: string }[];

    return {
      text,
      sources: uniqueSources
    };

  } catch (error: any) {
    console.error("Trend Analysis Error:", error);
    throw new Error(error.message || "Ошибка при анализе тренда");
  }
};

/**
 * Generates SEO optimized product content using Gemini 3 Flash and JSON response schema.
 */
export const generateSeoWithTrends = async (query: string): Promise<GeneratedSeoData> => {
  const ai = getAiClient();

  const prompt = `
    Ты профессиональный SEO-копирайтер для маркетплейса Wildberries.
    Твоя задача: Создать оптимизированную карточку товара для запроса: "${query}".

    1. Используй инструмент Google Search, чтобы найти актуальные тренды, конкурентов и популярные ключевые слова для этого товара ПРЯМО СЕЙЧАС.
    2. На основе найденного составь:
       - Продающий заголовок (Title). Максимум 60 символов.
       - SEO-описание (Description). Используй LSI-ключи, пиши для людей, но с учетом алгоритмов.
       - Главный ключ (Main Key). Самый частотный и релевантный.
       - Дополнительные ключи (Additional Keys). Список через запятую.
       - Буллеты (Bullets). 3-5 преимуществ товара через точку с запятую.

    Верни ответ строго в формате JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            mainKey: { type: Type.STRING },
            additionalKeys: { type: Type.STRING },
            bullets: { type: Type.STRING }
          },
          required: ['title', 'description', 'mainKey', 'additionalKeys', 'bullets']
        },
        tools: [{googleSearch: {}}],
      }
    });

    // Access the extracted string output using .text property.
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const json = JSON.parse(text);
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchLinks = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({
        title: c.web.title,
        uri: c.web.uri
      }));

    return {
      title: json.title,
      description: json.description,
      mainKey: json.mainKey,
      additionalKeys: json.additionalKeys,
      bullets: json.bullets,
      searchLinks: searchLinks
    };

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || "Ошибка при генерации SEO");
  }
};