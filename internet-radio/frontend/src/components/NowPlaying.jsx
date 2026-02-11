'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function NowPlaying() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [np, st] = await Promise.all([
          api.stream.nowPlaying(),
          api.stream.stats(),
        ]);
        setNowPlaying(np);
        setStats(st);
      } catch (err) {
        // ignore
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse-slow" />
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">В эфире</span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-xl bg-dark-500 flex items-center justify-center flex-shrink-0">
          <div className="flex items-end gap-0.5 h-8">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-1.5 bg-brand-500 rounded-full equalizer-bar" style={{ height: '4px' }} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{nowPlaying?.title || 'Загрузка...'}</h2>
          <p className="text-dark-200">{nowPlaying?.artist || ''}</p>
          {nowPlaying?.genre && (
            <span className="inline-block mt-1 text-xs bg-brand-600/30 text-brand-300 px-2 py-0.5 rounded-full">
              {nowPlaying.genre}
            </span>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-700 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-brand-400">{stats.total_songs}</p>
            <p className="text-xs text-dark-300">Песен</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-400">{stats.today_orders}</p>
            <p className="text-xs text-dark-300">Заказов сегодня</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-yellow-400">{stats.total_users}</p>
            <p className="text-xs text-dark-300">Слушателей</p>
          </div>
          <div className="bg-dark-700 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-purple-400">{stats.total_orders}</p>
            <p className="text-xs text-dark-300">Всего заказов</p>
          </div>
        </div>
      )}
    </div>
  );
}
