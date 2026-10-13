import { Question, TopicCategory, DifficultyLevel } from '../types';

// Helper to shuffle options and track correctIndex
function createQuestionWithOptions(params: {
  id: string;
  topic: TopicCategory;
  difficulty: DifficultyLevel;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  hint: string;
  explanation: string;
  points: number;
  quickTrick?: string;
  kisiKisi?: string;
  source?: string;
  svgDiagramType?: Question['svgDiagramType'];
  svgData?: Record<string, any>;
}): Question {
  // Ensure exactly 3 unique wrong answers
  const uniqueWrongs = Array.from(new Set(params.wrongAnswers.filter(w => w !== params.correctAnswer))).slice(0, 3);
  while (uniqueWrongs.length < 3) {
    const num = parseInt(params.correctAnswer, 10);
    if (!isNaN(num)) {
      const candidate = String(num + uniqueWrongs.length + 1);
      if (candidate !== params.correctAnswer && !uniqueWrongs.includes(candidate)) {
        uniqueWrongs.push(candidate);
      }
    } else {
      uniqueWrongs.push(`Pilihan ${uniqueWrongs.length + 1}`);
    }
  }

  const all = [params.correctAnswer, ...uniqueWrongs];
  // Deterministic or pseudo-random shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  const correctIndex = all.indexOf(params.correctAnswer);

  return {
    id: params.id,
    topic: params.topic,
    difficulty: params.difficulty,
    question: params.question,
    options: all,
    correctIndex,
    hint: params.hint,
    explanation: params.explanation,
    points: params.points,
    quickTrick: params.quickTrick,
    kisiKisi: params.kisiKisi,
    source: params.source || 'Generator Adaptif OSN SD',
    svgDiagramType: params.svgDiagramType,
    svgData: params.svgData,
  };
}

// 1. Gauss Sum Variation (1..N or step sums)
export function generateGaussSumQuestion(seed = Date.now()): Question {
  const nList = [20, 25, 30, 40, 50, 60, 100];
  const n = nList[Math.floor(Math.random() * nList.length)];
  const sum = (n * (n + 1)) / 2;
  const id = `dyn-gauss-${n}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'bilangan',
    difficulty: n > 30 ? 'sedang' : 'mudah',
    question: `Hitunglah nilai penjumlahan beruntun berikut secara cepat tanpa menjumlahkan satu per satu:\n1 + 2 + 3 + ... + ${n} = ...`,
    correctAnswer: String(sum),
    wrongAnswers: [
      String(sum - n),
      String(sum + n),
      String((n * n) / 2),
    ],
    hint: `Gunakan rumus Gauss: Pasangkan angka pertama dan terakhir (1 + ${n} = ${n + 1}). Berapa banyak pasangan jika ada ${n} angka?`,
    explanation: `Metode Gauss:\nRumus jumlah deret 1 hingga N = [N × (N + 1)] ÷ 2.\nUntuk N = ${n}:\nJumlah = [${n} × ${n + 1}] ÷ 2 = ${n * (n + 1)} ÷ 2 = ${sum}.`,
    points: n > 30 ? 20 : 10,
    quickTrick: `Kalikan bilangan terakhir (${n}) dengan bilangan setelahnya (${n + 1}), lalu bagi 2!`,
    kisiKisi: 'Penjumlahan Bilangan Berurutan (Rumus Carl Friedrich Gauss)',
  });
}

// 2. Kambing dan Ayam Puzzle (Hewan Berkaki 2 dan 4)
export function generateLegsPuzzleQuestion(seed = Date.now()): Question {
  const headsList = [15, 20, 25, 30];
  const totalHeads = headsList[Math.floor(Math.random() * headsList.length)];
  const goats = Math.floor(totalHeads * 0.3) + Math.floor(Math.random() * 4); // 4-legged
  const chickens = totalHeads - goats; // 2-legged
  const totalLegs = (chickens * 2) + (goats * 4);
  const id = `dyn-legs-${totalHeads}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'soal_cerita',
    difficulty: 'sedang',
    question: `Di sebuah peternakan terdapat ayam dan kambing. Jumlah kepala seluruh hewan adalah ${totalHeads} ekor, sedangkan jumlah seluruh kaki hewan adalah ${totalLegs} buah. Berapakah banyak kambing di peternakan tersebut?`,
    correctAnswer: String(goats),
    wrongAnswers: [
      String(chickens),
      String(Math.max(1, goats - 2)),
      String(goats + 2),
    ],
    hint: `Bayangkan jika semua hewan tersebut adalah ayam (semua berkaki 2), berapa total kaki yang ada? Selisihnya merupakan kontribusi kaki ekstra kambing!`,
    explanation: `Metode Asumsi (Supposition Method):\n1) Jika semua ${totalHeads} hewan berkaki 2 (ayam), maka jumlah kaki = ${totalHeads} × 2 = ${totalHeads * 2}.\n2) Selisih kaki sesungguhnya = ${totalLegs} - ${totalHeads * 2} = ${totalLegs - (totalHeads * 2)} kaki.\n3) Setiap kambing menyumbang 2 kaki ekstra (4 - 2 = 2).\n4) Banyak kambing = ${totalLegs - (totalHeads * 2)} ÷ 2 = ${goats} ekor.\n(Banyak ayam = ${totalHeads} - ${goats} = ${chickens} ekor).`,
    points: 20,
    quickTrick: `(Total Kaki - [Total Kepala × 2]) ÷ 2 langsung memberikan jumlah hewan berkaki 4!`,
    kisiKisi: 'Aljabar Sederhana / Metode Anggapan Soal Cerita Hewan',
  });
}

