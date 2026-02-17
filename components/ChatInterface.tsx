
import React, { useState, useRef, useEffect } from 'react';
import { Chat, Character, Message } from '../types';
import { generateRoleplayResponse } from '../geminiService';
import { updateChatMessages } from '../store';
import { syncChatToCloud, isSupabaseEnabled } from '../supabaseService';

interface ChatInterfaceProps {
  chat: Chat;
  character: Character;
  onUpdateMessages: (messages: Message[]) => void;
}

const SYNC_THRESHOLD = 20;

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chat, character, onUpdateMessages }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'error'>('synced');
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, streamingContent, isTyping]);

  // Handle auto-sync threshold
  useEffect(() => {
    if (unsyncedCount >= SYNC_THRESHOLD && isSupabaseEnabled()) {
      handleSync();
    }
  }, [unsyncedCount]);

  const handleSync = async () => {
    if (!isSupabaseEnabled()) return;
    setSyncStatus('syncing');
    try {
      await syncChatToCloud(chat);
      setSyncStatus('synced');
      setUnsyncedCount(0);
    } catch (e) {
      console.error("Auto-sync failed", e);
      setSyncStatus('error');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };

    const newMessages = [...chat.messages, userMessage];
    onUpdateMessages(newMessages);
    updateChatMessages(chat.id, newMessages);
    setInputText('');
    setIsTyping(true);
    setSyncStatus('pending');
    setUnsyncedCount(prev => prev + 1);

    try {
      const fullResponse = await generateRoleplayResponse(
        character,
        { ...chat, messages: newMessages },
        (chunk) => setStreamingContent(chunk)
      );

      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      onUpdateMessages(finalMessages);
      updateChatMessages(chat.id, finalMessages);
      setStreamingContent('');
      setUnsyncedCount(prev => prev + 1);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: "*The connection flickers. Something went wrong...*",
        timestamp: Date.now(),
      };
      onUpdateMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto border-x border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <img src={character.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-zinc-700" alt={character.name} />
          <div>
            <h2 className="font-bold text-white leading-tight">{character.name}</h2>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-green-500 flex items-center gap-1 uppercase font-bold tracking-wider">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Active
              </p>
              {isSupabaseEnabled() && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                  <svg className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                  {syncStatus === 'synced' ? 'Supabase Synced' : syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : `Unsynced (${unsyncedCount}/${SYNC_THRESHOLD})`}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSupabaseEnabled() && (
             <button 
              onClick={handleSync}
              title="Sync to Cloud Now"
              className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
             </button>
          )}
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" onClick={() => {
            if(confirm("Are you sure you want to clear this chat?")) {
              updateChatMessages(chat.id, []);
              onUpdateMessages([]);
              setUnsyncedCount(SYNC_THRESHOLD); 
            }
          }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
        {chat.messages.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto bg-indigo-600/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
              <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 italic">"{character.scenarioPrompt}"</h3>
            <p className="text-zinc-500 max-w-xs mx-auto text-sm">Send a message to begin the immersion.</p>
          </div>
        )}

        {chat.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-lg transition-all ${
              msg.role === 'user' 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content.split(/(\*.*?\*)/g).map((part, i) => 
                  part.startsWith('*') && part.endsWith('*') 
                    ? <em key={i} className="text-indigo-200 not-italic opacity-90 font-medium">{part.slice(1, -1)}</em>
                    : part
                )}
              </div>
              <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl rounded-tl-none px-5 py-3 shadow-lg">
               <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {streamingContent.split(/(\*.*?\*)/g).map((part, i) => 
                  part.startsWith('*') && part.endsWith('*') 
                    ? <em key={i} className="text-indigo-200 not-italic opacity-90 font-medium">{part.slice(1, -1)}</em>
                    : part
                )}
              </div>
            </div>
          </div>
        )}

        {isTyping && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-zinc-950 border-t border-zinc-800">
        <form onSubmit={handleSend} className="relative group">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Type as yourself or a character...`}
            className="w-full bg-zinc-900 text-white border border-zinc-800 rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-500 transition-all resize-none min-h-[60px] max-h-48"
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className={`absolute right-3 bottom-3 p-2.5 rounded-xl transition-all ${
              inputText.trim() && !isTyping 
              ? 'bg-indigo-600 text-white hover:scale-105 shadow-lg shadow-indigo-600/20' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </form>
        <div className="flex justify-between items-center mt-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            Immersive Session Active
          </p>
          <p className="text-[10px] text-zinc-600 font-bold uppercase">
            {inputText.length} chars
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;