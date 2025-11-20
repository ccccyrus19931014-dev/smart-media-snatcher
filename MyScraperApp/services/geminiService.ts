import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.STRING },
    suggestedFilename: { type: Type.STRING },
  },
  required: ["summary", "tags", "category", "suggestedFilename"],
};

export const analyzeMediaContent = async (
  base64Data: string,
  mimeType: string
) => {
  try {
    const modelName = "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: "Analyze this media item. Provide a summary, tags, category, and suggested filename." },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
