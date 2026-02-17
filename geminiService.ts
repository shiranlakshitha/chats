
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Character, Message, Chat } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateRoleplayResponse = async (
  character: Character,
  chat: Chat,
  onChunk: (chunk: string) => void
) => {
  const systemInstruction = `
You are a world-class roleplay AI engine. 
Current Bot Character: ${character.name}
Bot Description: ${character.description}
Bot Personality/Style: ${character.personality} ${character.speakingStyle}

User Persona: ${character.userNickname}
User Description: ${character.userDescription}

Scenario & Lore: ${character.scenarioPrompt}

WRITING INSTRUCTIONS:
${chat.writingInstructions || "Stay in character. Be descriptive. Use *asterisks* for actions."}
${chat.longResponses ? "Provide long, detailed, and multi-paragraph responses." : "Keep responses concise and snappy."}

Goal: ${chat.nextEventPrompt || "Continue the story naturally based on the recent logs."}

RULES:
1. Stay fully in character. Never mention being an AI.
2. If roleplaying as ${character.name}, speak in their unique voice.
3. Integrate narration and dialogue seamlessly.
4. Do not summarize; show, don't just tell.
`;

  const chatHistory = chat.messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: `${m.authorName ? `[${m.authorName}]: ` : ""}${m.content}` }]
  }));

  try {
    const streamResponse = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: chatHistory,
      config: {
        systemInstruction,
        temperature: 0.9,
      }
    });

    let fullText = "";
    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const brainstormField = async (fieldName: string, currentContext: string) => {
  const prompt = `Brainstorm a creative and immersive ${fieldName} for a roleplay character/scenario. 
  Current context: ${currentContext || "None"}. 
  Provide only the description text, no labels.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  return response.text;
};
