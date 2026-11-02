import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  generateQuestion, 
  probeOrEvaluateAnswer, 
  transcribeAudio, 
  predictPerformance, 
  generateStudyPlan,
  API_BASE_URL 
} from '../api';
import { 
  Mic, Square, Send, Loader2, User, Bot, AlertCircle, Clock, 
  HelpCircle, Code, Volume2, VolumeX, Eye, PenTool, Download, 
  TrendingUp, RotateCcw, Video, VideoOff, CheckCircle2 
} from 'lucide-react';
import CodeSandbox from '../components/CodeSandbox';
import Whiteboard from '../components/Whiteboard';
import EyeContactTracker from '../components/EyeContactTracker';
import { saveInterviewSession } from '../utils/storage';
import { generatePDFReport } from '../utils/pdfGenerator';

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

  // Feature 1: AI Voice Question Narrator (Native Web Speech TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Feature 2: In-Browser Eye Contact & Confidence Tracker
  const [eyeContactScore, setEyeContactScore] = useState(85);
  const [showCameraTracker, setShowCameraTracker] = useState(true);

  // Feature 3: Interactive System Design Whiteboard Canvas
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  // Feature 4: Live Monaco Coding Sandbox
  const [showSandbox, setShowSandbox] = useState(false);

  // Upgrade 1: Probing Follow-Up State
  const [probeQuestion, setProbeQuestion] = useState(null);
  const [probeCount, setProbeCount] = useState(0);

  // Upgrade 2: Real-Time Streaming State
  const [streamingFeedback, setStreamingFeedback] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const toggleSolution = (idx) => {
    setRevealedSolutions(prev => ({ ...prev, [idx]: !prev[idx] }));
  };
  
  // Advanced Settings from Plan
  const currentQIndex = history.length;
  const currentDifficulty = interviewSettings?.plan[currentQIndex] || 'intermediate';
  const totalQuestions = interviewSettings?.plan?.length || 1;
  const isFinished = currentQIndex >= totalQuestions;
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // TTS Narrator Controls
  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isMuted || !text) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

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
    return () => stopSpeaking();
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
    setProbeQuestion(null);
    setProbeCount(0);
    setStreamingFeedback('');
    setShowSandbox(false);
    setShowWhiteboard(false);
    setTimeLeft(interviewSettings.timeMap[targetDifficulty] * 60);
    
    try {
      const q = await generateQuestion({
        candidate_skills: candidateProfile.skills,
        job_requirements: candidateProfile.jobRequirements || [],
        target_role: candidateProfile.targetRole,
        current_difficulty: targetDifficulty,
        previous_questions: history.map(h => h.question.question),
        current_topic: candidateProfile.skills[currentQIndex % candidateProfile.skills.length] || "General",
        interviewer_persona: interviewSettings?.persona || "standard"
      });
      setCurrentQuestion(q);
      setSessionState('asking');
      speakText(q.question);
    } catch (err) {
      console.error("Full error object:", err);
      alert(`Error fetching question: ${JSON.stringify(err.response?.data || err.message)}`);
    }
  };

  const startRecording = async () => {
    stopSpeaking();
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

  // Real-Time Token Streaming Helper (Upgrade 2)
  const streamLiveFeedback = async (questionText, answerTextVal) => {
    try {
      setIsStreaming(true);
      setStreamingFeedback('');
      const response = await fetch(`${API_BASE_URL}/evaluation/stream-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          user_answer: answerTextVal,
          expected_concepts: currentQuestion.expected_concepts,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setStreamingFeedback((prev) => prev + parsed.text);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error("Streaming error:", e);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmitAnswer = async (isTimeUp = false) => {
    stopSpeaking();
    if (!isTimeUp && !textAnswer.trim()) return;
    
    setSessionState('evaluating');
    const answerSubmitted = textAnswer.trim() || "(Time expired, no answer provided)";

    try {
      // Trigger live streaming feedback in parallel
      streamLiveFeedback(probeQuestion || currentQuestion.question, answerSubmitted);

      // Call Probing or Evaluation Endpoint (Upgrade 1)
      const res = await probeOrEvaluateAnswer({
        question: probeQuestion ? `${currentQuestion.question} (Follow-up: ${probeQuestion})` : currentQuestion.question,
        user_answer: answerSubmitted,
        expected_concepts: currentQuestion.expected_concepts,
        current_difficulty: currentDifficulty,
        probe_count: probeCount
      });

      // If the AI wants to probe deeper
      if (res.is_follow_up && res.follow_up_question) {
        setProbeQuestion(res.follow_up_question);
        setProbeCount(prev => prev + 1);
        setTextAnswer(''); // Clear input for the follow-up response
        setSessionState('asking');
        speakText(res.follow_up_question);
        return;
      }

      // Final Evaluation Completed
      const evalResult = {
        score: res.score ?? 70,
        feedback: res.feedback || "Good technical attempt.",
        missing_concepts: res.missing_concepts || [],
        next_difficulty: res.next_difficulty || currentDifficulty
      };

      const newHistory = [...history, {
        question: currentQuestion,
        answer: probeQuestion ? `Initial + Follow-up: ${answerSubmitted}` : answerSubmitted,
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
        let mlRes = null;
        try {
          mlRes = await predictPerformance({
            avg_tech_score: avg_tech_score,
            avg_coverage: avg_coverage,
            filler_rate: 2.0
          });
          setMlResult(mlRes);
        } catch (e) {
          console.error("ML Prediction Failed:", e);
        }

        // 3. Generate Study Plan
        let finalPlan = '';
        let avgTopicScores = {};
        try {
          const tScores = {};
          const tCounts = {};
          newHistory.forEach(item => {
            const t = item.question.topic;
            tScores[t] = (tScores[t] || 0) + item.evaluation.score;
            tCounts[t] = (tCounts[t] || 0) + 1;
          });
          for (const t in tScores) {
            avgTopicScores[t] = tScores[t] / tCounts[t];
          }
          setTopicScores(avgTopicScores);
          setStudyPlan('loading');
          
          const planRes = await generateStudyPlan({
            topic_scores: avgTopicScores,
            available_days: 7
          });
          
          finalPlan = planRes.study_plan;
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

        // Feature 5: Save Completed Session to Persistent LocalStorage
        saveInterviewSession({
          candidateProfile,
          interviewSettings,
          history: newHistory,
          topicScores: avgTopicScores,
          mlResult: mlRes,
          studyPlan: finalPlan,
          totalQuestions,
          eyeContactScore
        });

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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto my-4">
      
      {/* Session Progress Header */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-lg text-gray-900">{candidateProfile.targetRole} Interview</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">
              {interviewSettings?.persona || 'standard'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Candidate: {candidateProfile.name || 'Candidate'}</p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* TTS Audio Controls */}
          <button
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else if (currentQuestion?.question) {
                speakText(probeQuestion || currentQuestion.question);
              }
            }}
            title={isSpeaking ? "Pause AI Narrator" : "Listen to Question"}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isSpeaking 
                ? 'bg-blue-50 border-blue-300 text-blue-600 animate-pulse' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4 text-blue-600" /> : <Volume2 className="w-4 h-4 text-gray-600" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Speaking...' : 'Listen'}</span>
          </button>

          {/* Camera Tracker Toggle */}
          <button
            onClick={() => setShowCameraTracker(!showCameraTracker)}
            title={showCameraTracker ? "Hide Camera Vision Tracker" : "Enable Camera Vision Tracker"}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              showCameraTracker 
                ? 'bg-purple-50 border-purple-200 text-purple-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {showCameraTracker ? <Video className="w-4 h-4 text-purple-600" /> : <VideoOff className="w-4 h-4 text-gray-500" />}
            <span className="hidden sm:inline">{showCameraTracker ? 'Cam On' : 'Cam Off'}</span>
          </button>

          {/* Question Timer */}
          <div className="flex flex-col items-center pl-2 border-l border-gray-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Timer
            </span>
            <span className={`text-lg font-mono font-black ${timeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Question Level Badge */}
          <div className="border-l border-gray-200 pl-4 flex flex-col items-end">
            <p className="text-xs font-semibold text-gray-500 mb-0.5">Q {Math.min(currentQIndex + 1, totalQuestions)} / {totalQuestions}</p>
            <span className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide
              ${currentDifficulty === 'easy' ? 'bg-green-100 text-green-800' : 
                currentDifficulty === 'intermediate' ? 'bg-blue-100 text-blue-800' : 
                'bg-purple-100 text-purple-800'}`}>
              {currentDifficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Feature 2: In-Browser Eye Contact Tracker Component (Collapsible) */}
      {showCameraTracker && (
        <EyeContactTracker onScoreUpdate={(score) => setEyeContactScore(score)} />
      )}

      {/* History Log */}
      {history.map((item, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/80 p-4 border-b border-gray-100 flex gap-3">
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
          <div className="p-4 bg-green-50/40">
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-bold text-base ${item.evaluation.score >= 70 ? 'text-green-600' : item.evaluation.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                Score: {item.evaluation.score}/100
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{item.evaluation.feedback}</p>
            {item.evaluation.missing_concepts?.length > 0 && (
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
            <div className="mt-4 pt-3 border-t border-green-200/50">
              <button 
                onClick={() => toggleSolution(idx)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {revealedSolutions[idx] ? 'Hide' : 'View'} Ideal Solution
              </button>
              
              {revealedSolutions[idx] && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-gray-800 leading-relaxed shadow-sm">
                  <span className="font-bold text-blue-900 block mb-1 border-b border-blue-200 pb-1">Model Answer (100/100):</span>
                  {item.question.ideal_solution || "Solution not available for this question."}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Current Question / Action Area */}
      {sessionState === 'analyzing_results' ? (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200 text-center flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Generating Comprehensive Report...</h2>
          <p className="text-gray-500 mt-2 text-sm">Running ML Performance Prediction, calculating vision confidence metrics, and compiling your personalized 7-day plan.</p>
        </div>
      ) : sessionState === 'finished' ? (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200 p-8 rounded-2xl text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-1">Interview Completed!</h2>
            <p className="text-gray-600 text-sm">You have completed all {totalQuestions} technical questions of your simulated interview session.</p>
            
            {/* High-Level Score Badges */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
              {/* Overall AI Score */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-blue-500 flex flex-col items-center justify-center">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">AI Predicted Score</span>
                <p className="text-4xl font-black text-blue-600">
                  {mlResult?.predicted_overall_score !== undefined ? Number(mlResult.predicted_overall_score).toFixed(1) : 75}
                  <span className="text-base text-gray-400">/100</span>
                </p>
                <span className="text-[11px] text-gray-500 mt-1">Multi-factor ML model</span>
              </div>

              {/* Eye Contact Score */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-purple-200 flex flex-col items-center justify-center">
                <span className="text-[11px] font-black text-purple-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Eye Contact
                </span>
                <p className="text-4xl font-black text-purple-600">
                  {Math.round(eyeContactScore)}<span className="text-base text-gray-400">%</span>
                </p>
                <span className="text-[11px] text-gray-500 mt-1">Vision AI Analysis</span>
              </div>

              {/* Weak Areas */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-start text-left">
                <h3 className="font-bold text-xs text-red-800 uppercase tracking-wider mb-2 border-b pb-1">Areas to Improve</h3>
                <ul className="text-xs space-y-1.5">
                  {topicScores && typeof topicScores === 'object' && Object.entries(topicScores).filter(([t, s]) => s < 70).length > 0 ? (
                    Object.entries(topicScores)
                      .filter(([topic, score]) => score < 70)
                      .sort((a, b) => a[1] - b[1])
                      .slice(0, 3)
                      .map(([topic, score], i) => (
                        <li key={i} className="flex justify-between items-center text-red-700">
                          <span className="truncate pr-1">{topic}</span>
                          <span className="bg-red-100 px-1.5 py-0.5 rounded font-bold">{Math.round(score)}%</span>
                        </li>
                      ))
                  ) : (
                    <li className="text-gray-400 italic">No major weak areas!</li>
                  )}
                </ul>
              </div>

              {/* Strong Areas */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-green-100 flex flex-col justify-start text-left">
                <h3 className="font-bold text-xs text-green-800 uppercase tracking-wider mb-2 border-b pb-1">Strong Domains</h3>
                <ul className="text-xs space-y-1.5">
                  {topicScores && typeof topicScores === 'object' && Object.entries(topicScores).filter(([t, s]) => s >= 70).length > 0 ? (
                    Object.entries(topicScores)
                      .filter(([topic, score]) => score >= 70)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([topic, score], i) => (
                        <li key={i} className="flex justify-between items-center text-green-700">
                          <span className="truncate pr-1">{topic}</span>
                          <span className="bg-green-100 px-1.5 py-0.5 rounded font-bold">{Math.round(score)}%</span>
                        </li>
                      ))
                  ) : (
                    <li className="text-gray-400 italic">Review recommendations below.</li>
                  )}
                </ul>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <button
                onClick={() => generatePDFReport({
                  candidateProfile,
                  history,
                  mlResult,
                  topicScores,
                  studyPlan,
                  totalQuestions,
                  eyeContactScore
                })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 text-sm shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PDF Diagnostic Report
              </button>

              <button
                onClick={() => navigate('/history')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 text-sm shadow-sm cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" /> View Analytics &amp; History
              </button>

              <button
                onClick={() => navigate('/')}
                className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Start New Interview
              </button>
            </div>
          </div>

          {/* 7-Day Study Plan Section */}
          {studyPlan === 'loading' ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-200 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Compiling your Personalized 7-Day Study Plan...</p>
            </div>
          ) : studyPlan === 'error' ? (
            <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-200 text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="text-red-800 font-bold text-sm">Failed to Generate Study Plan</h3>
              <p className="text-red-600 text-xs mt-1">The AI service might be busy. You can still export your PDF report or review transcripts above.</p>
            </div>
          ) : studyPlan && typeof studyPlan === 'string' ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-left">
              <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-600" /> Personalized 7-Day Study Plan
              </h2>
              <div className="bg-blue-50/40 p-6 rounded-xl border border-blue-100">
                <div 
                  className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none" 
                  dangerouslySetInnerHTML={{ 
                    __html: studyPlan
                      .replace(/\n/g, '<br/>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>') 
                  }} 
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          {sessionState === 'initializing' ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-500 text-sm">The AI is analyzing your profile and formulating a {currentDifficulty} question...</p>
            </div>
          ) : sessionState === 'evaluating' ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-700 font-medium mb-3 text-sm">Analyzing response &amp; evaluating technical reasoning...</p>
              
              {/* Real-Time Live Streaming Output (Upgrade 2) */}
              {streamingFeedback && (
                <div className="w-full max-w-2xl bg-purple-50 border border-purple-200 p-4 rounded-xl text-left text-xs text-purple-900 leading-relaxed shadow-inner">
                  <span className="font-bold block mb-1 text-purple-800 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-purple-600" /> Live AI Feedback Stream:
                  </span>
                  <p className="whitespace-pre-wrap">{streamingFeedback}</p>
                </div>
              )}
            </div>
          ) : sessionState === 'transcribing' ? (
             <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Transcribing audio to text...</p>
            </div>
          ) : (
            <>
              {/* Current Technical Question */}
              <div className="mb-4 flex gap-4 items-start">
                <div className="bg-blue-100 p-3 rounded-2xl flex-shrink-0">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Topic: {currentQuestion?.topic}</span>
                    <button
                      onClick={() => speakText(currentQuestion?.question)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      title="Replay Voice Question"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Replay Voice
                    </button>
                  </div>
                  <p className="text-base font-semibold text-gray-900 leading-relaxed">{currentQuestion?.question}</p>
                </div>
              </div>

              {/* Upgrade 1: Probing Follow-Up Banner */}
              {probeQuestion && (
                <div className="p-4 mb-4 bg-amber-50 border-l-4 border-amber-500 rounded-xl text-amber-900 shadow-sm flex items-start gap-3 animate-fade-in">
                  <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs uppercase tracking-wider text-amber-950">Interviewer Follow-Up Question:</span>
                      <button
                        onClick={() => speakText(probeQuestion)}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                        title="Replay Follow-Up Voice"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Replay
                      </button>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{probeQuestion}</p>
                  </div>
                </div>
              )}

              {/* Interactive Tools Bar: System Design Whiteboard & Python Sandbox */}
              <div className="mb-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWhiteboard(!showWhiteboard);
                    if (!showWhiteboard) setShowSandbox(false);
                  }}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    showWhiteboard 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  {showWhiteboard ? 'Hide System Design Whiteboard' : 'Open System Design Whiteboard'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSandbox(!showSandbox);
                    if (!showSandbox) setShowWhiteboard(false);
                  }}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    showSandbox 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  {showSandbox ? 'Hide Coding Sandbox' : 'Open Coding Sandbox'}
                </button>
              </div>

              {/* Interactive System Design Whiteboard (Feature 3) */}
              {showWhiteboard && (
                <div className="mb-4 animate-fade-in">
                  <Whiteboard />
                </div>
              )}

              {/* Live Coding Sandbox Component (Feature 4) */}
              {showSandbox && (
                <div className="mb-4 animate-fade-in">
                  <CodeSandbox />
                </div>
              )}

              {/* Answer Text Area & Audio Mic */}
              <div className="relative">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder={probeQuestion ? "Provide your follow-up explanation here, or click the mic to speak..." : "Type your answer here, explain your architecture, or click the microphone to speak..."}
                  className="w-full border border-gray-300 rounded-2xl p-4 min-h-[140px] outline-none focus:ring-2 focus:ring-blue-500 resize-none pr-14 text-sm"
                />
                
                {/* Audio Recording Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {isRecording ? (
                    <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse cursor-pointer">
                      <Square className="w-5 h-5 fill-current" /> Stop
                    </button>
                  ) : (
                    <button onClick={startRecording} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-full transition-colors cursor-pointer" title="Answer with voice">
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
                <p className={`text-xs font-semibold ${timeLeft < 30 ? 'text-red-500' : 'text-gray-500'}`}>
                  {timeLeft === 0 ? 'Time expired. Submitting...' : `Auto-submitting in ${formatTime(timeLeft)}`}
                </p>
                <button
                  onClick={() => handleSubmitAnswer(false)}
                  disabled={!textAnswer.trim() || isRecording}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-sm text-sm"
                >
                  {probeQuestion ? 'Submit Follow-up' : 'Submit Answer'} <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
