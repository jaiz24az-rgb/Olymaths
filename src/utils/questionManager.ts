import { Question, TopicCategory, DifficultyLevel, AnswerRecord } from '../types';
import { INITIAL_QUESTIONS } from '../data/questions';
import { generateDynamicBatch } from './dynamicQuestions';
import { getStoredAnswers } from './storage';

const SESSION_KEY = 'olimpiade_sd4_session_id';

// Shuffles an array using Fisher-Yates
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate or get current session ID to know if this is a fresh entry
export function getOrCreateSessionId(): string {
  try {
    let sess = sessionStorage.getItem(SESSION_KEY);
    if (!sess) {
      sess = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem(SESSION_KEY, sess);
    }
    return sess;
  } catch (e) {
    return `sess_${Date.now()}`;
  }
}

// Force new session (e.g. when user clicks "Acak Sesi Baru")
export function startNewSession(): string {
  const newSess = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    sessionStorage.setItem(SESSION_KEY, newSess);
  } catch (e) {
    // ignore
  }
  return newSess;
}

/**
 * Builds a dynamic, randomized question pool for the current session.
 * Prioritizes:
 * 1. Questions never answered by the student yet
 * 2. Questions previously answered incorrectly (for mastery)
 * 3. Fresh procedural dynamic questions
 * 4. Mastered questions shuffled at the end
 */
export function getSessionQuestionPool(options?: {
  topic?: TopicCategory | 'all' | 'omnas';
  difficulty?: DifficultyLevel;
  difficultyMode?: 'adaptive' | 'manual';
  includeDynamic?: boolean;
}): { questions: Question[]; totalAvailable: number; unansweredCount: number } {
  const storedAnswers = getStoredAnswers();
  const answeredQuestionIds = new Set(storedAnswers.map((a) => a.questionId));
  const wrongQuestionIds = new Set(storedAnswers.filter((a) => !a.isCorrect).map((a) => a.questionId));

  // Combine initial questions + batch of dynamic questions
  const dynamicBatch = generateDynamicBatch(8);
  const combinedPool = [...INITIAL_QUESTIONS, ...dynamicBatch];

  // Filter based on topic and difficulty if specified
  const filtered = combinedPool.filter((q) => {
    if (options?.topic === 'omnas') {
      return !!q.source?.includes('OMNAS');
    }
    const matchTopic = !options?.topic || options.topic === 'all' || q.topic === options.topic;
    const matchDifficulty = !options?.difficulty || q.difficulty === options.difficulty;
    return matchTopic && matchDifficulty;
  });

  const targetList = filtered.length > 0 ? filtered : combinedPool;

  // Split into buckets:
  // Bucket A: Never answered yet
  const unanswered: Question[] = [];
  // Bucket B: Answered wrong previously
  const reviewNeeded: Question[] = [];
  // Bucket C: Already answered correctly
  const completed: Question[] = [];

  for (const q of targetList) {
    if (!answeredQuestionIds.has(q.id)) {
      unanswered.push(q);
    } else if (wrongQuestionIds.has(q.id)) {
      reviewNeeded.push(q);
    } else {
      completed.push(q);
    }
  }

  // Shuffle each bucket independently
  const shuffledUnanswered = shuffleArray(unanswered);
  const shuffledReview = shuffleArray(reviewNeeded);
  const shuffledCompleted = shuffleArray(completed);

  // Result sequence puts fresh unseen questions first, then review questions, then remaining
  const finalQuestions = [...shuffledUnanswered, ...shuffledReview, ...shuffledCompleted];

  // If for some reason finalQuestions is empty, fallback to shuffled initial questions
  const result = finalQuestions.length > 0 ? finalQuestions : shuffleArray(INITIAL_QUESTIONS);

  return {
    questions: result,
    totalAvailable: result.length,
    unansweredCount: unanswered.length,
  };
}
