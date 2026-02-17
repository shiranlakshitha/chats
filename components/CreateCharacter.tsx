
import React, { useState } from 'react';
import { Character } from '../types';
import { saveCharacters, getCharacters } from '../store';
import { syncCharacterToCloud } from '../supabaseService';

interface CreateCharacterProps {
  onBack: () => void;
  onSuccess: (char: Character) => void;
}

const CreateCharacter: React.FC<CreateCharacterProps> = ({ onBack, onSuccess }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    userNickname: 'Anon',
    userDescription: '',
    personality: '',
    backstory: '',
    speakingStyle: '',
    scenarioPrompt: '',
    avatarUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    
    const newChar: Character = {
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      avatarUrl: formData.avatarUrl || `https://picsum.photos/seed/${formData.name}/400/400`,
      createdAt: Date.now()
    };
    
    try {
      const existing = getCharacters();
      saveCharacters([...existing, newChar]);
      await syncCharacterToCloud(newChar);
      onSuccess(newChar);
    } catch (e) {
      console.error(e);
      onSuccess(newChar);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button onClick={onBack} className="text-zinc-500 hover:text-white mb-8 text-sm uppercase font-bold tracking-widest flex items-center gap-2">
        ← cancel
      </button>

      <div className="bg-[#161618] border border-[#2d2d30] rounded-xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Character</h1>
        <p className="text-zinc-500 mb-8 text-sm">Design the soul of your next story.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Character Name</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full perchance-input rounded-md px-4 py-3"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bot Description</label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full perchance-input rounded-md px-4 py-3 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Your Nickname</label>
              <input 
                value={formData.userNickname}
                onChange={e => setFormData({...formData, userNickname: e.target.value})}
                className="w-full perchance-input rounded-md px-4 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avatar URL</label>
              <input 
                value={formData.avatarUrl}
                onChange={e => setFormData({...formData, avatarUrl: e.target.value})}
                className="w-full perchance-input rounded-md px-4 py-2"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSyncing}
            className="w-full bg-white text-black font-bold py-4 rounded-lg hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest"
          >
            {isSyncing ? 'Synchronizing...' : 'Create Character'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCharacter;