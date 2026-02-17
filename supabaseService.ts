
import { createClient } from '@supabase/supabase-js';
import { Character, Chat } from './types';

// Safely access process.env for browser environments
const getEnv = (key: string) => {
  try {
    return (process && process.env && process.env[key]) || "";
  } catch (e) {
    return "";
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing or process.env unavailable. Cloud sync will be disabled.");
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null as any;

let initializationError: string | null = null;

export const isSupabaseEnabled = () => !!supabase && initializationError === null;
export const getSupabaseError = () => initializationError;

export const testSupabaseConnection = async () => {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from('characters').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "characters" does not exist')) {
        initializationError = "TABLES NOT FOUND: Please create 'characters' and 'chats' tables in your Supabase SQL Editor.";
      } else {
        initializationError = error.message;
      }
      return false;
    }
    initializationError = null;
    return true;
  } catch (e: any) {
    initializationError = e.message;
    return false;
  }
};

export const syncCharacterToCloud = async (character: Character) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('characters')
      .upsert(character, { onConflict: 'id' });
    if (error) throw error;
    console.log(`Cloud Sync (Char): ${character.name}`);
  } catch (e: any) {
    console.error("Supabase Sync Error (Char):", e);
    initializationError = e.message;
  }
};

export const deleteCharacterFromCloud = async (characterId: string) => {
  if (!supabase) return;
  try {
    const { error: chatError } = await supabase
      .from('chats')
      .delete()
      .eq('characterId', characterId);
    
    if (chatError) throw chatError;

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId);
    
    if (error) throw error;
    console.log(`Cloud Delete: ${characterId}`);
  } catch (e: any) {
    console.error("Supabase Delete Error:", e);
  }
};

export const syncChatToCloud = async (chat: Chat) => {
  if (!supabase) return;
  try {
    if (!chat.id || chat.messages.length === 0) return;
    const { error } = await supabase
      .from('chats')
      .upsert(chat, { onConflict: 'id' });
    if (error) throw error;
    console.log(`Cloud Sync (Chat): ${chat.id}`);
  } catch (e: any) {
    console.error("Supabase Sync Error (Chat):", e);
    initializationError = e.message;
    throw e;
  }
};

export const fetchAllCharactersFromCloud = async (): Promise<Character[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('characters').select('*');
    if (error) throw error;
    return data as Character[];
  } catch (e) {
    console.error("Supabase Fetch Failed (Chars):", e);
    return [];
  }
};

export const fetchAllChatsFromCloud = async (): Promise<Chat[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('chats').select('*');
    if (error) throw error;
    return data as Chat[];
  } catch (e) {
    console.error("Supabase Fetch Failed (Chats):", e);
    return [];
  }
};
