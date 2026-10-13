import { useState, useEffect, useRef, useCallback } from 'react';
import { CompetitionRoom, RoomPlayer, UserProfile, Question } from '../types';
import { INITIAL_QUESTIONS } from '../data/questions';

export function useCompetitionSocket(profile: UserProfile) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [currentRoom, setCurrentRoom] = useState<CompetitionRoom | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roundReviewData, setRoundReviewData] = useState<{ correctIndex: number } | null>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const simTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simBotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roomStateRef = useRef<CompetitionRoom | null>(null);

  // Keep roomStateRef in sync with currentRoom
  useEffect(() => {
    roomStateRef.current = currentRoom;
  }, [currentRoom]);

  // Connect to live WebSocket if available
  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setErrorMessage(null);
        // Authenticate immediately
        ws.send(JSON.stringify({
          type: 'auth',
          userId: `usr-${profile.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: profile.name,
          school: profile.school,
          city: profile.city,
          avatarId: profile.avatarId,
        }));
      };

      ws.onmessage = (event) => {
        if (isSimulatedMode) return;
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'authenticated':
              break;

            case 'room_created':
            case 'room_joined':
            case 'room_update':
              setCurrentRoom(msg.room);
              setTimeLeft(msg.room.questionTimeLeft);
              setErrorMessage(null);
              break;

            case 'round_started':
              setCurrentRoom(msg.room);
              setTimeLeft(30);
              setRoundReviewData(null);
              break;

            case 'timer_tick':
              setTimeLeft(msg.timeLeft);
              break;

            case 'player_answered':
              setCurrentRoom(msg.room);
              break;

            case 'round_ended':
              setCurrentRoom(msg.room);
              setRoundReviewData({ correctIndex: msg.correctIndex });
              break;

            case 'match_finished':
              setCurrentRoom(msg.room);
              setRoundReviewData(null);
              break;

            case 'player_left':
              setCurrentRoom(msg.room);
              break;

            case 'error':
              setErrorMessage(msg.message);
              break;
          }
        } catch (err) {
          console.error('Error handling message from socket', err);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        socketRef.current = null;
        // Auto-reconnect after 4 seconds if not unmounted
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 4000);
      };

      ws.onerror = () => {
        setConnectionStatus('disconnected');
      };
    } catch {
      setConnectionStatus('disconnected');
    }
  }, [profile.name, profile.school, profile.city, profile.avatarId, isSimulatedMode]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      if (simBotTimeoutRef.current) clearTimeout(simBotTimeoutRef.current);
    };
  }, [connect]);

  const send = (payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  // --- CLIENT-SIDE SIMULATION ENGINE (Offline & Fast Match) ---
  const clearSimTimers = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    if (simBotTimeoutRef.current) {
      clearTimeout(simBotTimeoutRef.current);
      simBotTimeoutRef.current = null;
    }
  };

  const startSimulatedMatch = useCallback((opponentChoice?: { name: string; school: string; city: string }) => {
    clearSimTimers();
    setIsSimulatedMode(true);
    setErrorMessage(null);

    // Pick 5 random questions
    const shuffled = [...INITIAL_QUESTIONS].sort(() => 0.5 - Math.random());
    const matchQuestions = shuffled.slice(0, 5);

    const opponentPool = [
      { name: 'Arkan Pradipta', school: 'SD Islam Al-Azhar 1', city: 'Jakarta Selatan' },
      { name: 'Clara Wijaya', school: 'SD Tarakanita 5', city: 'Jakarta Timur' },
      { name: 'Farhan Maulana', school: 'SD Al Hikmah', city: 'Surabaya' },
      { name: 'Nathania Aurelia', school: 'SD Santa Angela', city: 'Bandung' },
      { name: 'Rafi Al-Fatih', school: 'SD IT Nurul Fikri', city: 'Depok' },
    ];
    const opp = opponentChoice || opponentPool[Math.floor(Math.random() * opponentPool.length)];

    const player1: RoomPlayer = {
      id: `usr-${profile.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: profile.name,
      school: profile.school,
      city: profile.city,
      avatarId: profile.avatarId,
      isReady: true,
      score: 0,
      answeredCurrent: false,
      totalCorrect: 0,
      isConnected: true,
    };

    const player2: RoomPlayer = {
      id: `bot-${opp.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${opp.name} 🤖`,
      school: opp.school,
      city: opp.city,
      avatarId: 'star_champion',
      isReady: true,
      score: 0,
      answeredCurrent: false,
      totalCorrect: 0,
      isConnected: true,
    };

    const initialRoom: CompetitionRoom = {
      code: `SIM-${Math.floor(100 + Math.random() * 900)}`,
      status: 'countdown',
      players: [player1, player2],
      questions: matchQuestions,
      currentQuestionIndex: 0,
      countdownSeconds: 3,
      questionTimeLeft: 30,
      totalQuestions: 5,
      createdAt: Date.now(),
    };

    setCurrentRoom(initialRoom);
    roomStateRef.current = initialRoom;

    // 3s Countdown
    let cd = 3;
    const cdInterval = setInterval(() => {
      cd -= 1;
      if (cd <= 0) {
        clearInterval(cdInterval);
        startSimRound(0, initialRoom);
      } else {
        setCurrentRoom((prev) => prev ? { ...prev, countdownSeconds: cd } : null);
      }
    }, 1000);
  }, [profile]);

  const startSimRound = (qIndex: number, currentBaseRoom: CompetitionRoom) => {
    clearSimTimers();
    setRoundReviewData(null);

    const updatedPlayers = currentBaseRoom.players.map((p) => ({
      ...p,
      answeredCurrent: false,
      lastAnswerCorrect: undefined,
      lastAnswerTime: undefined,
    }));

    const roundRoom: CompetitionRoom = {
      ...currentBaseRoom,
      status: 'in_game',
      currentQuestionIndex: qIndex,
      questionTimeLeft: 30,
      players: updatedPlayers,
    };

    setCurrentRoom(roundRoom);
    roomStateRef.current = roundRoom;
    setTimeLeft(30);

    const question = roundRoom.questions[qIndex];
    let tLeft = 30;

    // Start 1-second interval
    simTimerRef.current = setInterval(() => {
      tLeft -= 1;
      setTimeLeft(tLeft);
      if (tLeft <= 0) {
        endSimRound(qIndex);
      }
    }, 1000);

    // Schedule simulated opponent response between 4s and 14s
    const botDelaySec = Math.floor(4 + Math.random() * 10);
    simBotTimeoutRef.current = setTimeout(() => {
      handleSimBotAnswer(qIndex, question, 30 - botDelaySec);
    }, botDelaySec * 1000);
  };

  const handleSimBotAnswer = (qIndex: number, question: Question, answeredAtSecLeft: number) => {
    const room = roomStateRef.current;
    if (!room || room.status !== 'in_game' || room.currentQuestionIndex !== qIndex) return;

    const botPlayer = room.players.find((p) => p.id.startsWith('bot-'));
    if (!botPlayer || botPlayer.answeredCurrent) return;

    // 80% correct probability
    const isCorrect = Math.random() < 0.82;
    const chosenIndex = isCorrect
      ? question.correctIndex
      : (question.correctIndex + 1) % question.options.length;

    const speedBonus = isCorrect ? Math.max(0, answeredAtSecLeft * 3) : 0;
    const earnedPoints = isCorrect ? 100 + speedBonus : 0;

    const updatedPlayers = room.players.map((p) => {
      if (p.id === botPlayer.id) {
        return {
          ...p,
          answeredCurrent: true,
          lastAnswerCorrect: isCorrect,
          score: p.score + earnedPoints,
          totalCorrect: p.totalCorrect + (isCorrect ? 1 : 0),
        };
      }
      return p;
    });

    const updatedRoom: CompetitionRoom = {
      ...room,
      players: updatedPlayers,
    };

    setCurrentRoom(updatedRoom);
    roomStateRef.current = updatedRoom;

    // If both players have answered, end round early
    if (updatedPlayers.every((p) => p.answeredCurrent)) {
      endSimRound(qIndex);
    }
  };

  const endSimRound = (qIndex: number) => {
    clearSimTimers();
    const room = roomStateRef.current;
    if (!room) return;

    const question = room.questions[qIndex];
    setRoundReviewData({ correctIndex: question.correctIndex });

    const reviewRoom: CompetitionRoom = {
      ...room,
      status: 'round_review',
    };

    setCurrentRoom(reviewRoom);
    roomStateRef.current = reviewRoom;

    // Wait 3.5 seconds for answer review, then either go to next round or finish match
    setTimeout(() => {
      const nextIndex = qIndex + 1;
      if (nextIndex < room.totalQuestions) {
        startSimRound(nextIndex, reviewRoom);
      } else {
        // Finish match
        const p1 = reviewRoom.players[0];
        const p2 = reviewRoom.players[1];
        let winnerId: string | 'tie' = 'tie';
        if (p1.score > p2.score) winnerId = p1.id;
        else if (p2.score > p1.score) winnerId = p2.id;

        const finishedRoom: CompetitionRoom = {
          ...reviewRoom,
          status: 'finished',
          winnerId,
        };
        setCurrentRoom(finishedRoom);
        roomStateRef.current = finishedRoom;
        setRoundReviewData(null);
      }
    }, 3500);
  };

  const submitSimulatedAnswer = (answerIndex: number) => {
    const room = roomStateRef.current;
    if (!room || room.status !== 'in_game') return;

    const userPlayer = room.players.find((p) => !p.id.startsWith('bot-'));
    if (!userPlayer || userPlayer.answeredCurrent) return;

    const currentQ = room.questions[room.currentQuestionIndex];
    const isCorrect = answerIndex === currentQ.correctIndex;
    const speedBonus = isCorrect ? Math.max(0, timeLeft * 3) : 0;
    const earnedPoints = isCorrect ? 100 + speedBonus : 0;

    const updatedPlayers = room.players.map((p) => {
      if (p.id === userPlayer.id) {
        return {
          ...p,
          answeredCurrent: true,
          lastAnswerCorrect: isCorrect,
          score: p.score + earnedPoints,
          totalCorrect: p.totalCorrect + (isCorrect ? 1 : 0),
        };
      }
      return p;
    });

    const updatedRoom: CompetitionRoom = {
      ...room,
      players: updatedPlayers,
    };

    setCurrentRoom(updatedRoom);
    roomStateRef.current = updatedRoom;

    // If both players have answered, trigger round end immediately
    if (updatedPlayers.every((p) => p.answeredCurrent)) {
      endSimRound(room.currentQuestionIndex);
    }
  };

  // User Actions
  const createRoom = () => {
    setIsSimulatedMode(false);
    send({ type: 'create_room' });
  };

  const joinRoom = (roomCode: string) => {
    setIsSimulatedMode(false);
    send({ type: 'join_room', roomCode });
  };

  const quickMatch = () => {
    if (connectionStatus === 'connected') {
      setIsSimulatedMode(false);
      send({ type: 'quick_match' });
    } else {
      // Automatic fallback to simulated match when server socket not available
      startSimulatedMatch();
    }
  };

  const toggleReady = () => {
    if (isSimulatedMode) return;
    send({ type: 'toggle_ready' });
  };

  const submitAnswer = (answerIndex: number) => {
    if (isSimulatedMode) {
      submitSimulatedAnswer(answerIndex);
    } else {
      send({ type: 'submit_answer', answerIndex });
    }
  };

  const rematch = () => {
    if (isSimulatedMode) {
      startSimulatedMatch();
    } else {
      send({ type: 'rematch' });
    }
  };

  const leaveRoom = () => {
    clearSimTimers();
    setIsSimulatedMode(false);
    if (!isSimulatedMode) {
      send({ type: 'leave_room' });
    }
    setCurrentRoom(null);
    roomStateRef.current = null;
    setRoundReviewData(null);
  };

  return {
    connectionStatus,
    currentRoom,
    timeLeft,
    roundReviewData,
    errorMessage,
    isSimulatedMode,
    createRoom,
    joinRoom,
    quickMatch,
    startSimulatedMatch,
    toggleReady,
    submitAnswer,
    rematch,
    leaveRoom,
  };
}
