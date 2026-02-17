
import { Character, Chat, Message } from './types';
import { syncChatToCloud } from './supabaseService';

const CHARACTERS_KEY = 'dreamspeak_characters';
const CHATS_KEY = 'dreamspeak_chats';

const INITIAL_CHARACTERS: Character[] = [
  {
    id: '1',
    name: 'Elara Windrunner',
    description: 'A wise and enigmatic wood elf ranger.',
    userNickname: 'Stranger',
    userDescription: 'A traveler lost in the woods.',
    personality: 'Calm, observant, deeply connected to nature.',
    backstory: 'Guarding the Whispering Woods for centuries.',
    speakingStyle: 'Poetic, soft but firm.',
    scenarioPrompt: 'You encounter Elara at the edge of the ancient forest as dusk falls.',
    avatarUrl: 'https://picsum.photos/seed/elara/400/400',
    createdAt: Date.now(),
  },
  {
    id: '2',
    name: 'Captain Jax Silver',
    description: 'A charismatic sky pirate with a mechanical arm.',
    userNickname: 'Stowaway',
    userDescription: 'Hiding in the cargo hold.',
    personality: 'Daring, witty, cynical about authority.',
    backstory: 'Lost his arm in a battle against the Cloud Navy.',
    speakingStyle: 'Rough, uses nautical slang.',
    scenarioPrompt: 'Jax finds you stowed away on his airship, the "Vagabond", mid-flight.',
    avatarUrl: 'https://picsum.photos/seed/jax/400/400',
    createdAt: Date.now(),
  }
];

export const getCharacters = (): Character[] => {
  const data = localStorage.getItem(CHARACTERS_KEY);
  if (!data) {
    saveCharacters(INITIAL_CHARACTERS);
    return INITIAL_CHARACTERS;
  }
  return JSON.parse(data);
};

export const saveCharacters = (chars: Character[]) => {
  localStorage.setItem(CHARACTERS_KEY, JSON.stringify(chars));
};

export const deleteCharacter = (id: string) => {
  const chars = getCharacters().filter(c => c.id !== id);
  saveCharacters(chars);
  
  const chats = getChats().filter(c => c.characterId !== id);
  saveChats(chats);
};

export const getChats = (): Chat[] => {
  const data = localStorage.getItem(CHATS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveChats = (chats: Chat[]) => {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
};

export const createNewChat = (characterId: string): Chat => {
  const newChat: Chat = {
    id: Math.random().toString(36).substr(2, 9),
    characterId,
    messages: [],
    updatedAt: Date.now(),
    longResponses: false
  };
  const chats = getChats();
  const updated = [newChat, ...chats];
  saveChats(updated);
  syncChatToCloud(newChat).catch(console.error);
  return newChat;
};

export const updateChatMessages = (chatId: string, messages: Message[]) => {
  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;
  
  const updatedChat = { ...chat, messages, updatedAt: Date.now() };
  const updatedChats = chats.map(c => c.id === chatId ? updatedChat : c);
  saveChats(updatedChats);
  return updatedChat;
};
