import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInterviewHistory, clearInterviewHistory } from '../utils/storage';
import { generatePDFReport } from '../utils/pdfGenerator';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  Trophy, TrendingUp, Clock, Calendar, Download, Trash2, 
  ArrowLeft, CheckCircle2, Eye, Shield, Sparkles, Zap, Target 
} from 'lucide-react';

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(getInterviewHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to delete all saved interview history?')) {
      clearInterviewHistory();
      setSessions([]);
    }
  };

  // Compute High-Level Metrics
  const totalInterviews = sessions.length;
  const avgScore = totalInterviews > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + (s.predictedScore || 0), 0) / totalInterviews) 
    : 0;
  const bestScore = totalInterviews > 0 
    ? Math.round(Math.max(...sessions.map(s => s.predictedScore || 0))) 
    : 0;
  const avgEyeContact = totalInterviews > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.eyeContactScore || 85), 0) / totalInterviews)
    : 85;

  // Chart 1 Data: Score Progression (Chronological order)
  const progressionData = [...sessions].reverse().map((s, idx) => ({
    interview: `#${idx + 1}`,
    score: Math.round(s.predictedScore || 0),
    eyeContact: Math.round(s.eyeContactScore || 85),
    role: s.role
  }));

  // Chart 2 Data: Topic Competencies
  const topicAggregates = {};
  const topicCounts = {};
  sessions.forEach(s => {
    Object.entries(s.topicScores || {}).forEach(([topic, sc]) => {
      topicAggregates[topic] = (topicAggregates[topic] || 0) + sc;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  const topicData = Object.keys(topicAggregates).map(t => ({
    topic: t.length > 15 ? t.substring(0, 15) + '...' : t,
    score: Math.round(topicAggregates[t] / topicCounts[t])
  })).slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in my-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Practice
          </button>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Performance &amp; Progression Analytics</h2>
          <p className="text-sm text-gray-500">Track how your technical scores, communication, and eye contact improve over mock interviews.</p>
        </div>

        {totalInterviews > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      {totalInterviews === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center max-w-lg mx-auto">
          <Trophy className="w-12 h-12 text-blue-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-gray-800">No Past Interviews Recorded Yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Complete a mock interview to start tracking your score progression, skill benchmarks, and diagnostic assessments.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition cursor-pointer"
          >
            Start Your First Interview
          </button>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Interviews</span>
              <p className="text-3xl font-black text-gray-900">{totalInterviews}</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Completed Sessions</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider block mb-1">Avg Score</span>
              <p className="text-3xl font-black text-blue-600">{avgScore}%</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Across All Topics</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block mb-1">Best Score</span>
              <p className="text-3xl font-black text-emerald-600">{bestScore}%</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Highest Benchmark</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-purple-500 uppercase tracking-wider block mb-1">Eye Contact</span>
              <p className="text-3xl font-black text-purple-600">{avgEyeContact}%</p>
              <span className="text-[11px] text-gray-500 mt-1 block">Vision Engagement</span>
            </div>
          </div>

          {/* Interactive Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Progression Line Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Score Progression Over Time
              </h3>
              <p className="text-xs text-gray-400 mb-4">Tracking overall score advancement across successive mock interviews.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="interview" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" name="Predicted Score (%)" stroke="#2563EB" strokeWidth={3} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="eyeContact" name="Eye Contact (%)" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Topic Mastery Bar Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" /> Domain Competency Benchmarks
              </h3>
              <p className="text-xs text-gray-400 mb-4">Average scores categorized by evaluated technical domains.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="topic" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="score" name="Average Score (%)" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Past Interviews List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Detailed Interview Logs</h3>
            <div className="divide-y divide-gray-100">
              {sessions.map((item) => (
                <div key={item.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-gray-900">{item.role}</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {item.persona}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.displayDate}</span>
                      <span>•</span>
                      <span>{item.totalQuestions} Questions</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Score</span>
                      <span className={`text-xl font-black ${
                        item.predictedScore >= 80 ? 'text-emerald-600' : 
                        item.predictedScore >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {Math.round(item.predictedScore)}%
                      </span>
                    </div>

                    <button
                      onClick={() => generatePDFReport({
                        candidateProfile: { name: item.candidateName, targetRole: item.role },
                        history: item.history,
                        mlResult: { predicted_overall_score: item.predictedScore },
                        topicScores: item.topicScores,
                        studyPlan: item.studyPlan,
                        totalQuestions: item.totalQuestions
                      })}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Download PDF Assessment Report"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" /> Export PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
