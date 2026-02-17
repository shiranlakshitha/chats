
export interface Character {
  id: string;
  name: string;
  description: string;
  userNickname: string;
  userDescription: string;
  personality: string;
  backstory: string;
  speakingStyle: string;
  scenarioPrompt: string;
  avatarUrl: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'narrator';
  content: string;
  timestamp: number;
  authorName?: string;
}

export interface Chat {
  id: string;
  characterId: string;
  messages: Message[];
  updatedAt: number;
  nextEventPrompt?: string;
  writingInstructions?: string;
  longResponses?: boolean;
}

export type View = 'main' | 'create';
