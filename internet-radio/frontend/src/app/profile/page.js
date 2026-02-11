'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import AuthGuard from '../../components/AuthGuard';
import BalanceWidget from '../../components/BalanceWidget';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState({ song_orders: [], custom_orders: [] });
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    api.orders.my().then(setOrders).catch(() => {});
    api.subscriptions.my().then(data => setSubscription(data.subscription)).catch(() => {});
    api.payments.history().then(data => setPayments(data.payments)).catch(() => {});
  }, []);

  const statusLabels = {
    pending: 'Ожидает', paid: 'Оплачен', queued: 'В очереди', playing: 'Играет', played: 'Проиграна',
    cancelled: 'Отменён', new: 'Новый', in_production: 'В работе', review: 'На проверке',
    approved: 'Одобрена', aired: 'В эфире', succeeded: 'Успешно', waiting_for_capture: 'Обрабатывается',
  };

  const statusColors = {
    pending: 'text-yellow-400', paid: 'text-blue-400', queued: 'text-brand-400', playing: 'text-green-400',
    played: 'text-dark-300', cancelled: 'text-red-400', new: 'text-yellow-400', in_production: 'text-blue-400',
    review: 'text-purple-400', approved: 'text-green-400', aired: 'text-green-400', succeeded: 'text-green-400',
    waiting_for_capture: 'text-yellow-400',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="card text-center">
            <div className="w-20 h-20 bg-brand-600 rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-white">{user?.username}</h2>
            <p className="text-sm text-dark-300">{user?.email}</p>
            {subscription && (
              <div className="mt-3 inline-block bg-brand-600/20 text-brand-400 px-3 py-1 rounded-full text-sm font-medium">
                {subscription.name}
                <span className="text-dark-300 text-xs ml-1">
                  до {new Date(subscription.expires).toLocaleDateString('ru-RU')}
                </span>
              </div>
            )}
            {subscription && (
              <p className="text-xs text-dark-300 mt-2">
                Бесплатных заказов: {subscription.free_orders_remaining}
              </p>
            )}
          </div>
          <BalanceWidget />
        </div>

        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-6">
            {['orders', 'custom', 'payments'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-brand-600 text-white' : 'bg-dark-600 text-dark-200 hover:bg-dark-500'}`}
              >
                {t === 'orders' ? 'Заказы песен' : t === 'custom' ? 'Кастомные песни' : 'Платежи'}
              </button>
            ))}
          </div>

          {tab === 'orders' && (
            <div className="space-y-2">
              {orders.song_orders.length === 0 ? (
                <p className="text-dark-300 text-center py-8">Заказов пока нет</p>
              ) : orders.song_orders.map(o => (
                <div key={o.id} className="card flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{o.title} — {o.artist}</p>
                    {o.message && <p className="text-xs text-dark-300 truncate">"{o.message}"</p>}
                    <p className="text-xs text-dark-300">{new Date(o.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-medium ${statusColors[o.status] || 'text-dark-200'}`}>
                      {statusLabels[o.status] || o.status}
                    </p>
                    <p className="text-xs text-dark-300">{parseFloat(o.price_paid) > 0 ? `${o.price_paid} ₽` : 'Бесплатно'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'custom' && (
            <div className="space-y-2">
              {orders.custom_orders.length === 0 ? (
                <p className="text-dark-300 text-center py-8">Кастомных заказов нет</p>
              ) : orders.custom_orders.map(o => (
                <div key={o.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <p className={`text-sm font-medium ${statusColors[o.status] || 'text-dark-200'}`}>{statusLabels[o.status] || o.status}</p>
                    <p className="text-sm text-brand-400 font-bold">{o.price} ₽</p>
                  </div>
                  <p className="text-sm text-dark-100 line-clamp-2 mb-1">{o.lyrics}</p>
                  {o.style_description && <p className="text-xs text-dark-300 mb-1">Стиль: {o.style_description}</p>}
                  <div className="flex justify-between text-xs text-dark-300">
                    <span>Прокруток: {o.aired_count}/{o.air_count}</span>
                    <span>{new Date(o.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-dark-300 text-center py-8">Платежей нет</p>
              ) : payments.map(p => (
                <div key={p.id} className="card flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">
                      {p.payment_type === 'balance_topup' ? 'Пополнение' : p.payment_type === 'subscription' ? 'Подписка' : p.payment_type === 'custom_song' ? 'Кастомная песня' : 'Заказ'}
                    </p>
                    <p className="text-xs text-dark-300">{new Date(p.created_at).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{p.amount} ₽</p>
                    <p className={`text-xs ${statusColors[p.status] || 'text-dark-300'}`}>{statusLabels[p.status] || p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
