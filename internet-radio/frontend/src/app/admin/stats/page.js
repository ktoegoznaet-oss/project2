'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import AuthGuard from '../../../components/AuthGuard';
import toast from 'react-hot-toast';

export default function AdminStatsPage() {
  return (
    <AuthGuard requireAdmin>
      <StatsContent />
    </AuthGuard>
  );
}

function StatsContent() {
  const [topSongs, setTopSongs] = useState([]);
  const [primeTime, setPrimeTime] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [askingAI, setAskingAI] = useState(false);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.admin.stats({ type: 'top-songs', period }),
      api.admin.stats({ type: 'prime-time' }),
      api.admin.stats({ type: 'revenue', period }),
    ]).then(([top, prime, rev]) => {
      setTopSongs(top.data || []);
      setPrimeTime(prime.data || null);
      setRevenue(rev.data || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const askAI = async () => {
    if (!question.trim()) return;
    setAskingAI(true);
    try {
      const data = await api.admin.stats({ question: question.trim() });
      setAnswer(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAskingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Аналитика</h1>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field py-2 text-sm w-auto">
          <option value="1d">За день</option>
          <option value="7d">За неделю</option>
          <option value="30d">За месяц</option>
          <option value="90d">За 3 месяца</option>
        </select>
      </div>

      {/* AI Question */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold text-white mb-4">GPT-аналитик</h2>
        <p className="text-sm text-dark-300 mb-4">Задайте любой вопрос об аналитике на естественном языке</p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAI()}
            placeholder="Например: Какая песня самая популярная за последний месяц?"
            className="input-field flex-1 py-2 text-sm"
          />
          <button onClick={askAI} disabled={askingAI || !question.trim()} className="btn-primary py-2 px-4 text-sm disabled:opacity-40">
            {askingAI ? '...' : 'Спросить'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {['Топ-5 песен по заказам', 'Сколько заработали за неделю?', 'В какое время больше всего слушателей?', 'Какой жанр самый популярный?'].map(q => (
            <button key={q} onClick={() => { setQuestion(q); }} className="text-xs bg-dark-500 text-dark-200 hover:bg-dark-400 px-3 py-1.5 rounded-lg transition">
              {q}
            </button>
          ))}
        </div>
        {answer && (
          <div className="bg-dark-700 rounded-lg p-4">
            <p className="text-dark-50 text-sm whitespace-pre-wrap mb-3">{answer.answer}</p>
            {answer.sql && (
              <details className="text-xs text-dark-300">
                <summary className="cursor-pointer hover:text-dark-100 transition">SQL-запрос</summary>
                <pre className="mt-2 bg-dark-800 p-3 rounded overflow-x-auto">{answer.sql}</pre>
              </details>
            )}
            {answer.data && answer.data.length > 0 && (
              <details className="text-xs text-dark-300 mt-2">
                <summary className="cursor-pointer hover:text-dark-100 transition">Данные ({answer.data.length} строк)</summary>
                <pre className="mt-2 bg-dark-800 p-3 rounded overflow-x-auto">{JSON.stringify(answer.data, null, 2)}</pre>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Songs */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Топ-10 песен</h2>
          <div className="space-y-2">
            {topSongs.length === 0 ? (
              <p className="text-dark-300 text-sm">Нет данных</p>
            ) : topSongs.map((song, i) => (
              <div key={song.id} className="flex items-center gap-3 bg-dark-700 rounded-lg px-3 py-2">
                <span className="text-lg font-bold text-dark-300 w-6">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                  <p className="text-xs text-dark-300">{song.artist}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-400">{song.order_count} заказов</p>
                  <p className="text-xs text-dark-300">{parseFloat(song.revenue || 0).toFixed(0)} ₽</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Доходы</h2>
          {revenue ? (
            <>
              <div className="text-center mb-6">
                <p className="text-3xl font-extrabold text-brand-400">{revenue.grand_total?.toLocaleString()} ₽</p>
                <p className="text-sm text-dark-300">Итого за период</p>
              </div>
              <div className="space-y-3">
                <RevenueRow label="Заказы песен" count={revenue.song_orders?.count} total={revenue.song_orders?.total} />
                <RevenueRow label="Подписки" count={revenue.subscriptions?.count} total={revenue.subscriptions?.total} />
                <RevenueRow label="Кастомные песни" count={revenue.custom_songs?.count} total={revenue.custom_songs?.total} />
                <RevenueRow label="Пополнения" count={revenue.balance_topups?.count} total={revenue.balance_topups?.total} />
              </div>
            </>
          ) : (
            <p className="text-dark-300 text-sm">Нет данных</p>
          )}
        </div>

        {/* Prime Time */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4">Прайм-тайм (часы пиковой аудитории)</h2>
          {primeTime?.peak_hours?.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {primeTime.peak_hours.map(h => (
                  <div key={h.hour} className="bg-brand-600/20 text-brand-400 px-4 py-2 rounded-lg text-center">
                    <p className="text-xl font-bold">{h.hour}:00</p>
                    <p className="text-xs">{h.listeners} слушателей</p>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 h-32">
                {primeTime.all_hours?.map(h => {
                  const maxListeners = Math.max(...primeTime.all_hours.map(x => x.listeners));
                  const height = maxListeners > 0 ? (h.listeners / maxListeners) * 100 : 0;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-brand-600/30 rounded-t" style={{ height: `${height}%`, minHeight: '2px' }} title={`${h.hour}:00 — ${h.listeners} слушателей`} />
                      <span className="text-[9px] text-dark-400">{h.hour}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-dark-300 text-sm">Нет данных о слушателях</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RevenueRow({ label, count, total }) {
  return (
    <div className="flex items-center justify-between bg-dark-700 rounded-lg px-4 py-3">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-dark-300">{count || 0} операций</p>
      </div>
      <p className="text-sm font-bold text-white">{(total || 0).toLocaleString()} ₽</p>
    </div>
  );
}
