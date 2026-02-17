
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
  const [editableLog, setEditableLog] = useState('');

  useEffect(() => {
    if (activeChat) {
      const log = activeChat.messages.map(m => 
        m.role === 'narrator' ? m.content : `${m.authorName}: ${m.content}`
      ).join('\n\n');
      setEditableLog(log);
      setSyncStatus('synced');
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
    
    const entries = newVal.split('\n\n').filter(e => e.trim());
    const newMessages: Message[] = entries.map(entry => {
      const colonIndex = entry.indexOf(': ');
      if (colonIndex !== -1) {
        const namePart = entry.substring(0, colonIndex);
        const contentPart = entry.substring(colonIndex + 2);
        const role = (namePart.toLowerCase() === activeChar.name.toLowerCase()) ? 'assistant' : 'user';
        return {
          id: Math.random().toString(36).substr(2, 9),
          authorName: namePart,
          content: contentPart,
          role: role,
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
    handleSync(updatedChat, activeChar);
  };

  const handleSend = async (overrideLog?: string) => {
    if (isTyping) return;
    
    let currentLog = overrideLog !== undefined ? overrideLog : editableLog;
    let currentAuthor = activeRole === 'user' ? (authorName || activeChar.userNickname) : (activeRole === 'assistant' ? activeChar.name : 'Narrator');
    
    if (inputText.trim()) {
      const newEntry = activeRole === 'narrator' ? inputText : `${currentAuthor}: ${inputText}`;
      currentLog = currentLog ? `${currentLog}\n\n${newEntry}` : newEntry;
      setEditableLog(currentLog);
      handleLogChange(currentLog);
      setInputText('');
    }

    setIsTyping(true);
    try {
      const response = await generateRoleplayResponse(activeChar, activeChat, () => {});
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
      logs.pop(); 
      const newLog = logs.join('\n\n');
      setEditableLog(newLog);
      handleLogChange(newLog);
      setTimeout(() => handleSend(newLog), 100);
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

  const handleBrainstormLocal = async (field: keyof Character) => {
    setSyncStatus('syncing');
    try {
      const res = await brainstormField(field, activeChar[field] as string);
      const updated = { ...activeChar, [field]: res };
      onUpdateChar(updated);
      handleSync(activeChat, updated);
    } catch (e) {
      setSyncStatus('error');
    }
  };

  return (
    <div className="perchance-container pb-20">
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide border-b border-[#222]">
        {characters.map(c => (
          <div 
            key={c.id} 
            className={`relative group shrink-0 w-44 border p-2 flex gap-2 cursor-pointer transition-colors ${activeChar.id === c.id ? 'bg-[#121215] border-zinc-600 shadow-[0_0_10px_rgba(39,39,42,0.5)]' : 'bg-[#0a0a0c] border-[#222] opacity-60 hover:opacity-100'}`} 
            onClick={() => onSelectCharacter(c.id)}
          >
             <img src={c.avatarUrl} className="w-10 h-10 object-cover rounded" />
             <div className="min-w-0">
                <p className="text-[11px] font-bold text-blue-400 truncate">{c.name}</p>
                <p className="text-[9px] text-zinc-500 line-clamp-2 leading-tight">{c.description || "..."}</p>
             </div>
             <button onClick={(e) => { e.stopPropagation(); onDeleteCharacter(c.id); }} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-600 rounded-full p-0.5 text-white scale-75 hover:bg-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
         <button onClick={onCreateNew} className="pc-btn text-[10px] uppercase font-bold tracking-[0.2em] px-6 py-2">✨ generate a character</button>
      </div>

      <div className="divider">— Names —</div>
      <div className="grid grid-cols-2 gap-2">
         <input className="pc-input text-center font-mono" placeholder="The bot's nickname" value={activeChar.name} onChange={e => onUpdateChar({...activeChar, name: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
         <input className="pc-input text-center font-mono" placeholder="Your nickname" value={activeChar.userNickname} onChange={e => onUpdateChar({...activeChar, userNickname: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
      </div>

      <div className="divider">— Bot Character Description —</div>
      <div className="relative">
        <textarea className="pc-input min-h-[100px] font-serif" placeholder="(Optional) Describe the AI..." value={activeChar.description} onChange={e => onUpdateChar({...activeChar, description: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
        <div className="flex justify-center mt-1"><button onClick={() => handleBrainstormLocal('description')} className="pc-btn text-[9px]">✨ generate</button></div>
      </div>

      <div className="divider">— Anon Character Description —</div>
      <div className="relative">
        <textarea className="pc-input min-h-[100px] font-serif" placeholder="(Optional) Your persona..." value={activeChar.userDescription} onChange={e => onUpdateChar({...activeChar, userDescription: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
        <div className="flex justify-center mt-1"><button onClick={() => handleBrainstormLocal('userDescription')} className="pc-btn text-[9px]">✨ generate</button></div>
      </div>

      <div className="divider">— Scenario & Lore —</div>
      <div className="relative">
        <textarea className="pc-input min-h-[100px] font-serif" placeholder="(Optional) World & Scenario..." value={activeChar.scenarioPrompt} onChange={e => onUpdateChar({...activeChar, scenarioPrompt: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
        <div className="flex justify-center mt-1"><button onClick={() => handleBrainstormLocal('scenarioPrompt')} className="pc-btn text-[9px]">✨ generate</button></div>
      </div>

      <div className="divider relative">— Chat Logs —<button onClick={handleDeleteLast} className="absolute right-0 pc-btn text-[9px]">↩ undo</button></div>
      <div className="relative">
        <textarea 
          className="pc-input min-h-[450px] font-serif text-[15px] leading-relaxed p-6 bg-[#08080a] border-[#222]" 
          value={editableLog}
          onChange={e => setEditableLog(e.target.value)}
          onBlur={e => handleLogChange(e.target.value)}
          placeholder="The chat logs will show up here..."
        />
        <div className="flex justify-center gap-4 mt-3">
           <button onClick={handleRegen} className="pc-btn text-[11px] px-6 py-1.5 hover:bg-zinc-800">regen</button>
           <button onClick={handleDeleteLast} className="pc-btn text-[11px] px-6 py-1.5 hover:bg-zinc-800">delete last</button>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <textarea className="pc-input min-h-[100px] p-5" placeholder="Write here and tap send..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        <div className="flex justify-center">
           <button onClick={() => handleSend()} disabled={isTyping} className="pc-btn pc-btn-primary px-20 py-5 text-[18px] uppercase tracking-[0.4em]">{isTyping ? 'Generating...' : 'send message'}</button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-8">
         {['Emma', 'Woman', 'Anon', 'Bot', 'Narrator'].map(name => (
           <button key={name} onClick={() => { setActiveRole(name === 'Narrator' ? 'narrator' : (name === 'Bot' ? 'assistant' : 'user')); setAuthorName(name); }} className={`pc-btn text-[11px] px-4 py-2 border ${authorName === name ? 'bg-zinc-800 border-zinc-500 text-white' : 'border-[#222]'}`}>{name}</button>
         ))}
         <button onClick={() => { if(confirm("Clear log?")) handleLogChange(''); }} className="pc-btn text-[11px] px-3">🗑</button>
      </div>

      <div className="mt-12 space-y-3 border-t border-[#1a1a1c] pt-10 max-w-3xl mx-auto">
         <input className="pc-input text-[12px] bg-transparent border-[#222]" placeholder="(Optional) What should happen next?" value={activeChat.nextEventPrompt || ''} onChange={e => onUpdateChat({...activeChat, nextEventPrompt: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
         <div className="relative">
           <textarea className="pc-input text-[12px] min-h-[60px] bg-transparent border-[#222]" placeholder="Writer instructions..." value={activeChat.writingInstructions || ''} onChange={e => onUpdateChat({...activeChat, writingInstructions: e.target.value})} onBlur={() => handleSync(activeChat, activeChar)} />
           <div className="flex items-center gap-2 absolute bottom-2 right-3 text-[10px] text-zinc-600 font-bold uppercase cursor-pointer">
              <input type="checkbox" id="long-res" checked={activeChat.longResponses} onChange={e => onUpdateChat({...activeChat, longResponses: e.target.checked})} onBlur={() => handleSync(activeChat, activeChar)} />
              <label htmlFor="long-res">long responses</label>
           </div>
         </div>
      </div>

      <div className="flex justify-center mt-12">
        <div className={`text-[10px] font-bold uppercase tracking-[0.2em] px-5 py-1.5 rounded-full border flex items-center gap-2.5 ${syncStatus === 'synced' ? 'border-green-900/40 text-green-600' : 'border-blue-900/40 text-blue-500'}`}>
          <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></span>
          {syncStatus === 'synced' ? '● sync ok' : '● syncing'}
        </div>
      </div>
    </div>
  );
};

export default MainView;
