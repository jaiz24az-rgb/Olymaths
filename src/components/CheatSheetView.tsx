import React, { useState } from 'react';
import { 
  Zap, 
  Lightbulb, 
  BookOpen, 
  Compass, 
  Clock, 
  Calculator, 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  Search,
  Sparkles,
  HelpCircle,
  Shapes,
  Brain
} from 'lucide-react';

interface CheatSheetItem {
  id: string;
  title: string;
  category: 'bilangan' | 'pecahan' | 'geometri' | 'logika' | 'soal_cerita';
  targetExam: string;
  problemExample: string;
  shortcutFormula: string;
  quickSteps: string[];
  durationEstimate: string;
  goldenRule: string;
}

const CHEAT_SHEET_DATA: CheatSheetItem[] = [
  {
    id: 'trik-skor',
    title: 'Trik Skor Ujian Benar-Salah Tanpa Menghitung Soal Kosong',
    category: 'soal_cerita',
    targetExam: 'OMNAS Level 2 / KMNR',
    problemExample: '50 soal. Benar = +4, Salah = -2, Kosong = 0. Menjawab 30 benar dan 8 salah. Berapa skor total?',
    shortcutFormula: 'Skor = (Benar × 4) - (Salah × 2)',
    quickSteps: [
      'Langsung kalikan jawaban benar dengan poinnya: 30 × 4 = 120.',
      'Kalikan jawaban salah dengan penaltinya: 8 × 2 = 16.',
      'Kurangkan langsung: 120 - 16 = 104 poin! Jangan habiskan waktu menghitung jumlah soal yang kosong karena skornya 0.'
    ],
    durationEstimate: '5 Detik',
    goldenRule: 'Abaikan soal kosong jika bernilai 0. Jika kosong bernilai -1, gunakan: Skor = (Benar × 4) - (Salah × 2) - (Kosong × 1).'
  },
  {
    id: 'trik-rasio-1bagian',
    title: 'Trik Nilai 1 Bagian (Perbandingan Usia & Jumlah Siswa)',
    category: 'bilangan',
    targetExam: 'OMNAS Level 2 Final',
    problemExample: 'Perbandingan usia Nita dan Lila adalah 4 : 3. Jika Nita berumur 20 tahun, berapa usia Lila?',
    shortcutFormula: 'Nilai 1 Bagian = (Nilai Nyata) ÷ (Rasio Terkait)',
    quickSteps: [
      'Cari nilai 1 bagian: Usia Nita 20 tahun dibagi rasionya 4 = 5 tahun per bagian.',
      'Kalikan ke rasio yang ditanyakan: Lila punya 3 bagian = 3 × 5 = 15 tahun!',
      'Tanpa aljabar x dan y yang berbelit-belit.'
    ],
    durationEstimate: '3 Detik',
    goldenRule: 'Selalu temukan "Nilai 1 Bagian" terlebih dahulu sebagai kunci utama semua soal perbandingan.'
  },
  {
    id: 'trik-rasio-bertingkat',
    title: 'Trik Huruf N / Perkalian Silang (Perbandingan 3 Orang)',
    category: 'soal_cerita',
    targetExam: 'OMNAS Level 2 (OM2 Penyisihan)',
    problemExample: 'Uang Rp295.000 dibagi Adi, Budi, Faris. Adi : Budi = 3 : 4, Budi : Faris = 5 : 6. Berapa bagian Faris?',
    shortcutFormula: 'A : B : C = (A₁ × B₂) : (B₁ × B₂) : (B₁ × C₂)',
    quickSteps: [
      'Gunakan pola huruf N (kalikan silang): Adi = 3 × 5 = 15, Budi = 4 × 5 = 20, Faris = 4 × 6 = 24.',
      'Jumlahkan semua rasio: 15 + 20 + 24 = 59 bagian.',
      'Nilai 1 bagian = 295.000 ÷ 59 = 5.000. Bagian Faris = 24 × 5.000 = Rp120.000!'
    ],
    durationEstimate: '10 Detik',
    goldenRule: 'Karakter yang berada di tengah (Budi) harus disamakan nilainya dengan mengalikan silang kedua rasio.'
  },
  {
    id: 'trik-jumlah-selisih',
    title: 'Rumus Emas Jumlah dan Selisih Dua Bilangan',
    category: 'bilangan',
    targetExam: 'OMNAS Level 2 / EEC',
    problemExample: 'Jumlah dua bilangan adalah 33 dan selisihnya adalah 15. Tentukan kedua bilangan tersebut!',
    shortcutFormula: 'Besar = (Jumlah + Selisih) ÷ 2  |  Kecil = (Jumlah - Selisih) ÷ 2',
    quickSteps: [
      'Bilangan Besar: (33 + 15) ÷ 2 = 48 ÷ 2 = 24.',
      'Bilangan Kecil: (33 - 15) ÷ 2 = 18 ÷ 2 = 9 (atau langsung 33 - 24 = 9).',
      'Kedua bilangan adalah 24 dan 9. Sangat cepat dan akurat!'
    ],
    durationEstimate: '4 Detik',
    goldenRule: 'Ingat mantra: "Jumlahkan lalu bagi 2 untuk angka besar, kurangkan lalu bagi 2 untuk angka kecil".'
  },
  {
    id: 'trik-jkw-menit',
    title: 'Trik Pecahan Menit (Kecepatan, Jarak, Waktu)',
    category: 'soal_cerita',
    targetExam: 'OMNAS Level 2',
    problemExample: 'Kecepatan 45 km/jam, berangkat 08.45 tiba 12.05 (lama 3 jam 20 menit). Berapa jaraknya?',
    shortcutFormula: 'Waktu Menit -> Pecahan Jam: 15m = 1/4 jam, 20m = 1/3 jam, 30m = 1/2 jam, 40m = 2/3 jam',
    quickSteps: [
      'Selisih waktu 12.05 - 08.45 = 3 jam 20 menit.',
      '20 menit = 1/3 jam. Kecepatan 45 km/jam dikali 3 jam = 135 km.',
      'Tambahkan 1/3 jamnya: 45 ÷ 3 = 15 km. Jarak total = 135 + 15 = 150 km!'
    ],
    durationEstimate: '8 Detik',
    goldenRule: 'Jangan kalikan desimal koma yang rumit. Selalu pecah waktu jam bulat dan pecahan menit secara terpisah.'
  },
  {
    id: 'trik-fpb-selisih',
    title: 'Trik Selisih Terkecil FPB (Tanpa Pohon Faktor)',
    category: 'bilangan',
    targetExam: 'OMNAS Level 2 / OSN-SD',
    problemExample: 'Berapakah FPB dari 24, 48, dan 60?',
    shortcutFormula: 'FPB ≤ Selisih Dua Bilangan Terdekat',
    quickSteps: [
      'Cari selisih antara dua bilangan terdekat: 60 - 48 = 12.',
      'Nilai FPB pasti membagi 12 (bisa 12, 6, 4, 3, 2, 1). FPB tidak mungkin lebih besar dari 12!',
      'Uji apakah 12 membagi 24? Ya. Membagi 48? Ya. Membagi 60? Ya. Maka jawabannya langsung 12!'
    ],
    durationEstimate: '5 Detik',
    goldenRule: 'FPB tidak pernah lebih besar dari selisih pasangan angka terdekat. Ini trik tercepat mengeliminasi pilihan ganda.'
  },
  {
    id: 'trik-diagram-venn',
    title: 'Trik Himpunan & Diagram Venn Penduduk / Siswa',
    category: 'logika',
    targetExam: 'OMNAS Level 2 Final',
    problemExample: '182 jiwa usia < 40 tahun, 128 jiwa usia > 20 tahun, dan 85 jiwa usia 20-40 tahun. Berapa total penduduk?',
    shortcutFormula: 'Total = Kelompok A + Kelompok B - Irisan Keduanya',
    quickSteps: [
      'Identifikasi yang masuk kelompok A: 182.',
      'Identifikasi yang masuk kelompok B: 128.',
      'Kurangkan bagian tumpang tindih (irisan): 182 + 128 - 85 = 310 - 85 = 225 jiwa!'
    ],
    durationEstimate: '6 Detik',
    goldenRule: 'Total gabungan himpunan selalu jumlahkan kedua kelompok lalu buang satu irisan agar tidak terhitung ganda.'
  },
  {
    id: 'trik-keterbagian-9',
    title: 'Trik Coret Sembilan (Keterbagian Angka Rahasia)',
    category: 'logika',
    targetExam: 'OMNAS Level 2 Final',
    problemExample: 'Jika bilangan 3NN345 habis dibagi 9, berapakah nilai N?',
    shortcutFormula: 'Coret pasangan digit yang berjumlah 9',
    quickSteps: [
      'Coret digit 4 dan 5 karena 4 + 5 = 9.',
      'Jumlahkan sisa digit yang ada: 3 + 3 = 6.',
      'Sisa: 6 + 2N harus menghasilkan 18 (kelipatan 9 terdekat). Maka 2N = 12 -> N = 6!'
    ],
    durationEstimate: '5 Detik',
    goldenRule: 'Metode Coret 9 menghemat waktu 80% dibanding menjumlahkan semua digit secara manual.'
  },
  {
    id: 'trik-akar-pangkat',
    title: 'Trik Angka Satuan & Eliminasi Pangkat Dua',
    category: 'bilangan',
    targetExam: 'OMNAS Level 2',
    problemExample: 'Berapakah hasil dari √256 + 23²?',
    shortcutFormula: 'Analisis Digit Satuan: (Satuan A) + (Satuan B)',
    quickSteps: [
      '√256 berakhir di angka 6 (karena 16² = 256).',
      '23² berakhir di angka 9 (karena 3² = 9).',
      'Satuan hasil penjumlahan = 6 + 9 = 15 (berakhiran 5).',
      'Karena 20² = 400, maka 23² > 500. Pilih opsi berakhiran 5 yang di atas 500 -> langsung pilih 545!'
    ],
    durationEstimate: '5 Detik',
    goldenRule: 'Periksa selalu angka satuan di pilihan ganda. Seringkali hanya ada 1 atau 2 opsi yang memiliki satuan yang tepat.'
  },
  {
    id: 'trik-kotak-pecahan',
    title: 'Metode Kotak KPK untuk Sisa Pecahan',
    category: 'pecahan',
    targetExam: 'OMNAS Level 2 Final',
    problemExample: 'Senar 1/8 warna biru, 2/3 warna merah, sisa 5 cm. Berapa panjang senar mula-mula?',
    shortcutFormula: 'KPK Penyebut = Total Jumlah Kotak',
    quickSteps: [
      'KPK dari 8 dan 3 adalah 24 kotak.',
      'Biru = 1/8 dari 24 = 3 kotak. Merah = 2/3 dari 24 = 16 kotak.',
      'Sisa kotak = 24 - (3 + 16) = 5 kotak. Diketahui sisa = 5 cm, berarti 1 kotak = 1 cm!',
      'Panjang total = 24 kotak × 1 cm = 24 cm.'
    ],
    durationEstimate: '7 Detik',
    goldenRule: 'Mengubah pecahan menjadi kotak bilangan bulat membuat soal cerita yang membingungkan jadi sangat visual dan mudah.'
  },
  {
    id: 'trik-mata-angin',
    title: 'Trik Sudut Kompas 8 Arah Mata Angin',
    category: 'geometri',
    targetExam: 'OMNAS Level 2',
    problemExample: 'Berapakah besar sudut antara Tenggara dan Barat Daya?',
    shortcutFormula: '1 Langkah Arah = 45°  |  2 Langkah = 90° (Siku-siku)  |  4 Langkah = 180° (Lurus)',
    quickSteps: [
      'Urutan kompas searah jarum jam: U - TL - T - TG - S - BD - B - BL.',
      'Dari Tenggara (TG) ke Barat Daya (BD) berjarak 2 langkah (lewat Selatan).',
      '2 langkah × 45° = 90° (sudut siku-siku)!'
    ],
    durationEstimate: '3 Detik',
    goldenRule: 'Setiap 1 lompatan arah mata angin bernilai tepat 45°.'
  },
  {
    id: 'trik-suhu-negatif',
    title: 'Trik Jarak Selisih Suhu Negatif ke Positif',
    category: 'bilangan',
    targetExam: 'OMNAS Level 2',
    problemExample: 'Suhu dalam -13°C dinaikkan 4°C (jadi -9°C). Suhu luar 34°C. Berapa selisihnya?',
    shortcutFormula: 'Selisih = Angka Positif + Angka Negatif Mutlak',
    quickSteps: [
      'Suhu dalam baru = -13 + 4 = -9°C.',
      'Jarak dari -9 ke 0 adalah 9 derajat.',
      'Jarak dari 0 ke 34 adalah 34 derajat.',
      'Selisih total = 9 + 34 = 43°C (selalu bernilai positif)!'
    ],
    durationEstimate: '4 Detik',
    goldenRule: 'Selisih antara di bawah nol dan di atas nol selalu merupakan penjumlahan kedua angka jaraknya.'
  }
];

