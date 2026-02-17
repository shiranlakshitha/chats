
import { GoogleGenAI } from "@google/genai";
import { Character, Chat } from "./types";

export const generateRoleplayResponse = async (
  character: Character,
  chat: Chat,
  onChunk: (chunk: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
You are an immersive roleplay engine for a site like Perchance. 

CHARACTER CONTEXT:
Bot: ${character.name}
Bot Description: ${character.description}
User: ${character.userNickname}
User Description: ${character.userDescription}

SCENARIO & LORE:
${character.scenarioPrompt}

WRITING STYLE INSTRUCTIONS:
${chat.writingInstructions || "Stay in character. Be descriptive. Use *asterisks* for actions."}
${chat.longResponses ? "Provide very long, detailed, and multi-paragraph responses." : "Keep responses focused and concise."}

GOAL FOR NEXT MESSAGE:
${chat.nextEventPrompt || "Continue the story naturally."}

CORE RULES:
1. Never speak as the User.
2. Always stay in character as ${character.name}.
3. The Chat Log provided in the conversation is the full history. 
4. Do not include character names in the response unless starting a new line in a script format.
`;

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
        temperature: 0.9,
      }
    });

    const text = response.text || "";
    // Clean bot name from beginning if model added it
    const cleaned = text.replace(new RegExp(`^${character.name}: `, 'i'), '');
    return cleaned.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const brainstormField = async (fieldName: string, currentContext: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const fieldLabel = fieldName === 'description' ? 'Bot Character' : (fieldName === 'userDescription' ? 'User Character' : 'Roleplay Scenario');
  const prompt = `Brainstorm a creative and immersive ${fieldLabel} description. 
  Current context: ${currentContext || "None"}. 
  Return only the description text.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt
  });
  return response.text?.trim() || "";
};
