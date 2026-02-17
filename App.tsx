
import React, { useState, useEffect } from 'react';
import { Character, Chat } from './types';
import { getCharacters, getChats, createNewChat, saveCharacters, saveChats, deleteCharacter } from './store';
import { isSupabaseEnabled, fetchAllCharactersFromCloud, fetchAllChatsFromCloud, syncCharacterToCloud, testSupabaseConnection, deleteCharacterFromCloud } from './supabaseService';
import MainView from './components/MainView';

const App: React.FC = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Always load local first so the app works immediately
      const localChars = getCharacters();
      const localChats = getChats();
      setCharacters(localChars);
      setChats(localChats);

      // Attempt to wake up Supabase
      await testSupabaseConnection();

      if (isSupabaseEnabled()) {
        try {
          const cloudChars = await fetchAllCharactersFromCloud();
          const cloudChats = await fetchAllChatsFromCloud();
          
          // Merge logic: prefer cloud data if it exists
          if (cloudChars.length > 0) {
             setCharacters(cloudChars);
             saveCharacters(cloudChars);
          }
          if (cloudChats.length > 0) {
             setChats(cloudChats);
             saveChats(cloudChats);
          }
        } catch (e) { console.error(e); }
      }
    };
    loadData();
  }, []);

  const handleSelectCharacter = (charId: string) => {
    const existingChat = chats.find(c => c.characterId === charId);
    if (existingChat) {
      setActiveChatId(existingChat.id);
    } else {
      const newChat = createNewChat(charId);
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
    }
  };

  const handleCreateNewCharacter = async () => {
    const newChar: Character = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Bot',
      description: '',
      userNickname: 'Anon',
      userDescription: '',
      personality: '',
      backstory: '',
      speakingStyle: '',
      scenarioPrompt: '',
      avatarUrl: `https://picsum.photos/seed/${Math.random()}/400/400`,
      createdAt: Date.now()
    };
    
    const updatedChars = [newChar, ...characters];
    setCharacters(updatedChars);
    saveCharacters(updatedChars);
    
    if (isSupabaseEnabled()) {
      await syncCharacterToCloud(newChar);
    }
    
    handleSelectCharacter(newChar.id);
  };

  const handleDeleteCharacter = (id: string) => {
    if (!confirm("Are you sure you want to delete this bot and all its chats?")) return;
    
    // 1. Calculate new state locally first
    const updatedChars = characters.filter(c => c.id !== id);
    const updatedChats = chats.filter(c => c.characterId !== id);
    
    // 2. Determine new active ID immediately to prevent UI flicker/errors
    let newActiveId = activeChatId;
    // If the active chat belongs to the deleted character, switch to the first available
    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.characterId === id) {
       // Find the chat for the first character in the updated list
       if (updatedChars.length > 0) {
          const nextCharId = updatedChars[0].id;
          const nextChat = updatedChats.find(c => c.characterId === nextCharId);
          newActiveId = nextChat ? nextChat.id : null;
          // If no chat exists for next char (rare), handleSelectCharacter will fix it on next render, 
          // but setting null triggers the empty state safely.
       } else {
          newActiveId = null;
       }
    }

    // 3. Apply Local Updates Synchronously
    setCharacters(updatedChars);
    setChats(updatedChats);
    setActiveChatId(newActiveId);
    
    // 4. Persist to Local Storage
    deleteCharacter(id);

    // 5. Cloud Update (Background / Fire & Forget)
    // We do NOT await this, so the UI update is instant.
    if (isSupabaseEnabled()) {
      deleteCharacterFromCloud(id).catch(err => {
        console.error("Background cloud delete failed (local delete succeeded):", err);
      });
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId) || (chats.length > 0 ? chats[0] : null);
  const activeChar = activeChat ? characters.find(c => c.id === activeChat.characterId) : (characters.length > 0 ? characters[0] : null);

  // Auto-select first character if none selected and characters exist
  useEffect(() => {
    if (characters.length > 0 && !activeChatId && !activeChat) {
      handleSelectCharacter(characters[0].id);
    }
  }, [characters, activeChatId]);

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#d1d1d6] selection:bg-indigo-500/30">
      <MainView 
        characters={characters}
        activeChat={activeChat}
        activeChar={activeChar}
        onSelectCharacter={handleSelectCharacter}
        onCreateNew={handleCreateNewCharacter}
        onDeleteCharacter={handleDeleteCharacter}
        onUpdateChat={(updated) => {
          // This updates the central state AND saves to localStorage
          const newChats = chats.map(c => c.id === updated.id ? updated : c);
          setChats(newChats);
          saveChats(newChats);
        }}
        onUpdateChar={(updated) => {
          const newChars = characters.map(c => c.id === updated.id ? updated : c);
          setCharacters(newChars);
          saveCharacters(newChars);
        }}
      />
    </div>
  );
};

export default App;
