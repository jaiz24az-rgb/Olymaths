import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  BookOpen, 
  Zap, 
  Target, 
  Search, 
  Filter, 
  RotateCcw, 
  Award, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Question, TopicCategory, DifficultyLevel, AnswerRecord } from '../types';
import { TOPICS } from '../data/questions';
import { getStoredAnswersWithDetails, clearAnswerHistory } from '../utils/storage';
import { MathDiagram } from './MathDiagram';

interface QuestionHistoryViewProps {
  onRetryQuestion: (question: Question) => void;
  onGoToPractice: () => void;
}

export const QuestionHistoryView: React.FC<QuestionHistoryViewProps> = ({
  onRetryQuestion,
  onGoToPractice,
}) => {
  const [historyItems, setHistoryItems] = useState(() => getStoredAnswersWithDetails());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'correct' | 'wrong'>('all');
  const [selectedTopic, setSelectedTopic] = useState<TopicCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Metrics
  const totalCount = historyItems.length;
  const correctCount = historyItems.filter((item) => item.isCorrect).length;
  const wrongCount = totalCount - correctCount;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const totalTimeSec = historyItems.reduce((acc, item) => acc + (item.timeSpentSec || 15), 0);
  const avgTimeSec = totalCount > 0 ? Math.round(totalTimeSec / totalCount) : 0;

  const toggleExpand = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleClearHistory = () => {
    clearAnswerHistory();
    setHistoryItems([]);
    setShowClearConfirm(false);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return historyItems.filter((item) => {
      const q = item.resolvedQuestion;
      const questionText = q?.question || '';
      const topic = item.topic || q?.topic;
      const difficulty = item.difficulty || q?.difficulty;

      // Status
      if (selectedStatus === 'correct' && !item.isCorrect) return false;
      if (selectedStatus === 'wrong' && item.isCorrect) return false;

      // Topic
      if (selectedTopic !== 'all' && topic !== selectedTopic) return false;

      // Difficulty
      if (selectedDifficulty !== 'all' && difficulty !== selectedDifficulty) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchText = questionText.toLowerCase().includes(query);
        const matchTopic = topic?.toLowerCase().includes(query);
        const matchExplanation = q?.explanation?.toLowerCase().includes(query);
        if (!matchText && !matchTopic && !matchExplanation) return false;
      }

      return true;
    });
  }, [historyItems, searchQuery, selectedStatus, selectedTopic, selectedDifficulty]);

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      if (isToday) {
        return `Hari ini, ${timeStr}`;
      }
      return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${timeStr}`;
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <BookOpen className="w-56 h-56" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-blue-100 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Pemeriksaan & Evaluasi Mandiri</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Riwayat Soal & Pembahasan
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Setiap soal yang pernah kamu kerjakan tersimpan rapi di sini. Kamu bisa mengecek kembali jawaban, 
            mempelajari pembahasan trik cepat, dan mengulang soal yang pernah salah!
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
            <span className="text-[11px] font-bold text-blue-200 block">Total Dikerjakan</span>
            <span className="text-2xl font-black text-white">{totalCount}</span>
            <span className="text-[10px] text-blue-200 block">Soal tersimpan</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
            <span className="text-[11px] font-bold text-emerald-200 block">Jawaban Benar</span>
            <span className="text-2xl font-black text-emerald-300">{correctCount}</span>
            <span className="text-[10px] text-emerald-200 block">{accuracy}% Akurasi</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
            <span className="text-[11px] font-bold text-rose-200 block">Perlu Evaluasi</span>
            <span className="text-2xl font-black text-rose-300">{wrongCount}</span>
            <span className="text-[10px] text-rose-200 block">Bisa dicoba ulang</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/15">
            <span className="text-[11px] font-bold text-amber-200 block">Rata-Rata Waktu</span>
            <span className="text-2xl font-black text-amber-300">{avgTimeSec}s</span>
            <span className="text-[10px] text-amber-200 block">Per soal</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari teks soal, materi, atau kata kunci..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Clear History Button */}
          {totalCount > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
              title="Bersihkan riwayat soal"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Riwayat</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Status filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 font-bold rounded-lg transition-all ${
                selectedStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setSelectedStatus('correct')}
              className={`px-2.5 py-1 font-bold rounded-lg transition-all flex items-center gap-1 ${
                selectedStatus === 'correct' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Benar ({correctCount})</span>
            </button>
            <button
              onClick={() => setSelectedStatus('wrong')}
              className={`px-2.5 py-1 font-bold rounded-lg transition-all flex items-center gap-1 ${
                selectedStatus === 'wrong' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-500" />
              <span>Salah ({wrongCount})</span>
            </button>
          </div>

          {/* Topic Select */}
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value as TopicCategory | 'all')}
            className="px-2.5 py-1.5 font-bold bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
          >
            <option value="all">Semua Topik</option>
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Difficulty Select */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel | 'all')}
            className="px-2.5 py-1.5 font-bold bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
          >
            <option value="all">Semua Kesulitan</option>
            <option value="mudah">Mudah</option>
            <option value="sedang">Sedang</option>
            <option value="olimpiade">Tingkat Olimpiade</option>
          </select>

          {(selectedStatus !== 'all' || selectedTopic !== 'all' || selectedDifficulty !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStatus('all');
                setSelectedTopic('all');
                setSelectedDifficulty('all');
                setSearchQuery('');
              }}
              className="text-xs text-blue-600 font-bold hover:underline ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Hapus Semua Riwayat Soal?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Tindakan ini akan menghapus data riwayat pengerjaan soal. Data level dan XP profil kamu tetap aman.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700"
              >
                Ya, Bersihkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Items List */}
      {filteredList.length > 0 ? (
        <div className="space-y-4">
          {filteredList.map((item, index) => {
            const cardId = item.id || `hist-${index}`;
            const isExpanded = !!expandedCardIds[cardId];
            const q = item.resolvedQuestion;
            const topicInfo = TOPICS.find((t) => t.id === item.topic);

            return (
              <div
                key={cardId}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                  item.isCorrect
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2.5 flex-wrap text-xs">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                        item.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Jawaban Benar</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Jawaban Salah</span>
                        </>
                      )}
                    </span>

                    {/* Topic Badge */}
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/80 font-bold text-slate-700 capitalize text-[11px]">
                      {topicInfo?.name || item.topic}
                    </span>

                    {/* Difficulty Badge */}
                    <span
                      className={`font-extrabold capitalize text-[11px] ${
                        item.difficulty === 'olimpiade'
                          ? 'text-rose-600'
                          : item.difficulty === 'sedang'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      Tingkat {item.difficulty}
                    </span>

                    {/* Date */}
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(item.timestamp)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-semibold">{item.timeSpentSec} detik</span>
                    </span>
                    {item.pointsEarned > 0 && (
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        +{item.pointsEarned} XP
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Body */}
                <div className="p-5 space-y-4">
                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                    {q?.question || `Soal #${item.questionId}`}
                  </p>

                  {/* Math Diagram if present in snapshot */}
                  {q && <MathDiagram question={q} />}

                  {/* Options List with User Selection indicator */}
                  {q?.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: string, optIdx: number) => {
                        const letter = String.fromCharCode(65 + optIdx);
                        const isUserChoice = item.selectedAnswer === optIdx;
                        const isCorrectOption = q.correctIndex === optIdx;

                        let optionStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                        if (isCorrectOption) {
                          optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300';
                        } else if (isUserChoice && !item.isCorrect) {
                          optionStyle = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${optionStyle}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isCorrectOption
                                    ? 'bg-emerald-600 text-white'
                                    : isUserChoice
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {letter}
                              </span>
                              <span>{opt}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 text-[10px] font-extrabold uppercase tracking-wider">
                              {isUserChoice && (
                                <span className={`px-1.5 py-0.5 rounded ${isCorrectOption ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                                  Pilihanmu
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Kunci</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Expandable Explanation & Fast Tricks */}
                  {isExpanded && q && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-3 animate-in fade-in duration-150">
                      <div>
                        <span className="font-extrabold text-blue-700 flex items-center gap-1.5 text-xs uppercase tracking-wider mb-1">
                          <BookOpen className="w-4 h-4" />
                          <span>Pembahasan Lengkap:</span>
                        </span>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-line text-xs sm:text-sm font-medium">
                          {q.explanation}
                        </p>
                      </div>

                      {q.quickTrick && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-950">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 uppercase text-[11px] tracking-wider">
                            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                            <span>Trik Cepat 10 Detik:</span>
                          </div>
                          <p className="font-semibold text-slate-900 leading-relaxed">
                            {q.quickTrick}
                          </p>
                        </div>
                      )}

                      {q.kisiKisi && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          <strong>Kisi-Kisi Materi:</strong> {q.kisiKisi}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                    <button
                      onClick={() => toggleExpand(cardId)}
                      className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <span>{isExpanded ? 'Tutup Pembahasan' : 'Lihat Pembahasan & Trik'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {q && (
                      <button
                        onClick={() => onRetryQuestion(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold transition-all border border-slate-200 shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        <span>Coba Ulang Soal Ini</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">
              {totalCount === 0 ? 'Belum Ada Riwayat Soal' : 'Tidak Ada Soal yang Cocok'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {totalCount === 0
                ? 'Semua soal latihan yang kamu kerjakan akan tercatat otomatis di sini beserta pembahasan dan kunci jawabannya.'
                : 'Coba ubah kata kunci pencarian atau reset filter untuk melihat soal lainnya.'}
            </p>
          </div>

          {totalCount === 0 ? (
            <button
              onClick={onGoToPractice}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <span>Mulai Latihan Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedStatus('all');
                setSelectedTopic('all');
                setSelectedDifficulty('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <span>Tampilkan Semua Soal</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
