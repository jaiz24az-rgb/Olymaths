import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_QUESTIONS } from './src/data/questions';
import { CompetitionRoom, RoomPlayer, Question } from './src/types';

const app = express();
app.use(express.json({ limit: '15mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// In-memory real-time rooms
interface ServerRoom extends CompetitionRoom {
  timerInterval?: NodeJS.Timeout;
}

const rooms = new Map<string, ServerRoom>();
const clientRooms = new Map<WebSocket, string>();
const clientPlayers = new Map<WebSocket, RoomPlayer>();

// Generate unique 6-character room code (e.g. OSN-412)
function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const lPart = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
  const nPart = Math.floor(100 + Math.random() * 900);
  return `OSN-${lPart}${nPart}`;
}

// Select 5 varied questions for the match
function pickMatchQuestions(): Question[] {
  const shuffled = [...INITIAL_QUESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
}

function broadcastToRoom(roomCode: string, payload: any) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomCode) {
      client.send(message);
    }
  }
}

function getSanitizedRoom(room: ServerRoom): CompetitionRoom {
  return {
    code: room.code,
    status: room.status,
    players: room.players,
    questions: room.questions,
    currentQuestionIndex: room.currentQuestionIndex,
    countdownSeconds: room.countdownSeconds,
    questionTimeLeft: room.questionTimeLeft,
    totalQuestions: room.totalQuestions,
    winnerId: room.winnerId,
    createdAt: room.createdAt,
  };
}

function startCountdown(room: ServerRoom) {
  room.status = 'countdown';
  room.countdownSeconds = 3;
  broadcastToRoom(room.code, {
    type: 'room_update',
    room: getSanitizedRoom(room),
  });

  const countInterval = setInterval(() => {
    room.countdownSeconds -= 1;
    if (room.countdownSeconds <= 0) {
      clearInterval(countInterval);
      startRound(room, 0);
    } else {
      broadcastToRoom(room.code, {
        type: 'room_update',
        room: getSanitizedRoom(room),
      });
    }
  }, 1000);
}

function startRound(room: ServerRoom, questionIndex: number) {
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.status = 'in_game';
  room.currentQuestionIndex = questionIndex;
  room.questionTimeLeft = 30; // 30 seconds per question

  // Reset players answered flag
  room.players.forEach((p) => {
    p.answeredCurrent = false;
    p.lastAnswerCorrect = undefined;
  });

  broadcastToRoom(room.code, {
    type: 'round_started',
    room: getSanitizedRoom(room),
  });

  room.timerInterval = setInterval(() => {
    room.questionTimeLeft -= 1;

    // Broadcast tick every second
    broadcastToRoom(room.code, {
      type: 'timer_tick',
      timeLeft: room.questionTimeLeft,
    });

    if (room.questionTimeLeft <= 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      handleRoundEnd(room);
    }
  }, 1000);
}

function handleRoundEnd(room: ServerRoom) {
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.status = 'round_review';
  const currentQ = room.questions[room.currentQuestionIndex];

  broadcastToRoom(room.code, {
    type: 'round_ended',
    correctIndex: currentQ ? currentQ.correctIndex : 0,
    room: getSanitizedRoom(room),
  });

  // After 3 seconds review, move to next round or finish
  setTimeout(() => {
    if (room.currentQuestionIndex + 1 < room.totalQuestions) {
      startRound(room, room.currentQuestionIndex + 1);
    } else {
      finishMatch(room);
    }
  }, 3000);
}

function finishMatch(room: ServerRoom) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  room.status = 'finished';

  const [p1, p2] = room.players;
  if (!p2) {
    room.winnerId = p1 ? p1.id : undefined;
  } else if (p1.score > p2.score) {
    room.winnerId = p1.id;
  } else if (p2.score > p1.score) {
    room.winnerId = p2.id;
  } else {
    room.winnerId = 'tie';
  }

  broadcastToRoom(room.code, {
    type: 'match_finished',
    winnerId: room.winnerId,
    room: getSanitizedRoom(room),
  });
}

