import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';
import History from './pages/History';
import { Bot, BarChart2, Sparkles } from 'lucide-react';

function NavigationHeader() {
  const location = useLocation();

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-gray-200/80 px-6 py-3.5 flex justify-between items-center">
      <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <span className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            AI Interviewer <span className="text-blue-600 text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">PRO</span>
          </span>
        </div>
      </Link>

      <nav className="flex items-center gap-1.5">
        <Link
          to="/"
          className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            location.pathname === '/' || location.pathname === '/interview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Mock Interview
        </Link>
        <Link
          to="/history"
          className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
            location.pathname === '/history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Analytics &amp; Progress
        </Link>
      </nav>
    </header>
  );
}

function App() {
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [interviewSettings, setInterviewSettings] = useState(null);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-gray-900 font-sans">
        <NavigationHeader />
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          <Routes>
            <Route 
              path="/" 
              element={<Home setCandidateProfile={setCandidateProfile} setInterviewSettings={setInterviewSettings} />} 
            />
            <Route 
              path="/interview" 
              element={<Interview candidateProfile={candidateProfile} interviewSettings={interviewSettings} />} 
            />
            <Route 
              path="/history" 
              element={<History />} 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
