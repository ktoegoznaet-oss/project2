'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { HiX, HiMusicNote } from 'react-icons/hi';

export default function OrderForm({ song, onClose }) {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState('');
  const [priceInfo, setPriceInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && song) {
      api.orders.price({ song_id: song.id }).then(setPriceInfo).catch(() => {});
    }
  }, [user, song]);

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Войдите, чтобы заказать песню');
      return;
    }

    setLoading(true);
    try {
      const result = await api.orders.song({ song_id: song.id, message });
      toast.success(`Песня "${song.title}" заказана!`);
      await refreshUser();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-600 border border-dark-400 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-dark-200 hover:text-white transition">
          <HiX size={24} />
        </button>

        <h2 className="text-xl font-bold text-white mb-4">Заказать песню</h2>

        <div className="flex items-center gap-4 bg-dark-700 rounded-lg p-4 mb-4">
          <div className="w-12 h-12 bg-dark-500 rounded-lg flex items-center justify-center">
            <HiMusicNote className="text-brand-400 text-xl" />
          </div>
          <div>
            <p className="font-semibold text-white">{song.title}</p>
            <p className="text-sm text-dark-200">{song.artist}</p>
          </div>
        </div>

        {!user ? (
          <div className="text-center py-4">
            <p className="text-dark-200 mb-3">Для заказа песни необходимо авторизоваться</p>
            <a href="/login" className="btn-primary inline-block">Войти</a>
          </div>
        ) : (
          <form onSubmit={handleOrder}>
            <div className="mb-4">
              <label className="block text-sm text-dark-200 mb-1">Сообщение в эфир (необязательно)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Привет, передаю привет всем слушателям!"
                maxLength={200}
                rows={3}
                className="input-field text-sm"
              />
              <p className="text-xs text-dark-300 mt-1">{message.length}/200</p>
            </div>

            <div className="bg-dark-700 rounded-lg p-4 mb-4">
              {priceInfo?.free ? (
                <div className="text-center">
                  <p className="text-green-400 font-bold text-lg">Бесплатно!</p>
                  <p className="text-xs text-dark-300">У вас есть бесплатные заказы по подписке</p>
                </div>
              ) : priceInfo ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-dark-300">Стоимость</p>
                    {priceInfo.price < priceInfo.original_price && (
                      <p className="text-xs text-dark-300 line-through">{priceInfo.original_price} ₽</p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-brand-400">{priceInfo.price} ₽</p>
                </div>
              ) : (
                <p className="text-sm text-dark-300 text-center">Загрузка цены...</p>
              )}

              <div className="mt-2 flex justify-between text-xs text-dark-300">
                <span>Ваш баланс:</span>
                <span className={parseFloat(user.balance) >= (priceInfo?.price || 0) ? 'text-green-400' : 'text-red-400'}>
                  {parseFloat(user.balance).toFixed(0)} ₽
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!priceInfo?.free && parseFloat(user.balance) < (priceInfo?.price || Infinity))}
              className="btn-primary w-full disabled:opacity-40"
            >
              {loading ? 'Оформляем...' : 'Заказать'}
            </button>

            {!priceInfo?.free && parseFloat(user.balance) < (priceInfo?.price || 0) && (
              <a href="/profile" className="block text-center text-sm text-brand-400 hover:text-brand-300 mt-3">
                Пополнить баланс →
              </a>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
