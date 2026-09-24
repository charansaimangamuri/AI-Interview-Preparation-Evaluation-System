import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Interview from './pages/Interview';

function App() {
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [interviewSettings, setInterviewSettings] = useState(null);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">AI Interviewer Pro</h1>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<Home setCandidateProfile={setCandidateProfile} setInterviewSettings={setInterviewSettings} />} />
            <Route path="/interview" element={<Interview candidateProfile={candidateProfile} interviewSettings={interviewSettings} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
