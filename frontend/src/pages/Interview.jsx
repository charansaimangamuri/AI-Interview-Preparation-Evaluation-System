import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQuestion, evaluateAnswer, transcribeAudio, predictPerformance, generateStudyPlan } from '../api';
import { Mic, Square, Send, Loader2, User, Bot, AlertCircle, Clock } from 'lucide-react';

export default function Interview({ candidateProfile, interviewSettings }) {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState('initializing'); // initializing, asking, listening, evaluating, finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  
  const [history, setHistory] = useState([]); // List of { question, answer, evaluation }
  const [textAnswer, setTextAnswer] = useState('');
  const [revealedSolutions, setRevealedSolutions] = useState({});
  const [mlResult, setMlResult] = useState(null);
  const [studyPlan, setStudyPlan] = useState(null);
  const [topicScores, setTopicScores] = useState({});
  
  const toggleSolution = (idx) => {
    setRevealedSolutions(prev => ({ ...prev, [idx]: !prev[idx] }));
  };
  
  // Advanced Settings from Plan
  const currentQIndex = history.length;
  const currentDifficulty = interviewSettings?.plan[currentQIndex] || 'intermediate';
  const totalQuestions = interviewSettings?.plan.length || 1;
  const isFinished = currentQIndex >= totalQuestions;
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Timer Effect
  useEffect(() => {
    let timerId = null;
    if (sessionState === 'asking' || sessionState === 'listening') {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [sessionState]);

  useEffect(() => {
    if (!candidateProfile || !interviewSettings) {
      navigate('/');
      return;
    }
    if (!isFinished) {
      fetchNextQuestion(currentDifficulty);
    }
  }, []);

  const handleTimeUp = () => {
    if (isRecording) {
      stopRecording();
    }
    handleSubmitAnswer(true);
  };

  const fetchNextQuestion = async (targetDifficulty) => {
    setSessionState('initializing');
    setTextAnswer('');
    setTimeLeft(interviewSettings.timeMap[targetDifficulty] * 60); // Reset timer for specific difficulty
    
    try {
      const q = await generateQuestion({
        candidate_skills: candidateProfile.skills,
        job_requirements: candidateProfile.jobRequirements || [],
        target_role: candidateProfile.targetRole,
        current_difficulty: targetDifficulty,
        previous_questions: history.map(h => h.question.question),
        current_topic: candidateProfile.skills[currentQIndex % candidateProfile.skills.length] || "General"
      });
      setCurrentQuestion(q);
      setSessionState('asking');
    } catch (err) {
      console.error("Full error object:", err);
      console.error("Response data:", err.response?.data);
      alert(`Error fetching question: ${JSON.stringify(err.response?.data || err.message)}`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setSessionState('transcribing');
        
        try {
          const res = await transcribeAudio(audioBlob);
          setTextAnswer(prev => (prev ? prev + " " : "") + res.transcript); 
          setSessionState('asking');
        } catch(err) {
          console.error(err);
          alert('Failed to transcribe audio.');
          setSessionState('asking');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSessionState('listening');
    } catch (err) {
      console.error(err);
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSubmitAnswer = async (isTimeUp = false) => {
    if (!isTimeUp && !textAnswer.trim()) return;
    
    setSessionState('evaluating');
    try {
      const evalResult = await evaluateAnswer({
        question: currentQuestion.question,
        user_answer: textAnswer.trim() || "No answer provided.",
        expected_concepts: currentQuestion.expected_concepts,
        current_difficulty: currentDifficulty
      });

      const newHistory = [...history, {
        question: currentQuestion,
        answer: textAnswer.trim() || "(Time expired, no answer provided)",
        evaluation: evalResult
      }];
      setHistory(newHistory);

      const nextIndex = newHistory.length;
      if (nextIndex >= totalQuestions) {
        setSessionState('analyzing_results');
        
        // 1. Calculate Metrics for ML Model
        const totalScore = newHistory.reduce((sum, item) => sum + item.evaluation.score, 0);
        const avg_tech_score = totalScore / newHistory.length;
        
        let totalExpected = 0;
        let totalMissing = 0;
        newHistory.forEach(item => {
          totalExpected += item.question.expected_concepts.length;
          totalMissing += item.evaluation.missing_concepts.length;
        });
        const avg_coverage = totalExpected > 0 ? ((totalExpected - totalMissing) / totalExpected) * 100 : 100;
        
        // 2. Predict Performance
        try {
          const mlRes = await predictPerformance({
            avg_tech_score: avg_tech_score,
            avg_coverage: avg_coverage,
            filler_rate: 2.0 // Fallback/default if we don't track perfectly per question
          });
          setMlResult(mlRes);
        } catch (e) {
          console.error("ML Prediction Failed:", e);
        }

        // 3. Generate Study Plan
        try {
          // Calculate scores per topic
          const topicScores = {};
          const topicCounts = {};
          newHistory.forEach(item => {
            const t = item.question.topic;
            topicScores[t] = (topicScores[t] || 0) + item.evaluation.score;
            topicCounts[t] = (topicCounts[t] || 0) + 1;
          });
          const avgTopicScores = {};
          for (const t in topicScores) {
            avgTopicScores[t] = topicScores[t] / topicCounts[t];
          }
          setTopicScores(avgTopicScores);
          setStudyPlan('loading');
          
          const planRes = await generateStudyPlan({
            topic_scores: avgTopicScores,
            available_days: 7
          });
          
          let finalPlan = planRes.study_plan;
          if (Array.isArray(finalPlan) && finalPlan.length > 0 && finalPlan[0].text) {
            finalPlan = finalPlan[0].text;
          } else if (typeof finalPlan === 'object' && finalPlan !== null && finalPlan.text) {
            finalPlan = finalPlan.text;
          }
          
          setStudyPlan(finalPlan || 'error');
        } catch (e) {
          console.error("Study Plan Failed:", e);
          setStudyPlan('error');
        }

        setSessionState('finished');
      } else {
        const nextDifficulty = interviewSettings.plan[nextIndex];
        fetchNextQuestion(nextDifficulty);
      }
    } catch (err) {
      console.error(err);
      alert('Error evaluating answer');
      setSessionState('asking');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!candidateProfile || !interviewSettings) return null;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Session Progress Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-lg">{candidateProfile.targetRole} Interview</h2>
          <p className="text-sm text-gray-500">Candidate: {candidateProfile.name}</p>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
              <Clock className="w-4 h-4" /> Q-Timer
            </span>
            <span className={`text-xl font-mono font-bold ${timeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="border-l pl-6 flex flex-col items-end">
            <p className="text-sm font-medium text-gray-700 mb-1">Question {Math.min(currentQIndex + 1, totalQuestions)} of {totalQuestions}</p>
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide
              ${currentDifficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                currentDifficulty === 'intermediate' ? 'bg-blue-100 text-blue-800' : 
                'bg-purple-100 text-purple-800'}`}>
              {currentDifficulty} Level
            </span>
          </div>
        </div>
      </div>

      {/* History Log */}
      {history.map((item, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex gap-3">
            <Bot className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Level: {interviewSettings.plan[idx]}</span>
              <p className="font-semibold text-gray-800">{item.question.question}</p>
            </div>
          </div>
          <div className="p-4 border-b border-gray-100">
            <p className={`text-gray-700 flex items-start gap-3 ${item.answer.includes('(Time expired') ? 'italic opacity-70' : ''}`}>
              <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
              {item.answer}
            </p>
          </div>
          <div className="p-4 bg-green-50/50">
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-bold text-lg ${item.evaluation.score >= 70 ? 'text-green-600' : item.evaluation.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                Score: {item.evaluation.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{item.evaluation.feedback}</p>
            {item.evaluation.missing_concepts.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-red-600 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-4 h-4" /> Missed Concepts:
                </span>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  {item.evaluation.missing_concepts.map((concept, i) => (
                    <li key={i}>{concept}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* View Ideal Solution */}
            <div className="mt-4 pt-4 border-t border-green-200/50">
              <button 
                onClick={() => toggleSolution(idx)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                {revealedSolutions[idx] ? 'Hide' : 'View'} Ideal Solution
              </button>
              
              {revealedSolutions[idx] && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-800 leading-relaxed shadow-sm">
                  <span className="font-bold text-blue-900 block mb-2 border-b border-blue-200 pb-1">Model Answer (100/100):</span>
                  {item.question.ideal_solution || "Solution not available for this question."}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Current Question / Action Area */}
      {sessionState === 'analyzing_results' ? (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Generating Final Report...</h2>
          <p className="text-gray-500 mt-2">Running ML Performance Prediction and compiling your personalized Study Plan.</p>
        </div>
      ) : sessionState === 'finished' ? (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 p-8 rounded-xl text-center">
            <h2 className="text-3xl font-black text-green-800 mb-2">Interview Complete!</h2>
            <p className="text-green-700 text-lg">You have completed all {totalQuestions} questions of your mock interview.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {/* Weak Areas */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 flex flex-col justify-start">
                <h3 className="font-bold text-red-800 mb-3 border-b pb-2">Areas for Improvement</h3>
                <ul className="text-sm text-left space-y-2">
                  {topicScores && typeof topicScores === 'object' && Object.entries(topicScores).filter(([t, s]) => s < 70).length > 0 ? (
                    Object.entries(topicScores)
                      .filter(([topic, score]) => score < 70)
                      .sort((a, b) => a[1] - b[1])
                      .map(([topic, score], i) => (
                        <li key={i} className="flex justify-between items-center text-red-700">
                          <span className="font-medium truncate pr-2">{topic}</span>
                          <span className="bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold">{Math.round(score)}%</span>
                        </li>
                      ))
                  ) : (
                    <li className="text-gray-500 italic">No major weak areas detected!</li>
                  )}
                </ul>
              </div>

              {/* Overall Score */}
              {mlResult && mlResult.predicted_overall_score !== undefined && (
                <div className="bg-white p-6 rounded-xl shadow-md border-2 border-blue-500 flex flex-col items-center justify-center transform scale-105 z-10">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">AI Predicted Real-World Score</p>
                  <p className={`text-6xl font-black ${mlResult.predicted_overall_score >= 80 ? 'text-green-500' : mlResult.predicted_overall_score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {Number(mlResult.predicted_overall_score).toFixed(1)}<span className="text-2xl text-gray-300">/100</span>
                  </p>
                </div>
              )}

              {/* Strong Areas */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-green-100 flex flex-col justify-start">
                <h3 className="font-bold text-green-800 mb-3 border-b pb-2">Strong Areas</h3>
                <ul className="text-sm text-left space-y-2">
                  {topicScores && typeof topicScores === 'object' && Object.entries(topicScores).filter(([t, s]) => s >= 70).length > 0 ? (
                    Object.entries(topicScores)
                      .filter(([topic, score]) => score >= 70)
                      .sort((a, b) => b[1] - a[1])
                      .map(([topic, score], i) => (
                        <li key={i} className="flex justify-between items-center text-green-700">
                          <span className="font-medium truncate pr-2">{topic}</span>
                          <span className="bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold">{Math.round(score)}%</span>
                        </li>
                      ))
                  ) : (
                    <li className="text-gray-500 italic">Keep practicing to build your strengths.</li>
                  )}
                </ul>
              </div>
            </div>
            
            <br />
            <button onClick={() => window.location.reload()} className="mt-8 bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-sm transition-colors text-lg">
              Start New Interview
            </button>
          </div>

          {studyPlan === 'loading' ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-200 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Compiling your Study Plan...</p>
            </div>
          ) : studyPlan === 'error' ? (
            <div className="bg-red-50 p-8 rounded-xl shadow-sm border border-red-200 text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-red-800 font-bold">Failed to Generate Study Plan</h3>
              <p className="text-red-600 text-sm mt-1">The AI service might be overloaded or rate-limited. Please try again later.</p>
            </div>
          ) : studyPlan && typeof studyPlan === 'string' ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-200 text-left">
              <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                <Bot className="w-6 h-6" /> Your Personalized Study Plan
              </h2>
              <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100">
                <p className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: studyPlan.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
              </div>
            </div>
          ) : studyPlan ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-blue-200 text-left">
              <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                <Bot className="w-6 h-6" /> Your Personalized Study Plan (Raw)
              </h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">{JSON.stringify(studyPlan, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {sessionState === 'initializing' ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500">The AI is analyzing your profile and formulating a {currentDifficulty} question...</p>
            </div>
          ) : sessionState === 'evaluating' ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-500">Evaluating your answer against expected concepts...</p>
            </div>
          ) : sessionState === 'transcribing' ? (
             <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <p className="text-gray-500">Transcribing audio to text...</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex gap-4 items-start">
                <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Topic: {currentQuestion?.topic}</span>
                  <p className="text-lg font-medium text-gray-900 leading-relaxed">{currentQuestion?.question}</p>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here, or click the microphone to speak..."
                  className="w-full border border-gray-300 rounded-xl p-4 min-h-[150px] outline-none focus:ring-2 focus:ring-blue-500 resize-none pr-14"
                />
                
                {/* Audio Recording Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {isRecording ? (
                    <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
                      <Square className="w-5 h-5 fill-current" /> Stop
                    </button>
                  ) : (
                    <button onClick={startRecording} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-full transition-colors" title="Answer with voice">
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <p className={`text-sm font-medium ${timeLeft < 30 ? 'text-red-500' : 'text-gray-500'}`}>
                  {timeLeft === 0 ? 'Time expired. Submitting...' : `Auto-submitting in ${formatTime(timeLeft)}`}
                </p>
                <button
                  onClick={() => handleSubmitAnswer(false)}
                  disabled={!textAnswer.trim() || isRecording}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Submit Answer <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