// 3. KPK Lampu / Jadwal Kontekstual
export function generateKPKQuestion(seed = Date.now()): Question {
  const pairs = [
    { a: 4, b: 6, kpk: 12 },
    { a: 6, b: 8, kpk: 24 },
    { a: 8, b: 12, kpk: 24 },
    { a: 10, b: 15, kpk: 30 },
    { a: 12, b: 15, kpk: 60 },
    { a: 15, b: 20, kpk: 60 },
  ];
  const choice = pairs[Math.floor(Math.random() * pairs.length)];
  const startHour = 8; // 08:00
  const id = `dyn-kpk-${choice.a}-${choice.b}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'bilangan',
    difficulty: 'mudah',
    question: `Lampu merah menyala setiap ${choice.a} detik sekali dan lampu hijau menyala setiap ${choice.b} detik sekali. Jika kedua lampu menyala bersamaan pada detik ke-0, setelah berapa detik kedua lampu akan menyala bersamaan untuk yang pertama kalinya lagi?`,
    correctAnswer: `${choice.kpk} detik`,
    wrongAnswers: [
      `${choice.a * choice.b} detik`,
      `${choice.kpk + choice.a} detik`,
      `${choice.kpk / 2} detik`,
    ],
    hint: `Cari Kelipatan Persekutuan Terkecil (KPK) dari ${choice.a} dan ${choice.b}.`,
    explanation: `Kelipatan ${choice.a}: ${choice.a}, ${choice.a * 2}, ${choice.a * 3}, ${choice.a * 4}, ...\nKelipatan ${choice.b}: ${choice.b}, ${choice.b * 2}, ${choice.b * 3}, ...\nKelipatan persekutuan terkecil (KPK) dari ${choice.a} dan ${choice.b} adalah ${choice.kpk}.\nJadi kedua lampu menyala bersamaan setiap ${choice.kpk} detik.`,
    points: 10,
    quickTrick: `Ambil bilangan yang lebih besar (${choice.b}) lalu uji kelipatannya sampai habis dibagi ${choice.a}!`,
    kisiKisi: 'Konsep KPK (Kelipatan Persekutuan Terkecil) Kontekstual',
  });
}

// 4. Pola Barisan Aritmatika Bertingkat
export function generatePatternQuestion(seed = Date.now()): Question {
  const start = Math.floor(Math.random() * 5) + 2; // 2..6
  const diff = Math.floor(Math.random() * 4) + 3; // 3..6
  const seq = [start, start + diff, start + (diff * 2), start + (diff * 3), start + (diff * 4)];
  const nextVal = start + (diff * 5);
  const id = `dyn-pattern-${start}-${diff}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'bilangan',
    difficulty: 'mudah',
    question: `Perhatikan barisan bilangan berikut:\n${seq.join(', ')}, ...\nBilangan berikutnya pada pola di atas adalah?`,
    correctAnswer: String(nextVal),
    wrongAnswers: [
      String(nextVal - 1),
      String(nextVal + diff),
      String(nextVal - diff + 1),
    ],
    hint: `Perhatikan selisih antara bilangan yang berdampingan: (${seq[1]} - ${seq[0]} = ?).`,
    explanation: `Selisih setiap bilangan yang berdekatan selalu bertambah +${diff}:\n${seq[0]} + ${diff} = ${seq[1]}\n${seq[1]} + ${diff} = ${seq[2]}\n...\n${seq[4]} + ${diff} = ${nextVal}.\nJadi bilangan berikutnya adalah ${nextVal}.`,
    points: 10,
    quickTrick: `Cari beda (selisih) tetapnya, lalu tambahkan ke suku terakhir!`,
    kisiKisi: 'Pola Bilangan Aritmatika Dasar',
    svgDiagramType: 'pattern_sequence',
    svgData: { sequence: [...seq, '?'] },
  });
}

