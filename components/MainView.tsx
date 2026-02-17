
import React, { useState, useRef, useEffect } from 'react';
import { Character, Chat, Message } from '../types';
import { generateRoleplayResponse, brainstormField } from '../geminiService';
import { syncChatToCloud, syncCharacterToCloud, isSupabaseEnabled, getSupabaseError } from '../supabaseService';

interface MainViewProps {
  characters: Character[];
  activeChat: Chat | null;
  activeChar: Character | null;
  onSelectCharacter: (id: string) => void;
  onCreateNew: () => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateChat: (chat: Chat) => void;
  onUpdateChar: (char: Character) => void;
}

const SYNC_THRESHOLD = 10;

const MainView: React.FC<MainViewProps> = ({ 
  characters, activeChat, activeChar, onSelectCharacter, onCreateNew, onDeleteCharacter, onUpdateChat, onUpdateChar 
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeRole, setActiveRole] = useState<'user' | 'assistant' | 'narrator'>('user');
  
  // Sync States
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (force = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      const scrollHeight = container.scrollHeight;
      const height = container.clientHeight;
      const maxScrollTop = scrollHeight - height;
      const isNearBottom = container.scrollTop > maxScrollTop - 150;
      
      if (force || isNearBottom) {
        container.scrollTo({
          top: scrollHeight,
          behavior: force ? 'auto' : 'smooth'
        });
      }
    });
  };

  useEffect(() => {
    if (streamingContent || isTyping) {
      scrollToBottom();
    }
  }, [streamingContent, isTyping]);

  useEffect(() => {
    scrollToBottom(true);
  }, [activeChat?.id]);

  useEffect(() => {
    if (unsyncedCount >= SYNC_THRESHOLD && isSupabaseEnabled() && activeChat) {
      handleManualSync();
    }
  }, [unsyncedCount]);

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 text-center px-4">
        <h2 className="text-2xl font-bold text-zinc-200 uppercase tracking-widest">No Personas Found</h2>
        <p className="text-zinc-500 max-w-md text-sm leading-relaxed">The universe is silent. Create a new character to begin your story.</p>
        <button 
          onClick={onCreateNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 uppercase tracking-wider text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Create Character
        </button>
      </div>
    );
  }

  if (!activeChar || !activeChat) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Waking up the simulation...</p>
    </div>
  );

  const handleManualSync = async () => {
    if (!isSupabaseEnabled() || !activeChat || !activeChar) return;
    setSyncStatus('syncing');
    try {
      await Promise.all([
        syncChatToCloud(activeChat),
        syncCharacterToCloud(activeChar)
      ]);
      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setUnsyncedCount(0);
    } catch (e) {
      console.error("Manual Sync Failed:", e);
      setSyncStatus('error');
    }
  };

  const handleClearChat = () => {
    if (!activeChat) return;
    if (confirm("Are you sure you want to delete all messages in this chat? This cannot be undone.")) {
      // 1. Create the updated chat object
      const updatedChat = { ...activeChat, messages: [] };
      // 2. Pass to parent (App.tsx) which updates React State AND LocalStorage
      onUpdateChat(updatedChat);
      
      // 3. Mark for eventual cloud sync
      setSyncStatus('pending');
      setUnsyncedCount(prev => prev + 1);
    }
  };

  const handleFieldBlur = () => {
    if (syncStatus === 'pending') {
      handleManualSync();
    }
  };

  const handleUpdateCharLocal = (updated: Character) => {
    onUpdateChar(updated);
    setSyncStatus('pending');
    setUnsyncedCount(prev => prev + 1);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: activeRole,
      content: inputText,
      timestamp: Date.now(),
      authorName: activeRole === 'user' ? activeChar.userNickname : (activeRole === 'assistant' ? activeChar.name : 'Narrator')
    };

    const updatedMessages = [...activeChat.messages, newMessage];
    const updatedChat = { ...activeChat, messages: updatedMessages };
    
    // Update local state and storage immediately via parent
    onUpdateChat(updatedChat);
    
    setInputText('');
    setIsTyping(true);
    setSyncStatus('pending');
    setUnsyncedCount(prev => prev + 1);

    try {
      const fullResponse = await generateRoleplayResponse(activeChar, updatedChat, (chunk) => setStreamingContent(chunk));
      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
        authorName: activeChar.name
      };
      
      const finalChat = { ...updatedChat, messages: [...updatedMessages, assistantMessage] };
      onUpdateChat(finalChat);
      setStreamingContent('');
      setUnsyncedCount(prev => prev + 1);
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    } finally {
      setIsTyping(false);
      scrollToBottom(true);
    }
  };

  const handleBrainstorm = async (field: keyof Character) => {
    try {
      const result = await brainstormField(field, activeChar[field] as string);
      handleUpdateCharLocal({ ...activeChar, [field]: result });
      setTimeout(handleManualSync, 500);
    } catch (e) { console.error(e); }
  };

  const supabaseError = getSupabaseError();

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Supabase Error Guidance */}
      {supabaseError && (
        <div className="mb-6 bg-red-900/10 border border-red-500/50 p-6 rounded-xl text-red-200 shadow-2xl">
          <div className="flex items-center gap-3 mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h2 className="font-bold uppercase tracking-widest text-sm">Action Required: Supabase Setup</h2>
          </div>
          <p className="text-xs mb-4 leading-relaxed opacity-90">{supabaseError}</p>
          <div className="bg-black/30 p-4 rounded-lg space-y-2 border border-white/5">
            <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">How to fix this in 30 seconds:</p>
            <ol className="text-xs list-decimal list-inside space-y-3 opacity-80 font-mono">
              <li>Open your <a href="https://supabase.com/dashboard/project/uxdkvoqdpogakvzgzhii/sql" target="_blank" className="text-indigo-400 underline font-bold">Supabase SQL Editor</a></li>
              <li>Copy and Run this SQL:
                <pre className="bg-black/80 p-3 mt-2 text-[9px] text-zinc-300 overflow-x-auto rounded border border-white/10 selection:bg-indigo-500/50">
{`CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  "userNickname" TEXT,
  "userDescription" TEXT,
  personality TEXT,
  backstory TEXT,
  "speakingStyle" TEXT,
  "scenarioPrompt" TEXT,
  "avatarUrl" TEXT,
  "createdAt" BIGINT
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  "characterId" TEXT REFERENCES characters(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  "updatedAt" BIGINT,
  "writingInstructions" TEXT,
  "longResponses" BOOLEAN DEFAULT false,
  "nextEventPrompt" TEXT
);

-- Enable Public Access
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON characters FOR ALL USING (true);
CREATE POLICY "Public Access" ON chats FOR ALL USING (true);`}
                </pre>
              </li>
            </ol>
          </div>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-400 transition-all">Retry Connection</button>
        </div>
      )}

      {/* Top Character Strip */}
      <div className="flex gap-1 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {characters.map(c => (
          <div key={c.id} className="relative group flex-shrink-0">
            <button 
              onClick={() => onSelectCharacter(c.id)}
              className={`w-48 flex items-start gap-2 p-2 border transition-all rounded h-full ${activeChar.id === c.id ? 'bg-[#1c1c1f] border-zinc-700 text-white shadow-xl' : 'bg-[#121214] border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-700'}`}
            >
              <img src={c.avatarUrl} className="w-12 h-12 rounded bg-zinc-800 object-cover flex-shrink-0" />
              <div className="text-left overflow-hidden pr-4">
                <p className="text-[11px] font-bold truncate text-indigo-400">{c.name}</p>
                <p className="text-[10px] text-zinc-500 leading-tight line-clamp-2">{c.description || "No description..."}</p>
              </div>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteCharacter(c.id); }}
              className="absolute top-1 right-1 p-1 bg-black/40 hover:bg-red-600 rounded text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
              title="Delete Bot"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
        <button 
          onClick={onCreateNew} 
          className="flex-shrink-0 w-12 h-16 flex items-center justify-center bg-[#121214] border border-dashed border-zinc-800 rounded hover:border-indigo-500 hover:bg-indigo-500/5 transition-all"
        >
          <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="divider">— Names —</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input 
            className="perchance-input rounded px-3 py-2 text-xs font-mono" 
            placeholder="The bot's nickname" 
            value={activeChar.name}
            onChange={(e) => handleUpdateCharLocal({...activeChar, name: e.target.value})}
            onBlur={handleFieldBlur}
          />
          <input 
            className="perchance-input rounded px-3 py-2 text-xs font-mono" 
            placeholder="Your nickname" 
            value={activeChar.userNickname}
            onChange={(e) => handleUpdateCharLocal({...activeChar, userNickname: e.target.value})}
            onBlur={handleFieldBlur}
          />
        </div>

        <div className="divider">— Bot Character Description —</div>
        <div className="relative group">
          <textarea 
            className="perchance-input w-full rounded px-4 py-3 text-xs min-h-[120px] font-mono leading-relaxed"
            placeholder="(Optional) Describe who the AI/bot is..."
            value={activeChar.description}
            onChange={(e) => handleUpdateCharLocal({...activeChar, description: e.target.value})}
            onBlur={handleFieldBlur}
          />
          <button onClick={() => handleBrainstorm('description')} className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-zinc-800/80 rounded hover:bg-indigo-600 text-[9px] uppercase font-bold tracking-tighter backdrop-blur transition-all">✨ generate</button>
        </div>

        <div className="divider">— Scenario & Lore —</div>
        <div className="relative group">
          <textarea 
            className="perchance-input w-full rounded px-4 py-3 text-xs min-h-[100px] font-mono leading-relaxed"
            placeholder="(Optional) Describe the world, scenario overview, lore..."
            value={activeChar.scenarioPrompt}
            onChange={(e) => handleUpdateCharLocal({...activeChar, scenarioPrompt: e.target.value})}
            onBlur={handleFieldBlur}
          />
          <button onClick={() => handleBrainstorm('scenarioPrompt')} className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-zinc-800/80 rounded hover:bg-indigo-600 text-[9px] uppercase font-bold tracking-tighter backdrop-blur transition-all">✨ generate</button>
        </div>

        <div className="divider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>— Chat Logs —</span>
             <button 
                onClick={handleClearChat}
                className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                title="Clear Chat"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          {isSupabaseEnabled() && (
            <div className={`text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${syncStatus === 'error' ? 'text-red-500' : 'text-zinc-600'}`}>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border ${syncStatus === 'synced' ? 'border-green-500/30 text-green-400' : 'border-zinc-800 text-zinc-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : syncStatus === 'syncing' ? 'bg-indigo-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                {syncStatus === 'synced' ? `Synced ${lastSyncedAt || ''}` : 
                 syncStatus === 'syncing' ? 'Saving...' : 
                 syncStatus === 'error' ? 'Sync Error' : 
                 `Cloud Ready`}
              </span>
              <button onClick={handleManualSync} className="hover:text-indigo-400 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700 text-[9px]">Sync Now</button>
            </div>
          )}
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="perchance-input w-full rounded h-[500px] overflow-y-auto p-8 rp-log text-[#efeff1] shadow-inner bg-[#0e0e10]"
        >
          {activeChat.messages.length === 0 && (
            <div className="text-zinc-600 text-sm italic py-10 text-center">
               The chat log is currently empty. Send a message to begin.
            </div>
          )}
          {activeChat.messages.map((m) => (
            <div key={m.id} className="mb-5 leading-relaxed shrink-0">
               <span className="font-bold text-indigo-400">[{m.authorName}]: </span>
               <span className="text-zinc-300">
                {m.content.split(/(\*.*?\*)/g).map((part, i) => 
                  part.startsWith('*') ? <em key={i} className="text-zinc-500 font-medium italic">{part}</em> : part
                )}
               </span>
            </div>
          ))}
          {streamingContent && (
             <div className="mb-5 leading-relaxed shrink-0">
                <span className="font-bold text-indigo-400">[{activeChar.name}]: </span>
                <span className="text-zinc-300">{streamingContent}</span>
             </div>
          )}
          {isTyping && !streamingContent && <div className="text-indigo-500/50 text-[10px] animate-pulse font-mono tracking-widest py-2 uppercase shrink-0">Receiving transmission...</div>}
        </div>

        <div className="space-y-4 pt-4">
          <textarea 
            className="perchance-input w-full rounded px-4 py-4 text-xs min-h-[100px] font-mono leading-relaxed focus:ring-1 focus:ring-indigo-500/50"
            placeholder="Write here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
             <button 
              onClick={handleSend} 
              disabled={isTyping}
              className="w-full sm:w-auto min-w-[240px] bg-zinc-100 text-black px-10 py-3.5 rounded font-bold hover:bg-white transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest active:scale-95 disabled:opacity-50 shadow-xl"
            >
              send message
            </button>
            <div className="flex items-center gap-1 bg-[#161618] p-1 rounded border border-zinc-800">
              {['user', 'assistant', 'narrator'].map(role => (
                <button 
                  key={role} 
                  onClick={() => setActiveRole(role as any)}
                  className={`px-3 py-1.5 text-[9px] font-bold rounded uppercase tracking-tighter transition-all ${activeRole === role ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
             <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">
                Auto-Syncing every {SYNC_THRESHOLD} messages • <span className={unsyncedCount > 0 ? 'text-yellow-500' : 'text-green-500'}>{unsyncedCount}/{SYNC_THRESHOLD} pending</span>
             </p>
          </div>
        </div>

        <footer className="text-center pb-12 pt-12">
          <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-[0.2em]">
            DreamSpeak AI &bull; Immersive Roleplay &bull; Gemini Engine
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MainView;
