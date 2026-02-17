
import React, { useState, useRef, useEffect } from 'react';
import { Character, Chat, Message } from '../types';
import { generateRoleplayResponse, brainstormField } from '../geminiService';
import { syncChatToCloud, syncCharacterToCloud, isSupabaseEnabled } from '../supabaseService';

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

const MainView: React.FC<MainViewProps> = ({ 
  characters, activeChat, activeChar, onSelectCharacter, onCreateNew, onDeleteCharacter, onUpdateChat, onUpdateChar 
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeRole, setActiveRole] = useState<'user' | 'assistant' | 'narrator'>('user');
  const [authorName, setAuthorName] = useState('Anon');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error'>('synced');
  
  // Perchance-style editable log string
  const [editableLog, setEditableLog] = useState('');

  // Initializing log from chat messages
  useEffect(() => {
    if (activeChat) {
      const log = activeChat.messages.map(m => 
        m.role === 'narrator' ? m.content : `${m.authorName}: ${m.content}`
      ).join('\n\n');
      setEditableLog(log);
    }
  }, [activeChat?.id]);

  if (characters.length === 0) {
    return (
      <div className="perchance-container text-center py-20">
        <button onClick={onCreateNew} className="pc-btn pc-btn-primary px-6 py-2">✨ generate a character</button>
      </div>
    );
  }

  if (!activeChar || !activeChat) return null;

  const handleSync = async (updatedChat: Chat, updatedChar: Character) => {
    if (!isSupabaseEnabled()) return;
    setSyncStatus('syncing');
    try {
      await Promise.all([
        syncChatToCloud(updatedChat),
        syncCharacterToCloud(updatedChar)
      ]);
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const handleLogChange = (newVal: string) => {
    setEditableLog(newVal);
    setSyncStatus('pending');
    
    // Parse the editable log back into messages for memory
    const entries = newVal.split('\n\n').filter(e => e.trim());
    const newMessages: Message[] = entries.map(entry => {
      const colonIndex = entry.indexOf(': ');
      if (colonIndex !== -1) {
        const namePart = entry.substring(0, colonIndex);
        const contentPart = entry.substring(colonIndex + 2);
        return {
          id: Math.random().toString(36).substr(2, 9),
          authorName: namePart,
          content: contentPart,
          role: namePart === activeChar.name ? 'assistant' : 'user',
          timestamp: Date.now()
        };
      }
      return {
        id: Math.random().toString(36).substr(2, 9),
        content: entry,
        role: 'narrator',
        timestamp: Date.now()
      };
    });
    
    const updatedChat = { ...activeChat, messages: newMessages };
    onUpdateChat(updatedChat);
    // Silent background sync
    handleSync(updatedChat, activeChar);
  };

  const handleSend = async () => {
    if (isTyping) return;
    
    let currentLog = editableLog;
    let currentAuthor = activeRole === 'user' ? activeChar.userNickname : (activeRole === 'assistant' ? activeChar.name : 'Narrator');
    
    if (inputText.trim()) {
      const newEntry = activeRole === 'narrator' ? inputText : `${currentAuthor}: ${inputText}`;
      currentLog = currentLog ? `${currentLog}\n\n${newEntry}` : newEntry;
      setEditableLog(currentLog);
      handleLogChange(currentLog);
      setInputText('');
    }

    setIsTyping(true);
    try {
      // Create a snapshot for the AI to process
      const chatSnapshot = { ...activeChat, messages: activeChat.messages };
      const response = await generateRoleplayResponse(activeChar, chatSnapshot, () => {});
      
      const botEntry = `${activeChar.name}: ${response}`;
      const finalLog = currentLog ? `${currentLog}\n\n${botEntry}` : botEntry;
      setEditableLog(finalLog);
      handleLogChange(finalLog);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRegen = async () => {
    const logs = editableLog.split('\n\n').filter(e => e.trim());
    if (logs.length > 0) {
      logs.pop(); // Remove bot's last response
      const newLog = logs.join('\n\n');
      setEditableLog(newLog);
      handleLogChange(newLog);
      setTimeout(handleSend, 100);
    }
  };

  const handleDeleteLast = () => {
    const logs = editableLog.split('\n\n').filter(e => e.trim());
    if (logs.length > 0) {
      logs.pop();
      const newLog = logs.join('\n\n');
      setEditableLog(newLog);
      handleLogChange(newLog);
    }
  };

  const handleUndo = () => {
    // Undo in Perchance typically removes the last entry added by either user or AI
    handleDeleteLast();
  };

  const handleBrainstormLocal = async (field: keyof Character) => {
    setSyncStatus('syncing');
    const res = await brainstormField(field, activeChar[field] as string);
    const updated = { ...activeChar, [field]: res };
    onUpdateChar(updated);
    handleSync(activeChat, updated);
  };

  return (
    <div className="perchance-container pb-20">
      {/* Character Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide border-b border-[#222]">
        {characters.map(c => (
          <div key={c.id} className="relative group shrink-0 w-44 bg-[#0a0a0c] border border-[#222] p-2 flex gap-2 cursor-pointer hover:border-zinc-600 transition-colors" onClick={() => onSelectCharacter(c.id)}>
             <img src={c.avatarUrl} className="w-10 h-10 object-cover rounded" />
             <div className="min-w-0">
                <p className="text-[11px] font-bold text-blue-400 truncate">{c.name}</p>
                <p className="text-[9px] text-zinc-500 line-clamp-2 leading-tight">{c.description || "..."}</p>
             </div>
             <button onClick={(e) => { e.stopPropagation(); onDeleteCharacter(c.id); }} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-600 rounded-full p-0.5 text-white scale-75"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
         <button onClick={onCreateNew} className="pc-btn text-[10px] uppercase font-bold tracking-[0.2em] px-6 py-2">✨ generate a character</button>
      </div>

      <div className="divider">— Names —</div>
      <div className="grid grid-cols-2 gap-2">
         <input className="pc-input text-center" placeholder="The bot's nickname" value={activeChar.name} onChange={e => onUpdateChar({...activeChar, name: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
         <input className="pc-input text-center" placeholder="Your nickname" value={activeChar.userNickname} onChange={e => onUpdateChar({...activeChar, userNickname: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
      </div>

      <div className="divider">— Bot Character Description —</div>
      <div className="relative">
        <textarea 
          className="pc-input min-h-[80px]" 
          placeholder="(Optional) Describe who the AI/bot is and what personality you want them to have."
          value={activeChar.description}
          onChange={e => onUpdateChar({...activeChar, description: e.target.value})}
          onBlur={() => handleSync(activeChat, activeChar)}
        />
        <div className="flex justify-center mt-1">
           <button onClick={() => handleBrainstormLocal('description')} className="pc-btn text-[9px] flex items-center gap-1">✨ generate</button>
        </div>
      </div>

      <div className="divider">— Anon Character Description —</div>
      <div className="relative">
        <textarea 
          className="pc-input min-h-[80px]" 
          placeholder="(Optional) Describe the character that *you* will be in this chat."
          value={activeChar.userDescription}
          onChange={e => onUpdateChar({...activeChar, userDescription: e.target.value})}
          onBlur={() => handleSync(activeChat, activeChar)}
        />
        <div className="flex justify-center mt-1">
           <button onClick={() => handleBrainstormLocal('userDescription')} className="pc-btn text-[9px] flex items-center gap-1">✨ generate</button>
        </div>
      </div>

      <div className="divider">— Scenario & Lore —</div>
      <div className="relative">
        <textarea 
          className="pc-input min-h-[80px]" 
          placeholder="(Optional) Describe the world, scenario overview, lore, side characters..."
          value={activeChar.scenarioPrompt}
          onChange={e => onUpdateChar({...activeChar, scenarioPrompt: e.target.value})}
          onBlur={() => handleSync(activeChat, activeChar)}
        />
        <div className="flex justify-center mt-1">
           <button onClick={() => handleBrainstormLocal('scenarioPrompt')} className="pc-btn text-[9px] flex items-center gap-1">✨ generate</button>
        </div>
      </div>

      <div className="divider relative">
        — Chat Logs —
        <button onClick={handleUndo} className="absolute right-0 pc-btn text-[9px] flex items-center gap-1">↩ undo</button>
      </div>
      
      <div className="relative">
        <textarea 
          className="pc-input min-h-[400px] font-serif text-[14px] leading-relaxed p-6 bg-[#08080a] border-[#222]" 
          value={editableLog}
          onChange={e => setEditableLog(e.target.value)}
          onBlur={e => handleLogChange(e.target.value)}
          placeholder="The chat logs will show up here, and you can edit them."
        />
        <div className="flex justify-center gap-4 mt-2">
           <button onClick={handleRegen} className="pc-btn text-[10px] flex items-center gap-1 px-4 py-1 border-[#333]"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> regen</button>
           <button onClick={handleDeleteLast} className="pc-btn text-[10px] flex items-center gap-1 px-4 py-1 border-[#333]">delete last</button>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="relative">
          <textarea 
            className="pc-input min-h-[80px] p-4 bg-[#111] border-[#333]" 
            placeholder="Write here and tap send, or just tap send to let the AI write..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <div className="flex items-center gap-1 absolute bottom-2 right-2 text-[10px] text-zinc-600 font-bold">
            <input type="checkbox" id="auto-improve" />
            <label htmlFor="auto-improve">auto-improve</label>
          </div>
        </div>

        <div className="flex justify-center">
           <button 
             onClick={handleSend}
             disabled={isTyping}
             className="pc-btn pc-btn-primary px-16 py-4 text-[16px] uppercase tracking-[0.3em] flex items-center gap-3 shadow-xl"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
             {isTyping ? 'generating...' : 'send message'}
           </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-1 mt-6">
         {['Emma', 'Woman', 'Anon', 'Bot', 'Narrator'].map(name => (
           <button 
             key={name}
             onClick={() => {
                const role = name === 'Narrator' ? 'narrator' : (name === 'Bot' ? 'assistant' : 'user');
                setActiveRole(role as any);
                setAuthorName(name);
             }}
             className={`pc-btn text-[10px] px-3 py-1 ${authorName === name ? 'bg-zinc-800 border-zinc-500 text-white shadow-lg' : ''}`}
           >
             <span className="opacity-40 mr-1">●</span> {name}
           </button>
         ))}
         <button className="pc-btn text-[10px]">+</button>
         <button onClick={() => setEditableLog('')} className="pc-btn text-[10px]"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
      </div>

      <div className="mt-10 space-y-2 border-t border-[#1a1a1c] pt-8 max-w-2xl mx-auto">
         <input 
            className="pc-input text-[11px] bg-transparent border-[#222]" 
            placeholder="(Optional) What should happen next?" 
            value={activeChat.nextEventPrompt || ''} 
            onChange={e => onUpdateChat({...activeChat, nextEventPrompt: e.target.value})}
            onBlur={() => handleSync(activeChat, activeChar)}
         />
         <div className="relative">
           <textarea 
              className="pc-input text-[11px] min-h-[50px] bg-transparent border-[#222]" 
              placeholder="(Optional) Brief writing instructions for the AI - e.g. general reminders, style, things to avoid..." 
              value={activeChat.writingInstructions || ''}
              onChange={e => onUpdateChat({...activeChat, writingInstructions: e.target.value})}
              onBlur={() => handleSync(activeChat, activeChar)}
           />
           <div className="flex items-center gap-2 absolute bottom-2 right-2 text-[10px] text-zinc-600 font-bold uppercase">
              <input 
                type="checkbox" 
                id="long-res"
                checked={activeChat.longResponses} 
                onChange={e => onUpdateChat({...activeChat, longResponses: e.target.checked})} 
                onBlur={() => handleSync(activeChat, activeChar)}
              />
              <label htmlFor="long-res">long responses</label>
           </div>
         </div>
      </div>

      <div className="flex justify-center gap-2 mt-8">
         <button className="pc-btn flex items-center gap-1 text-[10px] px-4 py-1.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> save this chat</button>
         <button className="pc-btn flex items-center gap-1 text-[10px] px-4 py-1.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> load</button>
         <button className="pc-btn flex items-center gap-1 text-[10px] px-4 py-1.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> share</button>
      </div>
      
      <div className="flex justify-center mt-12 mb-20">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded border ${syncStatus === 'synced' ? 'border-green-900/50 text-green-700' : 'border-yellow-900/50 text-yellow-700'}`}>
          {syncStatus === 'synced' ? '● sync ok' : syncStatus === 'syncing' ? '● syncing...' : '● local memory only'}
        </span>
      </div>
      
      <footer className="text-center pb-20 opacity-10">
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.8em]">DreamSpeak RP Engine</p>
      </footer>
    </div>
  );
};

export default MainView;