// 5. Geometri: Keliling dan Luas Persegi Panjang
export function generatePerimeterAreaQuestion(seed = Date.now()): Question {
  const pList = [12, 14, 16, 18, 20];
  const p = pList[Math.floor(Math.random() * pList.length)];
  const l = p - Math.floor(Math.random() * 4 + 2);
  const keliling = 2 * (p + l);
  const luas = p * l;
  const id = `dyn-geo-${p}-${l}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'geometri',
    difficulty: 'sedang',
    question: `Sebuah kebun berbentuk persegi panjang memiliki keliling ${keliling} meter. Jika panjang kebun tersebut adalah ${p} meter, berapakah luas kebun tersebut?`,
    correctAnswer: `${luas} m²`,
    wrongAnswers: [
      `${luas - 10} m²`,
      `${luas + p} m²`,
      `${(keliling / 2) * 2} m²`,
    ],
    hint: `Keliling = 2 × (panjang + lebar). Cari lebar kebun terlebih dahulu dengan membagi keliling dengan 2, lalu dikurangi panjang.`,
    explanation: `1) Setengah keliling (p + l) = ${keliling} ÷ 2 = ${p + l} meter.\n2) Lebar (l) = ${p + l} - ${p} = ${l} meter.\n3) Luas = panjang × lebar = ${p} × ${l} = ${luas} m².`,
    points: 20,
    quickTrick: `Bagi keliling dengan 2, kurangi panjang untuk dapat lebar, lalu kalikan langsung!`,
    kisiKisi: 'Hubungan Keliling dan Luas Bangun Datar Segiempat',
    svgDiagramType: 'rectangle_grid',
    svgData: { width: p, height: l },
  });
}

// 6. Masalah Hari & Kalender (Modulo 7)
export function generateCalendarDayQuestion(seed = Date.now()): Question {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const startDayIdx = Math.floor(Math.random() * days.length);
  const daysPassedList = [50, 75, 100, 120, 200];
  const daysPassed = daysPassedList[Math.floor(Math.random() * daysPassedList.length)];
  const remainder = daysPassed % 7;
  const targetDayIdx = (startDayIdx + remainder) % 7;
  const id = `dyn-cal-${startDayIdx}-${daysPassed}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'logika',
    difficulty: 'sedang',
    question: `Jika hari ini adalah hari ${days[startDayIdx]}, hari apakah ${daysPassed} hari yang akan datang?`,
    correctAnswer: days[targetDayIdx],
    wrongAnswers: [
      days[(targetDayIdx + 1) % 7],
      days[(targetDayIdx + 6) % 7],
      days[(targetDayIdx + 2) % 7],
    ],
    hint: `Satu minggu ada 7 hari. Bagi jumlah hari (${daysPassed}) dengan 7, lalu lihat berapa sisa pembagiannya.`,
    explanation: `Pola nama hari berulang setiap 7 hari sekali.\n${daysPassed} ÷ 7 = ${Math.floor(daysPassed / 7)} sisa ${remainder}.\nArtinya, ${daysPassed} hari ke depan sama dengan ${remainder} hari setelah hari ${days[startDayIdx]}.\n${remainder === 0 ? 'Karena sisa 0, maka tetap hari ' + days[targetDayIdx] : days[startDayIdx] + ' + ' + remainder + ' hari = hari ' + days[targetDayIdx]}.`,
    points: 20,
    quickTrick: `Cukup bagi jumlah hari dengan 7 dan hitung maju sebanyak angka sisanya!`,
    kisiKisi: 'Aritmatika Jam / Modulo Kalender Olimpiade',
  });
}

// 7. Jabat Tangan / Kombinatorika Sederhana
export function generateHandshakeQuestion(seed = Date.now()): Question {
  const peopleList = [6, 7, 8, 9, 10];
  const n = peopleList[Math.floor(Math.random() * peopleList.length)];
  const handshakes = (n * (n - 1)) / 2;
  const id = `dyn-shake-${n}-${seed % 1000}`;

  return createQuestionWithOptions({
    id,
    topic: 'logika',
    difficulty: 'olimpiade',
    question: `Sebanyak ${n} orang siswa SD peserta olimpiade matematika saling berjabat tangan satu sama lain tepat satu kali saat perkenalan. Berapakah total jabat tangan yang terjadi di antara mereka?`,
    correctAnswer: `${handshakes} kali`,
    wrongAnswers: [
      `${n * (n - 1)} kali`,
      `${handshakes - 3} kali`,
      `${handshakes + n} kali`,
    ],
    hint: `Orang pertama bersalaman dengan (${n} - 1) orang. Orang kedua bersalaman dengan (${n} - 2) orang, dan seterusnya.`,
    explanation: `Rumus jabat tangan antara N orang = [N × (N - 1)] ÷ 2.\nUntuk ${n} orang:\nTotal = [${n} × ${n - 1}] ÷ 2 = ${n * (n - 1)} ÷ 2 = ${handshakes} kali jabat tangan.`,
    points: 35,
    quickTrick: `Kalikan jumlah anak (${n}) dengan (${n - 1}), lalu bagi 2!`,
    kisiKisi: 'Kombinatorika Sederhana Kombinasi Pasangan',
  });
}

// Array of generator functions
const GENERATOR_FUNCTIONS = [
  generateGaussSumQuestion,
  generateLegsPuzzleQuestion,
  generateKPKQuestion,
  generatePatternQuestion,
  generatePerimeterAreaQuestion,
  generateCalendarDayQuestion,
  generateHandshakeQuestion,
];

// Generate N unique dynamic questions
export function generateDynamicBatch(count = 7): Question[] {
  const list: Question[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const fn = GENERATOR_FUNCTIONS[i % GENERATOR_FUNCTIONS.length];
    list.push(fn(now + i * 17));
  }
  return list;
}
