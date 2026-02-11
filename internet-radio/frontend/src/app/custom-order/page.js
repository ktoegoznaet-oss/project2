'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import AuthGuard from '../../components/AuthGuard';
import toast from 'react-hot-toast';

export default function CustomOrderPage() {
  return (
    <AuthGuard>
      <CustomOrderContent />
    </AuthGuard>
  );
}

function CustomOrderContent() {
  const { user, refreshUser } = useAuth();
  const [lyrics, setLyrics] = useState('');
  const [styleDescription, setStyleDescription] = useState('');
  const [referenceSongId, setReferenceSongId] = useState('');
  const [airCount, setAirCount] = useState(1);
  const [songs, setSongs] = useState([]);
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.songs.list({ limit: 100, sort: 'play_count' }).then(data => setSongs(data.songs)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      api.orders.price({ air_count: airCount }).then(setPrice).catch(() => {});
    }
  }, [airCount, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lyrics.trim().length < 10) {
      toast.error('Текст песни должен содержать минимум 10 символов');
      return;
    }

    setLoading(true);
    try {
      await api.orders.customSong({
        lyrics: lyrics.trim(),
        style_description: styleDescription.trim(),
        reference_song_id: referenceSongId || undefined,
        air_count: airCount,
      });
      toast.success('Заказ на кастомную песню оформлен!');
      await refreshUser();
      setLyrics('');
      setStyleDescription('');
      setReferenceSongId('');
      setAirCount(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24">
      <h1 className="text-3xl font-bold text-white mb-3">Заказать свою песню</h1>
      <p className="text-dark-300 mb-8">Пришлите текст, опишите стиль — мы создадим песню и поставим её в эфир!</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Текст песни</h2>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Введите текст вашей песни..."
            rows={8}
            required
            minLength={10}
            className="input-field"
          />
          <p className="text-xs text-dark-300 mt-1">{lyrics.length} символов</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Описание стиля</h2>
          <textarea
            value={styleDescription}
            onChange={(e) => setStyleDescription(e.target.value)}
            placeholder="Опишите желаемый стиль: жанр, настроение, темп, похожие исполнители..."
            rows={3}
            className="input-field"
          />
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Похожая песня из каталога (необязательно)</h2>
          <select
            value={referenceSongId}
            onChange={(e) => setReferenceSongId(e.target.value)}
            className="input-field"
          >
            <option value="">Не выбрана</option>
            {songs.map(s => (
              <option key={s.id} value={s.id}>{s.artist} — {s.title}</option>
            ))}
          </select>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">Количество прокруток в эфире</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={airCount}
              onChange={(e) => setAirCount(parseInt(e.target.value))}
              className="flex-1 accent-brand-500"
            />
            <span className="text-xl font-bold text-brand-400 w-12 text-center">{airCount}</span>
          </div>
          <p className="text-xs text-dark-300 mt-2">Базовая стоимость: 2 000 ₽ + 200 ₽ за каждую дополнительную прокрутку</p>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <span className="text-dark-200">Стоимость</span>
            <div className="text-right">
              {price && price.price < price.original_price && (
                <p className="text-sm text-dark-300 line-through">{price.original_price} ₽</p>
              )}
              <p className="text-2xl font-bold text-brand-400">{price?.price || '...'} ₽</p>
            </div>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-dark-300">Ваш баланс</span>
            <span className={parseFloat(user?.balance || 0) >= (price?.price || Infinity) ? 'text-green-400' : 'text-red-400'}>
              {parseFloat(user?.balance || 0).toFixed(0)} ₽
            </span>
          </div>
          <button
            type="submit"
            disabled={loading || parseFloat(user?.balance || 0) < (price?.price || Infinity)}
            className="btn-primary w-full disabled:opacity-40"
          >
            {loading ? 'Оформляем заказ...' : 'Заказать песню'}
          </button>
          {parseFloat(user?.balance || 0) < (price?.price || 0) && (
            <a href="/profile" className="block text-center text-sm text-brand-400 hover:text-brand-300 mt-3">
              Пополнить баланс →
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
