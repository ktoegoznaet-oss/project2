'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import AuthGuard from '../../../components/AuthGuard';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiSearch, HiTrash, HiMusicNote, HiRefresh } from 'react-icons/hi';

export default function AdminSongsPage() {
  return (
    <AuthGuard requireAdmin>
      <SongsManager />
    </AuthGuard>
  );
}

function SongsManager() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadSongs = () => {
    setLoading(true);
    setSelected(new Set());
    api.admin.songs()
      .then(data => setSongs(data.songs || []))
      .catch(() => toast.error('Ошибка загрузки песен'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSongs(); }, []);

  const handleDelete = async (songId, title) => {
    if (!confirm(`Удалить "${title}"? Все связанные заказы тоже будут удалены.`)) return;
    setDeleting(songId);
    try {
      await api.admin.deleteSong(songId);
      toast.success('Песня удалена');
      setSongs(prev => prev.filter(s => s.id !== songId));
      setSelected(prev => { const n = new Set(prev); n.delete(songId); return n; });
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = songs.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || (s.genre || '').toLowerCase().includes(q);
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const n = new Set(prev);
        filtered.forEach(s => n.delete(s.id));
        return n;
      });
    } else {
      setSelected(prev => {
        const n = new Set(prev);
        filtered.forEach(s => n.add(s.id));
        return n;
      });
    }
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (!confirm(`Удалить ${ids.length} песен? Все связанные заказы тоже будут удалены.`)) return;
    setBulkDeleting(true);
    try {
      await api.admin.bulkDeleteSongs(ids);
      toast.success(`Удалено ${ids.length} песен`);
      setSongs(prev => prev.filter(s => !ids.includes(s.id)));
      setSelected(new Set());
    } catch (err) {
      toast.error(err.message || 'Ошибка массового удаления');
    } finally {
      setBulkDeleting(false);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-dark-300 hover:text-white transition">
            <HiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Песни ({songs.length})</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/upload" className="btn-primary text-sm py-2 px-4">Загрузить</Link>
          <button onClick={loadSongs} className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
            <HiRefresh /> Обновить
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
        <input
          type="text"
          placeholder="Поиск по названию, исполнителю или жанру..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10 w-full"
        />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-brand-600/10 border border-brand-600/30 rounded-xl px-4 py-3 mb-4">
          <span className="text-brand-300 text-sm font-medium">Выбрано: {selected.size}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-dark-300 hover:text-white text-sm transition"
            >
              Снять выделение
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-600/30 bg-red-600/10 hover:bg-red-600/20 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <HiTrash size={14} />
              {bulkDeleting ? 'Удаление...' : `Удалить ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-300 border-b border-dark-400">
              <th className="py-3 px-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-dark-400 bg-dark-600 text-brand-600 focus:ring-brand-500 focus:ring-offset-dark-700 cursor-pointer"
                />
              </th>
              <th className="text-left py-3 px-3 font-medium">Песня</th>
              <th className="text-left py-3 px-3 font-medium">Жанр</th>
              <th className="text-right py-3 px-3 font-medium">Цена заказа</th>
              <th className="text-right py-3 px-3 font-medium">Прослушивания</th>
              <th className="text-center py-3 px-3 font-medium">Статус</th>
              <th className="text-left py-3 px-3 font-medium">Добавлена</th>
              <th className="text-center py-3 px-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(song => (
              <tr
                key={song.id}
                className={`border-b border-dark-500/50 hover:bg-dark-500/30 transition ${selected.has(song.id) ? 'bg-brand-600/5' : ''}`}
              >
                <td className="py-3 px-3">
                  <input
                    type="checkbox"
                    checked={selected.has(song.id)}
                    onChange={() => toggleOne(song.id)}
                    className="rounded border-dark-400 bg-dark-600 text-brand-600 focus:ring-brand-500 focus:ring-offset-dark-700 cursor-pointer"
                  />
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-600/20 rounded flex items-center justify-center">
                      <HiMusicNote className="text-brand-400 text-sm" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{song.title}</p>
                      <p className="text-dark-300 text-xs">{song.artist}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-dark-200">{song.genre || '—'}</td>
                <td className="py-3 px-3 text-right text-white font-mono">{parseFloat(song.order_price).toLocaleString('ru-RU')} ₽</td>
                <td className="py-3 px-3 text-right text-dark-200">{song.play_count || 0}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${song.is_active ? 'text-green-400 bg-green-600/10' : 'text-red-400 bg-red-600/10'}`}>
                    {song.is_active ? 'Активна' : 'Скрыта'}
                  </span>
                </td>
                <td className="py-3 px-3 text-dark-300 text-xs">
                  {new Date(song.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => handleDelete(song.id, song.title)}
                    disabled={deleting === song.id}
                    className="text-red-400 hover:text-red-300 transition disabled:opacity-50"
                    title="Удалить"
                  >
                    <HiTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-dark-300">
            {search ? 'Песни не найдены' : 'Нет загруженных песен'}
          </div>
        )}
      </div>
    </div>
  );
}
