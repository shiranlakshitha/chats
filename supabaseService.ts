
import { createClient } from '@supabase/supabase-js';
import { Character, Chat } from './types';

// Accessing process.env which is injected by the platform
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null as any;

let initializationError: string | null = (supabaseUrl && supabaseKey) ? null : "Credentials missing";

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
  } catch (e: any) {
    console.error("Supabase Sync Error (Char):", e);
  }
};

export const deleteCharacterFromCloud = async (characterId: string) => {
  if (!supabase) return;
  try {
    await supabase.from('chats').delete().eq('characterId', characterId);
    await supabase.from('characters').delete().eq('id', characterId);
  } catch (e: any) {
    console.error("Supabase Delete Error:", e);
  }
};

export const syncChatToCloud = async (chat: Chat) => {
  if (!supabase) return;
  try {
    if (!chat.id) return;
    const { error } = await supabase
      .from('chats')
      .upsert(chat, { onConflict: 'id' });
    if (error) throw error;
  } catch (e: any) {
    console.error("Supabase Sync Error (Chat):", e);
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
