/**
 * Gemini Service
 * 
 * This is the "Translator" file. It takes your messages and formats them
 * into a language that Google's Gemini AI understands. It then sends
 * the request and brings back the AI's answer.
 */

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

/**
 * Prepares the AI model with a specific "personality" or tone.
 */
export const getGeminiModel = (tone) => {
  const ai = getGenAI();
  
  // We tell the AI how to behave (e.g., be "Funny" or "Professional")
  const systemInstruction = `You are an AI assistant. Tone: ${tone}. Current local time: ${new Date().toISOString()}.`;
  
  return ai.getGenerativeModel({ 
    model: "gemini-flash-latest",
    systemInstruction
  });
};


/**
 * Converts our saved chat history into a format the Gemini AI can read.
 */
export const formatHistoryForGemini = (messages) => {
  // We loop through our database messages and transform them into 'AI-friendly' parts
  return messages.map(m => {
    const parts = [{ text: m.content }];
    
    // If there is an image or file attached to this message, add it to the parts
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


/**
 * The main function that actually talks to the AI and gets a response.
 */
export const generateAIResponse = async (model, history, question, fileData, maxOutputTokens) => {
  // 1. Start a "Chat Session" with the AI, feeding it the history so it remembers what we said
  const chat = model.startChat({ 
    history: formatHistoryForGemini(history),
    generationConfig: { maxOutputTokens }
  });

  // 2. Prepare the current question (and file if any)
  const parts = [{ text: question }];
  if (fileData) {
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: fileData.data
      }
    });
  }

  // 3. Send the message and wait for the AI's response
  const result = await chat.sendMessage(parts);
  
  // 4. Return the response text back to the controller
  return result.response.text();
};

