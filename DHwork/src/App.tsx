import React, { useState } from 'react';
import { Sparkles, Stars, Sun, Cloud, Moon } from 'lucide-react';
import SimpleVoiceAgent from './components/SimpleVoiceAgent';

function App() {
  const [apiKey] = useState<string>(import.meta.env.VITE_CARTESIA_API_KEY || '');
  const [theme, setTheme] = useState<'day' | 'night'>('day');

  const toggleTheme = () => {
    setTheme(prev => prev === 'day' ? 'night' : 'day');
  };

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${
      theme === 'day' 
        ? 'bg-gradient-to-b from-blue-200 via-indigo-100 to-purple-200' 
        : 'bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800'
    } flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {theme === 'day' ? (
          <>
            <div className="absolute top-10 left-1/4 text-yellow-400 animate-float-slow">
              <Sun size={48} />
            </div>
            <div className="absolute top-20 right-1/5 text-white animate-float">
              <Cloud size={32} />
            </div>
            <div className="absolute bottom-40 left-1/3 text-white animate-float-delayed">
              <Cloud size={24} />
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-10 right-1/4 text-yellow-200 animate-float-slow">
              <Moon size={40} />
            </div>
            <div className="absolute top-40 left-1/5 text-white animate-sparkle">
              <Stars size={20} />
            </div>
            <div className="absolute bottom-40 right-1/3 text-white animate-sparkle">
              <Stars size={16} />
            </div>
            <div className="absolute top-1/4 right-1/3 text-white animate-sparkle">
              <Stars size={24} />
            </div>
          </>
        )}
      </div>
      
      <header className="text-center mb-8 relative">
        <button 
          onClick={toggleTheme}
          className={`absolute -top-4 -right-4 p-3 rounded-full ${
            theme === 'day' 
              ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' 
              : 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'
          } transition-colors`}
          title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
        >
          {theme === 'day' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className={`w-12 h-12 ${theme === 'day' ? 'text-indigo-600' : 'text-indigo-300'} animate-sparkle`} />
          <h1 className={`text-5xl font-bold ${theme === 'day' ? 'text-indigo-600' : 'text-indigo-200'} font-display`}>
            TuneGram
          </h1>
          <Sparkles className={`w-12 h-12 ${theme === 'day' ? 'text-indigo-600' : 'text-indigo-300'} animate-sparkle`} />
        </div>
        <p className={`text-lg ${theme === 'day' ? 'text-indigo-600' : 'text-indigo-200'} italic max-w-md mx-auto font-medium`}>
          Personalized tracks with your own sound.
        </p>
      </header>

      <div className="w-full max-w-2xl">
        <SimpleVoiceAgent 
          apiKey={apiKey}
          initialPrompt="Hey there! I'm TuneGram. Let's create a personalized track that captures your unique style and vibe."
        />
      </div>

      <footer className={`text-center ${theme === 'day' ? 'text-indigo-500' : 'text-indigo-300'} mt-10`}>
        <p className="mb-2 font-display font-medium">Powered by advanced voice technology 🎵</p>
      </footer>
    </div>
  );
}

export default App;