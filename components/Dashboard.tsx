
import React from 'react';
import { Character } from '../types';

interface DashboardProps {
  characters: Character[];
  onChat: (id: string) => void;
  onNewChar: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ characters, onChat, onNewChar }) => {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">My Universe</h1>
          <p className="text-zinc-500">Choose a soul to speak with or manifest a new one.</p>
        </div>
        <button 
          onClick={onNewChar}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          New Character
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((char) => (
          <div 
            key={char.id} 
            className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300"
          >
            <div className="aspect-square relative overflow-hidden">
              <img 
                src={char.avatarUrl} 
                alt={char.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white mb-1">{char.name}</h3>
                <p className="text-zinc-400 text-sm line-clamp-1">{char.description}</p>
              </div>
            </div>
            <div className="p-5 flex gap-3">
              <button 
                onClick={() => onChat(char.id)}
                className="flex-1 bg-white/5 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium border border-white/10 hover:border-indigo-500 transition-all"
              >
                Chat
              </button>
              <button className="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={onNewChar}
          className="border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 hover:border-indigo-500/50 hover:bg-zinc-900/50 transition-all text-zinc-600 hover:text-indigo-400"
        >
          <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="font-semibold">Create Personas</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
