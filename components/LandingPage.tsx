
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full"></div>

      <div className="max-w-4xl text-center z-10">
        <div className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider text-indigo-400 uppercase bg-indigo-400/10 rounded-full border border-indigo-500/20">
          Powered by Gemini 3 Flash
        </div>
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          DreamSpeak AI
        </h1>
        <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          The ultimate platform for character-driven AI roleplay. Create deep personas, 
          embark on epic journeys, and experience immersive storytelling without limits.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onStart}
            className="px-8 py-4 bg-white text-zinc-950 rounded-xl font-bold text-lg hover:bg-zinc-200 transition-all transform hover:scale-105"
          >
            Start Chatting
          </button>
          <button 
            onClick={onStart}
            className="px-8 py-4 bg-zinc-900 text-white rounded-xl font-bold text-lg border border-zinc-800 hover:bg-zinc-800 transition-all"
          >
            Create Character
          </button>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Dynamic Memory', desc: 'AI remembers your choices and character history.' },
            { title: 'Deep Customization', desc: 'Craft personalities, backstories, and unique speaking styles.' },
            { title: 'Immersive RP', desc: 'Rich descriptions and stay-in-character responses.' }
          ].map((feature, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-left">
              <h3 className="text-lg font-semibold mb-2 text-indigo-400">{feature.title}</h3>
              <p className="text-sm text-zinc-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-20 text-zinc-600 text-sm">
        © 2024 DreamSpeak. Built for storytellers.
      </footer>
    </div>
  );
};

export default LandingPage;
