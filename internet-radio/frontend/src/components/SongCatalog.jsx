'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import OrderForm from './OrderForm';
import { HiSearch, HiMusicNote } from 'react-icons/hi';

export default function SongCatalog({ compact = false }) {
  const [songs, setSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('all');
  const [sort, setSort] = useState('play_count');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [orderSong, setOrderSong] = useState(null);

  useEffect(() => {
    api.songs.genres().then(data => setGenres(data.genres)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: compact ? 6 : 20, sort };
    if (genre !== 'all') params.genre = genre;
    if (search) params.search = search;

    api.songs.list(params)
      .then(data => {
        setSongs(data.songs);
        setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, genre, search, sort, compact]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white">
            {compact ? 'Популярные песни' : 'Каталог песен'}
          </h3>

          {!compact && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="input-field pl-10 py-2 text-sm w-full sm:w-48"
                />
              </div>
              <select value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }} className="input-field py-2 text-sm">
                <option value="all">Все жанры</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field py-2 text-sm">
                <option value="play_count">По популярности</option>
                <option value="created_at">По дате</option>
                <option value="title">По названию</option>
                <option value="price">По цене</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <p className="text-dark-300 text-center py-8">Песни не найдены</p>
        ) : (
          <div className="space-y-2">
            {songs.map((song, i) => (
              <div key={song.id} className="flex items-center gap-4 bg-dark-700 hover:bg-dark-500 rounded-lg px-4 py-3 transition group">
                <span className="text-dark-300 text-sm w-6 text-right">{(page - 1) * 20 + i + 1}</span>
                <div className="w-10 h-10 bg-dark-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HiMusicNote className="text-dark-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                  <p className="text-xs text-dark-300 truncate">{song.artist}</p>
                </div>
                <span className="hidden sm:block text-xs text-dark-300 bg-dark-600 px-2 py-0.5 rounded-full">{song.genre}</span>
                <span className="text-xs text-dark-300">{formatDuration(song.duration)}</span>
                <span className="text-xs text-dark-200">{song.play_count} ▶</span>
                <button
                  onClick={() => setOrderSong(song)}
                  className="btn-primary text-xs py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Заказать
                </button>
              </div>
            ))}
          </div>
        )}

        {!compact && pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40">←</button>
            <span className="text-sm text-dark-200 py-1.5 px-3">{page} / {pagination.pages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      {orderSong && <OrderForm song={orderSong} onClose={() => setOrderSong(null)} />}
    </>
  );
}
