
import React from 'react';
import { View, Chat, Character } from '../types';
import { isSupabaseEnabled } from '../supabaseService';

interface SidebarProps {
  onNavigate: (view: View) => void;
  activeView: View;
  chats: Chat[];
  characters: Character[];
  onSelectChat: (id: string) => void;
  activeChatId: string | null;
  isCloudSyncing?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onNavigate, 
  activeView, 
  chats, 
  characters,
  onSelectChat,
  activeChatId,
  isCloudSyncing
}) => {
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">D</div>
            <span className="text-xl font-bold tracking-tight text-white">DreamSpeak</span>
          </div>
          {isCloudSyncing && (
            <div className="animate-spin text-indigo-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => onNavigate('main')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'main' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Dashboard
          </button>
          <button 
            onClick={() => onNavigate('create')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === 'create' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Create Persona
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Recent Realities</h3>
          <div className="space-y-1">
            {chats.length === 0 && (
              <p className="px-3 text-xs text-zinc-700 italic">The void is silent.</p>
            )}
            {chats.map(chat => {
              const char = characters.find(c => c.id === chat.characterId);
              if (!char) return null;
              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${activeChatId === chat.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 border border-transparent'}`}
                >
                  <img src={char.avatarUrl} className="w-7 h-7 rounded-full object-cover border border-zinc-800" alt="" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate font-medium">{char.name}</p>
                    <p className="text-[10px] opacity-50 truncate">{chat.messages.length} messages</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">U</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Adventurer</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
              {isSupabaseEnabled() ? 'Supabase Active' : 'Offline Mode'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;