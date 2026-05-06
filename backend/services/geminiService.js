import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI;

const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

export const getGeminiModel = (tone) => {
  const ai = getGenAI();
  const systemInstruction = `You are an AI assistant. Tone: ${tone}. Current local time: ${new Date().toISOString()}.`;
  return ai.getGenerativeModel({ 
    model: "gemini-flash-latest",
    systemInstruction
  });
};

export const formatHistoryForGemini = (messages) => {
  return messages.map(m => {
    const parts = [{ text: m.content }];
    if (m.file && m.file.data) {
      parts.push({
        inlineData: {
          mimeType: m.file.mimeType,
          data: m.file.data
        }
      });
    }
    return {
      role: m.role === "user" ? "user" : "model",
      parts: parts
    };
  });
};

export const generateAIResponse = async (model, history, question, fileData, maxOutputTokens) => {
  const chat = model.startChat({ 
    history: formatHistoryForGemini(history),
    generationConfig: { maxOutputTokens }
  });

  const parts = [{ text: question }];
  if (fileData) {
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
  }

  const result = await chat.sendMessage(parts);
  return result.response.text();
};
