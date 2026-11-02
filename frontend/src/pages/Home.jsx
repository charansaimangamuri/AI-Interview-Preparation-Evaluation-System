import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResume, extractJobRequirements, calculateMatch } from '../api';
import { UploadCloud, CheckCircle2, ArrowRight, Loader2, Target, Shield, Zap, Sparkles } from 'lucide-react';

const PERSONAS = [
  {
    id: 'standard',
    name: 'Standard Senior Architect',
    description: 'Balanced technical depth, system design, and clean code fundamentals.',
    icon: Target,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'google',
    name: 'Google "Bar Raiser"',
    description: 'High concurrency, distributed consensus, low-latency, and edge-case scale.',
    icon: Shield,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: 'amazon',
    name: 'Amazon Bar Raiser',
    description: 'STAR behavioral format, customer obsession, ownership, and scale.',
    icon: Sparkles,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'startup',
    name: 'Y-Combinator Startup CTO',
    description: 'Fast delivery, pragmatic architecture, live debugging, and business trade-offs.',
    icon: Zap,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

export default function Home({ setCandidateProfile, setInterviewSettings }) {
  const navigate = useNavigate();
  
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Multi-Level Plan Settings
  const [easyCount, setEasyCount] = useState(2);
  const [easyTime, setEasyTime] = useState(2);

  const [intermediateCount, setIntermediateCount] = useState(3);
  const [intermediateTime, setIntermediateTime] = useState(4);

  const [hardCount, setHardCount] = useState(1);
  const [hardTime, setHardTime] = useState(8);

  const [includeEasy, setIncludeEasy] = useState(true);
  const [includeIntermediate, setIncludeIntermediate] = useState(true);
  const [includeHard, setIncludeHard] = useState(false);

  // Match Results
  const [matchData, setMatchData] = useState(null);
  const [parsedProfile, setParsedProfile] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Match Results, 3: Plan Configuration

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcessResume = async () => {
    if (!file) {
      setError('Please upload your resume (PDF).');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste a target Job Description.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Upload & Parse Resume
      const resumeResponse = await uploadResume(file);
      const profile = resumeResponse.data || resumeResponse;
      profile.targetRole = role;

      // 2. Extract Job Requirements from JD
      const jobReqs = await extractJobRequirements({ job_description: jobDescription });
      const requirements = jobReqs.requirements || [];
      profile.jobRequirements = requirements;

      // 3. Compute Semantic Match Score
      const match = await calculateMatch({
        resume_skills: profile.skills || [],
        job_requirements: requirements
      });

      setParsedProfile(profile);
      setMatchData(match);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process data. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInterview = () => {
    const plan = [];
    if (includeEasy) {
      for (let i = 0; i < easyCount; i++) plan.push('easy');
    }
    if (includeIntermediate) {
      for (let i = 0; i < intermediateCount; i++) plan.push('intermediate');
    }
    if (includeHard) {
      for (let i = 0; i < hardCount; i++) plan.push('hard');
    }

    if (plan.length === 0) {
      alert('Please select at least one difficulty level.');
      return;
    }

    const timeMap = {
      easy: Number(easyTime),
      intermediate: Number(intermediateTime),
      hard: Number(hardTime)
    };

    setCandidateProfile({
      ...parsedProfile,
      interviewerPersona: selectedPersona
    });

    setInterviewSettings({ plan, timeMap, persona: selectedPersona });
    navigate('/interview');
  };

  return (
    <div className="max-w-3xl mx-auto my-8">
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-1">Configure Your Mock Interview</h2>
          <p className="text-gray-500 mb-6 text-sm">Upload your resume, target job description, and pick your AI interviewer persona.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g. Full Stack Engineer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Resume (PDF)</label>
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition text-sm">
                <UploadCloud className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600 truncate max-w-[200px]">{file ? file.name : 'Upload PDF Resume'}</span>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Target Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job requirements or responsibilities here..."
              className="w-full border border-gray-300 rounded-xl p-3 min-h-[110px] outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Persona Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Select Interviewer Persona</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPersona === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersona(p.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className="font-bold text-sm text-gray-900">{p.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl mb-4 font-medium">{error}</div>}

          <button
            onClick={handleProcessResume}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze Match & Setup Interview'}
          </button>
        </div>
      )}

      {step === 2 && matchData && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-1">Resume Match Analysis</h2>
          <p className="text-gray-500 text-sm mb-6">Here is how your resume aligns with the target job requirements.</p>

          <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full border-4 border-blue-600 my-4 bg-blue-50/30">
            <span className="text-3xl font-black text-blue-600">{Math.round(matchData.overall_match_percentage)}%</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Match</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left my-6">
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h4 className="font-bold text-green-800 text-xs uppercase tracking-wider mb-2">Matched Competencies</h4>
              <ul className="text-xs text-green-700 space-y-1">
                {matchData.matched_skills.slice(0, 5).map((m, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{m.requirement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h4 className="font-bold text-amber-800 text-xs uppercase tracking-wider mb-2">Skill Gaps to Probe</h4>
              <ul className="text-xs text-amber-700 space-y-1">
                {matchData.missing_skills.slice(0, 5).map((m, i) => (
                  <li key={i}>• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            Configure Question Levels <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-1">Multi-Level Interview Plan</h2>
          <p className="text-gray-500 text-sm mb-6">Mix and match difficulty levels and time allocations.</p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                <input type="checkbox" checked={includeEasy} onChange={(e) => setIncludeEasy(e.target.checked)} className="rounded text-blue-600" />
                Easy Level
              </label>
              <div className="flex items-center gap-4 text-xs">
                <span>Qty: <input type="number" min="1" max="5" value={easyCount} onChange={(e) => setEasyCount(Number(e.target.value))} className="w-12 border p-1 rounded ml-1 text-center" /></span>
                <span>Mins/Q: <input type="number" min="1" max="10" value={easyTime} onChange={(e) => setEasyTime(Number(e.target.value))} className="w-12 border p-1 rounded ml-1 text-center" /></span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                <input type="checkbox" checked={includeIntermediate} onChange={(e) => setIncludeIntermediate(e.target.checked)} className="rounded text-blue-600" />
                Intermediate Level
              </label>
              <div className="flex items-center gap-4 text-xs">
                <span>Qty: <input type="number" min="1" max="5" value={intermediateCount} onChange={(e) => setIntermediateCount(Number(e.target.value))} className="w-12 border p-1 rounded ml-1 text-center" /></span>
                <span>Mins/Q: <input type="number" min="1" max="15" value={intermediateTime} onChange={(e) => setIntermediateTime(Number(e.target.value))} className="w-12 border p-1 rounded ml-1 text-center" /></span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                <input type="checkbox" checked={includeHard} onChange={(e) => setIncludeHard(e.target.checked)} className="rounded text-blue-600" />
                Hard Level
              </label>
              <div className="flex items-center gap-4 text-xs">
                <span>Qty: <input type="number" min="1" max="5" value={hardCount} onChange={(e) => setHardCount(Number(e.target.value))} className="w-12 border p-1 rounded ml-1 text-center" /></span>
                <span>Mins/Q: <input type="number" min="1" max="20" value={hardTime} onChange={(e) => setHardTime(Number(e.target.value))} className="w-12 border p-1 rounded ml-1 text-center" /></span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition text-sm cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleStartInterview}
              className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              Start Mock Interview <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}