interface CheatSheetViewProps {
  onPracticeTopic?: (topicId: string) => void;
}

export const CheatSheetView: React.FC<CheatSheetViewProps> = ({ onPracticeTopic }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredItems = CHEAT_SHEET_DATA.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchQuery = 
      item.title.toLowerCase().includes(query) ||
      item.problemExample.toLowerCase().includes(query) ||
      item.shortcutFormula.toLowerCase().includes(query) ||
      item.goldenRule.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-100 uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Bank Kisi-Kisi & Trik Cepat Resmi OMNAS Level 2</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Rahasia Juara: Trik Menjawab 5–10 Detik
          </h2>
          <p className="text-xs sm:text-sm text-amber-50 mt-2 leading-relaxed">
            Himpunan rumus kilat, pola pintas logika, dan kisi-kisi resmi soal Olimpiade Nasional (OMNAS) & EEC Level 2 (SD Kelas 3–4). Dirancang khusus agar siswa tidak membuang waktu pada hitungan panjang.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 font-bold rounded-xl transition whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Trik ({CHEAT_SHEET_DATA.length})
          </button>
          {[
            { id: 'bilangan', label: 'Bilangan & FPB/KPK' },
            { id: 'soal_cerita', label: 'Soal Cerita & JKW' },
            { id: 'pecahan', label: 'Pecahan & Rasio' },
            { id: 'geometri', label: 'Geometri & Sudut' },
            { id: 'logika', label: 'Logika & Himpunan' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 font-bold rounded-xl transition whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari trik cepat, rumus, tipe soal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 text-slate-800"
          />
        </div>
      </div>

      {/* Cheat Sheet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header Tag */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {item.targetExam}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  <Zap className="w-3.5 h-3.5 fill-rose-500" />
                  <span>Kecepatan: {item.durationEstimate}</span>
                </span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                {item.title}
              </h3>

              {/* Example problem */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-500 block text-[10px] uppercase mb-1">
                  Contoh Soal Asli:
                </span>
                <p className="text-slate-800 font-medium italic">"{item.problemExample}"</p>
              </div>

              {/* Shortcut Formula Box */}
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 text-xs">
                <span className="font-extrabold text-amber-900 block text-[11px] uppercase mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rumus Tercepat:</span>
                </span>
                <code className="text-amber-950 font-mono font-bold text-xs block py-1">
                  {item.shortcutFormula}
                </code>
              </div>

              {/* Quick Steps */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-700 block">Langkah Kilat:</span>
                {item.quickSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {/* Golden Rule */}
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p><strong>Kunci Ingatan:</strong> {item.goldenRule}</p>
              </div>
            </div>

            {/* Action */}
            {onPracticeTopic && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => onPracticeTopic(item.category)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <span>Latihan Soal Tipe Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>Kisi-kisi disusun berdasarkan bank soal resmi OMNAS Level 2 dan EEC Matematika SD Kelas 3–4.</span>
        </div>
      </div>
    </div>
  );
};