// WebSocket handler
wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'auth': {
          const player: RoomPlayer = {
            id: msg.userId || `usr-${Math.random().toString(36).substring(2, 7)}`,
            name: msg.name || 'Siswa Kelas 4',
            school: msg.school || 'SD Indonesia',
            city: msg.city || 'Indonesia',
            avatarId: msg.avatarId || 'boy_hero',
            isReady: false,
            score: 0,
            answeredCurrent: false,
            totalCorrect: 0,
            isConnected: true,
          };
          clientPlayers.set(ws, player);
          ws.send(JSON.stringify({ type: 'authenticated', player }));
          break;
        }

        case 'create_room': {
          const player = clientPlayers.get(ws);
          if (!player) return;

          const code = generateRoomCode();
          const matchQuestions = pickMatchQuestions();

          player.isReady = false;
          player.score = 0;
          player.totalCorrect = 0;
          player.answeredCurrent = false;

          const newRoom: ServerRoom = {
            code,
            status: 'waiting',
            players: [player],
            questions: matchQuestions,
            currentQuestionIndex: 0,
            countdownSeconds: 3,
            questionTimeLeft: 30,
            totalQuestions: matchQuestions.length,
            createdAt: Date.now(),
          };

          rooms.set(code, newRoom);
          clientRooms.set(ws, code);

          ws.send(JSON.stringify({
            type: 'room_created',
            roomCode: code,
            room: getSanitizedRoom(newRoom),
          }));
          break;
        }

        case 'join_room': {
          const player = clientPlayers.get(ws);
          if (!player) return;

          const code = (msg.roomCode || '').toUpperCase().trim();
          const room = rooms.get(code);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Kode ruangan tidak ditemukan!' }));
            return;
          }

          if (room.players.length >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Ruangan sudah penuh (maksimal 2 pemain)!' }));
            return;
          }

          if (room.status !== 'waiting') {
            ws.send(JSON.stringify({ type: 'error', message: 'Pertandingan di ruangan ini sudah berlangsung!' }));
            return;
          }

          player.isReady = false;
          player.score = 0;
          player.totalCorrect = 0;
          player.answeredCurrent = false;

          room.players.push(player);
          clientRooms.set(ws, code);

          broadcastToRoom(code, {
            type: 'room_update',
            room: getSanitizedRoom(room),
          });
          break;
        }

        case 'quick_match': {
          const player = clientPlayers.get(ws);
          if (!player) return;

          // Find an open room waiting for 1 opponent
          let openRoom: ServerRoom | undefined;
          for (const r of rooms.values()) {
            if (r.status === 'waiting' && r.players.length === 1) {
              openRoom = r;
              break;
            }
          }

          if (openRoom) {
            player.isReady = false;
            player.score = 0;
            player.totalCorrect = 0;
            player.answeredCurrent = false;

            openRoom.players.push(player);
            clientRooms.set(ws, openRoom.code);

            broadcastToRoom(openRoom.code, {
              type: 'room_update',
              room: getSanitizedRoom(openRoom),
            });
          } else {
            // Create a new public room
            const code = generateRoomCode();
            const matchQuestions = pickMatchQuestions();

            player.isReady = false;
            player.score = 0;
            player.totalCorrect = 0;
            player.answeredCurrent = false;

            const newRoom: ServerRoom = {
              code,
              status: 'waiting',
              players: [player],
              questions: matchQuestions,
              currentQuestionIndex: 0,
              countdownSeconds: 3,
              questionTimeLeft: 30,
              totalQuestions: matchQuestions.length,
              createdAt: Date.now(),
            };

            rooms.set(code, newRoom);
            clientRooms.set(ws, code);

            ws.send(JSON.stringify({
              type: 'room_created',
              roomCode: code,
              room: getSanitizedRoom(newRoom),
            }));
          }
          break;
        }

        case 'toggle_ready': {
          const roomCode = clientRooms.get(ws);
          if (!roomCode) return;
          const room = rooms.get(roomCode);
          if (!room) return;

          const player = clientPlayers.get(ws);
          if (!player) return;

          const pInRoom = room.players.find((p) => p.id === player.id);
          if (pInRoom) {
            pInRoom.isReady = !pInRoom.isReady;
          }

          broadcastToRoom(roomCode, {
            type: 'room_update',
            room: getSanitizedRoom(room),
          });

          // If 2 players and both ready, start countdown!
          if (room.players.length === 2 && room.players.every((p) => p.isReady)) {
            startCountdown(room);
          }
          break;
        }

        case 'submit_answer': {
          const roomCode = clientRooms.get(ws);
          if (!roomCode) return;
          const room = rooms.get(roomCode);
          if (!room || room.status !== 'in_game') return;

          const player = clientPlayers.get(ws);
          if (!player) return;

          const pInRoom = room.players.find((p) => p.id === player.id);
          if (!pInRoom || pInRoom.answeredCurrent) return;

          const currentQ = room.questions[room.currentQuestionIndex];
          if (!currentQ) return;

          const isCorrect = msg.answerIndex === currentQ.correctIndex;
          pInRoom.answeredCurrent = true;
          pInRoom.lastAnswerCorrect = isCorrect;
          pInRoom.lastAnswerTime = Date.now();

          if (isCorrect) {
            pInRoom.totalCorrect += 1;
            // Base 100 points + speed bonus (up to 50 points based on remaining time)
            const speedBonus = Math.round((Math.max(1, room.questionTimeLeft) / 30) * 50);
            pInRoom.score += 100 + speedBonus;
          }

          // Broadcast that this player answered (without revealing correctness to prevent leaking to opponent before round end)
          broadcastToRoom(roomCode, {
            type: 'player_answered',
            playerId: player.id,
            room: getSanitizedRoom(room),
          });

          // If all active players answered, end round immediately!
          const allAnswered = room.players.every((p) => p.answeredCurrent);
          if (allAnswered) {
            handleRoundEnd(room);
          }
          break;
        }

        case 'rematch': {
          const roomCode = clientRooms.get(ws);
          if (!roomCode) return;
          const room = rooms.get(roomCode);
          if (!room) return;

          room.status = 'waiting';
          room.questions = pickMatchQuestions();
          room.currentQuestionIndex = 0;
          room.winnerId = undefined;
          room.players.forEach((p) => {
            p.isReady = false;
            p.score = 0;
            p.totalCorrect = 0;
            p.answeredCurrent = false;
            p.lastAnswerCorrect = undefined;
          });

          broadcastToRoom(roomCode, {
            type: 'room_update',
            room: getSanitizedRoom(room),
          });
          break;
        }

        case 'leave_room': {
          const roomCode = clientRooms.get(ws);
          if (!roomCode) return;
          handleLeave(ws, roomCode);
          break;
        }
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const roomCode = clientRooms.get(ws);
    if (roomCode) {
      handleLeave(ws, roomCode);
    }
    clientPlayers.delete(ws);
  });
});

