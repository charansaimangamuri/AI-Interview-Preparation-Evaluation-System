import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResume, extractJobRequirements, calculateMatch } from '../api';
import { UploadCloud, CheckCircle, Loader2, Target, Briefcase, FileText, Settings, ArrowRight } from 'lucide-react';

export default function Home({ setCandidateProfile, setInterviewSettings }) {
  const [step, setStep] = useState(1); 
  
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  
  // Advanced Multi-Level Settings
  const [levels, setLevels] = useState({
    easy: { active: true, count: 2, mins: 2 },
    intermediate: { active: true, count: 3, mins: 4 },
    hard: { active: false, count: 1, mins: 8 }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [profileData, setProfileData] = useState(null);
  
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!file) { setError('Please upload your resume first.'); return; }
    if (!role.trim()) { setError('Please enter a target role.'); return; }
    if (!jd.trim()) { setError('Please paste the job description.'); return; }
    
    setLoading(true);
    setError('');
    
    try {
      const resumeResponse = await uploadResume(file);
      const profile = resumeResponse.data;
      const jdResponse = await extractJobRequirements({ job_description: jd });
      const requirements = jdResponse.requirements;
      const match = await calculateMatch({
        resume_skills: profile.skills,
        job_requirements: requirements
      });
      
      setProfileData({ 
        ...profile, 
        targetRole: role,
        jobRequirements: requirements
      });
      setMatchResult(match);
      setStep(2);
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLevel = (level) => {
    setLevels(prev => ({ ...prev, [level]: { ...prev[level], active: !prev[level].active } }));
  };

  const handleUpdateLevel = (level, field, value) => {
    setLevels(prev => ({ ...prev, [level]: { ...prev[level], [field]: Number(value) } }));
  };

  const calculateTotals = () => {
    let totalQ = 0;
    let totalTime = 0;
    Object.values(levels).forEach(l => {
      if (l.active) {
        totalQ += l.count;
        totalTime += (l.count * l.mins);
      }
    });
    return { totalQ, totalTime };
  };

  const handleStartInterview = () => {
    const { totalQ } = calculateTotals();
    if (totalQ === 0) {
      setError('You must select at least one question to start the interview.');
      return;
    }
    
    // Build the sequential plan
    const plan = [];
    if (levels.easy.active) { for(let i=0; i<levels.easy.count; i++) plan.push('easy'); }
    if (levels.intermediate.active) { for(let i=0; i<levels.intermediate.count; i++) plan.push('intermediate'); }
    if (levels.hard.active) { for(let i=0; i<levels.hard.count; i++) plan.push('hard'); }

    setCandidateProfile(profileData);
    setInterviewSettings({
      plan,
      timeMap: {
        easy: levels.easy.mins,
        intermediate: levels.intermediate.mins,
        hard: levels.hard.mins
      }
    });
    navigate('/interview');
  };

  const { totalQ, totalTime } = calculateTotals();

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl mx-auto mt-10">
      
      {step === 1 && (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-3xl font-bold mb-2">Configure Your Interview</h2>
          <p className="text-gray-500 mb-8">Upload your resume and paste the job description to begin.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" /> Target Role
              </label>
              <input 
                type="text" 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" /> Upload Resume (PDF)
              </label>
              <div 
                className={`border-2 border-dashed ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'} rounded-xl p-4 flex flex-col items-center justify-center hover:bg-gray-100 cursor-pointer text-center h-[50px]`} 
                onClick={() => document.getElementById('resume-upload').click()}
              >
                {file ? (
                  <div className="flex items-center gap-2 text-green-700 font-medium"><CheckCircle className="w-5 h-5" /> {file.name}</div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600"><UploadCloud className="w-5 h-5" /> Click to upload</div>
                )}
                <input id="resume-upload" type="file" accept=".pdf" className="hidden" onChange={(e) => { if(e.target.files[0]) setFile(e.target.files[0]); }} />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-500" /> Job Description
            </label>
            <textarea 
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[150px] outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6">{error}</div>}

          <button onClick={handleAnalyze} disabled={loading} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center">
            {loading ? <><Loader2 className="animate-spin mr-2" /> Analyzing Profile & Job Description...</> : 'Analyze Match Score'}
          </button>
        </div>
      )}

      {step === 2 && matchResult && (
        <div className="animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Resume Match Analysis</h2>
            <p className="text-gray-500">Here is how your resume aligns with the job description.</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className={`relative flex items-center justify-center w-40 h-40 rounded-full border-8 ${matchResult.overall_match_percentage >= 75 ? 'border-green-500' : matchResult.overall_match_percentage >= 50 ? 'border-yellow-400' : 'border-red-500'}`}>
              <div className="text-center">
                <span className="text-4xl font-black">{matchResult.overall_match_percentage}%</span>
                <span className="block text-sm text-gray-500 font-medium">MATCH</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-8 border-t pt-6">
            <button onClick={() => setStep(3)} className="bg-gray-900 text-white font-bold text-lg py-3 px-8 rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2">
              Continue <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" /> Multi-Level Interview Plan
            </h2>
            <p className="text-gray-500">Mix and match different difficulty levels for a realistic interview.</p>
          </div>
          
          <div className="space-y-4 max-w-xl mx-auto">
            {['easy', 'intermediate', 'hard'].map((lvl) => (
              <div key={lvl} className={`border ${levels[lvl].active ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'} rounded-xl p-4 flex items-center justify-between transition-colors`}>
                <div className="flex items-center gap-3 w-1/3">
                  <input 
                    type="checkbox" 
                    checked={levels[lvl].active} 
                    onChange={() => handleToggleLevel(lvl)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="font-bold capitalize text-gray-800">{lvl}</span>
                </div>
                
                <div className="flex gap-4 w-2/3 justify-end">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Qty</label>
                    <input 
                      type="number" min="1" max="10"
                      value={levels[lvl].count}
                      onChange={(e) => handleUpdateLevel(lvl, 'count', e.target.value)}
                      disabled={!levels[lvl].active}
                      className="w-20 border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Mins/Q</label>
                    <input 
                      type="number" min="1" max="15"
                      value={levels[lvl].mins}
                      onChange={(e) => handleUpdateLevel(lvl, 'mins', e.target.value)}
                      disabled={!levels[lvl].active}
                      className="w-20 border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-gray-900 text-white rounded-xl p-6 mt-6 flex justify-between items-center shadow-lg">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Questions</p>
                <p className="text-3xl font-black">{totalQ}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-medium">Total Time</p>
                <p className="text-3xl font-black">{totalTime} <span className="text-lg text-gray-300 font-medium">mins</span></p>
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-center mt-4">{error}</div>}

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(2)} className="w-1/3 bg-white border border-gray-300 text-gray-700 font-bold text-lg py-4 rounded-xl hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button onClick={handleStartInterview} className="w-2/3 bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                Start Mock Interview <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
