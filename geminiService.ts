
import { GoogleGenAI } from "@google/genai";
import { Character, Chat } from "./types";

export const generateRoleplayResponse = async (
  character: Character,
  chat: Chat,
  onChunk: (chunk: string) => void
) => {
  // Always initialize with process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
You are an immersive roleplay engine.

CHARACTER CONTEXT:
Bot: ${character.name}
Bot Description: ${character.description}
User: ${character.userNickname}
User Description: ${character.userDescription}

SCENARIO & LORE:
${character.scenarioPrompt}

WRITING STYLE:
${chat.writingInstructions || "Immersive, descriptive, stay in character."}
${chat.longResponses ? "Write long, multi-paragraph responses." : "Keep responses concise and snappy."}

CORE RULES:
- Never speak for the user.
- Use *asterisks* for actions/physical descriptions.
- Stay strictly in character as ${character.name}.
`;

  // Convert messages to Gemini format
  const chatHistory = chat.messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: `${m.authorName ? `${m.authorName}: ` : ""}${m.content}` }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: chatHistory,
      config: {
        systemInstruction,
        temperature: 0.8,
        topP: 0.95,
      }
    });

    const text = response.text || "";
    // Remove potential name prefixing by the model
    return text.replace(new RegExp(`^${character.name}: `, 'i'), '').trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const brainstormField = async (fieldName: string, currentContext: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Brainstorm a creative and immersive description for a character/scenario field named "${fieldName}". 
  Context: ${currentContext || "Start from scratch"}. 
  Return only the generated description text.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt
  });
  return response.text?.trim() || "";
};
