// Utilities for persistent interview history and analytics (100% free local storage)

const STORAGE_KEY = 'ai_interview_history_v1';

export const saveInterviewSession = (session) => {
  try {
    const existing = getInterviewHistory();
    const newSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      role: session.candidateProfile?.targetRole || 'Software Engineer',
      candidateName: session.candidateProfile?.name || 'Candidate',
      persona: session.candidateProfile?.interviewerPersona || 'standard',
      predictedScore: session.mlResult?.predicted_overall_score ?? 75,
      totalQuestions: session.history?.length || 0,
      topicScores: session.topicScores || {},
      eyeContactScore: session.eyeContactScore ?? 85,
      history: session.history || [],
      studyPlan: session.studyPlan || '',
      matchPercentage: session.matchData?.overall_match_percentage ?? 70
    };

    const updated = [newSession, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newSession;
  } catch (err) {
    console.error('Failed to save interview session to localStorage:', err);
    return null;
  }
};

export const getInterviewHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read interview history:', err);
    return [];
  }
};

export const clearInterviewHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear interview history:', err);
  }
};