function handleLeave(ws: WebSocket, roomCode: string) {
  const room = rooms.get(roomCode);
  const player = clientPlayers.get(ws);
  clientRooms.delete(ws);

  if (room && player) {
    room.players = room.players.filter((p) => p.id !== player.id);
    if (room.players.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      rooms.delete(roomCode);
    } else {
      if (room.status === 'in_game' || room.status === 'countdown') {
        if (room.timerInterval) clearInterval(room.timerInterval);
        room.status = 'finished';
        room.winnerId = room.players[0].id;
      }
      broadcastToRoom(roomCode, {
        type: 'player_left',
        playerId: player.id,
        room: getSanitizedRoom(room),
      });
    }
  }
}

// REST health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    roomsCount: rooms.size,
    onlineClients: wss.clients.size,
  });
});

// AI Question Scanner endpoint with Gemini 3.8 Flash
app.post('/api/scan-question', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', studentNote = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Foto soal belum disediakan.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Kunci API Gemini belum tersedia di pengaturan server.' 
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const promptText = `
Kamu adalah Guru Ahli Olimpiade Matematika SD Kelas 4 yang sangat ramah, suportif, dan pintar menjelaskan logika konsep matematika kepada siswa sekolah dasar.
Siswa baru saja mengambil foto soal matematika yang diberikan oleh gurunya di sekolah atau tempat les.

Tugasmu:
1. Bacalah gambar tersebut dengan sangat teliti (teks soal, angka, diagram geometri, tabel, pecahan, atau tulisan tangan guru jika ada).
2. Tentukan topik soal: salah satu dari "bilangan", "pecahan", "geometri", "logika", atau "soal_cerita".
3. Tentukan tingkat kesulitan: "mudah", "sedang", atau "olimpiade".
4. Jelaskan apa tujuan pembelajaran atau konsep inti yang sedang diuji guru melalui soal ini.
5. Hitung jawaban yang benar dengan 100% ketelitian.
6. Buatlah pembahasan langkah demi langkah (stepByStepSolution) yang runtut, mudah dicerna anak kelas 4 SD, menyemangati, dan menggunakan analogi yang konkret.
7. Berikan "Trik Cepat 10 Detik" (quickTrick) khas trik cerdas olimpiade untuk menyelesaikan soal semacam ini secara lebih cepat dan cerdas.
8. Berikan peringatan "Jebakan / Kesalahan Umum" (commonMistakes) yang sering membuat siswa salah menghitung.
9. Buat 1 soal tantangan latihan serupa (followUpQuestion) dengan 4 pilihan ganda (options A-D), correctIndex (0-3), petunjuk (hint), dan pembahasannya agar siswa bisa langsung mempraktikkan konsep.

Format balasan HARUS berupa objek JSON valid dengan struktur:
{
  "rawQuestion": "Teks lengkap soal dari guru yang terbaca dari gambar",
  "topic": "bilangan",
  "difficulty": "sedang",
  "teacherIntent": "Materi konsep yang diuji oleh guru",
  "finalAnswer": "Jawaban akhir yang tepat dan lengkap dengan satuan",
  "stepByStepSolution": "Pembahasan rinci, terstruktur, dan mudah dipahami",
  "quickTrick": "Trik cerdas / cara kilat 10 detik khas olimpiade",
  "commonMistakes": "Kesalahan yang sering dilakukan anak-anak pada soal ini",
  "followUpQuestion": {
    "question": "Soal latihan serupa untuk menguji pemahaman",
    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "correctIndex": 0,
    "hint": "Petunjuk berpikir",
    "explanation": "Pembahasan singkat soal latihan"
  }
}

${studentNote ? `Catatan/kebingungan siswa saat mengerjakan: "${studentNote}"` : ''}

Balas HANYA teks JSON murni tanpa markdown pembungkus.
`;

    // Try primary model and fallback models if temporary 503 high demand occurs
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let response: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          break; // successfully generated
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} returned error, attempting fallback...`, err?.message || err);
        // Wait 800ms before attempting fallback model
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Gagal mendapatkan respon dari AI.');
    }

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    res.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    console.error('Error in /api/scan-question:', err);
    let userFriendlyMsg = 'Gagal memindai dan membahas soal dari guru.';
    const rawMsg = String(err?.message || err);
    if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
      userFriendlyMsg = 'Layanan AI sedang mengalami lonjakan antrean sementara (503). Silakan tekan tombol "Coba Kirim Ulang" untuk mencoba kembali.';
    } else if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      userFriendlyMsg = 'Batas kuota harian sementara tercapai. Mohon tunggu beberapa detik lalu coba lagi.';
    }
    res.status(503).json({
      error: userFriendlyMsg,
      original: rawMsg,
    });
  }
});

// Attach selective upgrade handler for WebSocket duel
server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
      return;
    }
    // Do NOT destroy socket if not /ws, allowing Vite or other tools to handle it
  } catch (err) {
    // Ignore malformed url
  }
});

// Serve frontend in dev or prod
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
