'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { HiCheck, HiStar } from 'react-icons/hi';

export default function SubscriptionCard({ subscription, isCurrentPlan = false }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const features = subscription.features || {};
  const price = period === 'yearly' ? parseFloat(subscription.price_yearly) : parseFloat(subscription.price_monthly);
  const monthlyEquivalent = period === 'yearly' ? Math.round(price / 12) : price;

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Войдите для покупки подписки');
      return;
    }

    setLoading(true);
    try {
      const data = await api.subscriptions.purchase({
        subscription_slug: subscription.slug,
        period,
      });

      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        toast.success('Подписка активирована!');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPopular = subscription.slug === 'premium';
  const colorMap = {
    basic: { accent: 'brand', badge: 'bg-brand-600' },
    premium: { accent: 'yellow', badge: 'bg-yellow-500' },
    vip: { accent: 'purple', badge: 'bg-purple-600' },
  };
  const color = colorMap[subscription.slug] || colorMap.basic;

  return (
    <div className={`card relative flex flex-col ${isPopular ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500/50' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-dark-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <HiStar /> Популярный
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 bg-green-500 text-dark-900 text-xs font-bold px-3 py-1 rounded-full">
          Текущий
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-1">{subscription.name}</h3>

      <div className="flex items-end gap-1 mb-1">
        <span className="text-3xl font-extrabold text-white">{monthlyEquivalent} ₽</span>
        <span className="text-dark-300 text-sm mb-1">/мес</span>
      </div>

      {period === 'yearly' && (
        <p className="text-xs text-green-400 mb-4">Экономия {Math.round(parseFloat(subscription.price_monthly) * 12 - price)} ₽/год</p>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPeriod('monthly')}
          className={`flex-1 text-xs py-1.5 rounded-lg transition font-medium ${period === 'monthly' ? 'bg-brand-600 text-white' : 'bg-dark-500 text-dark-200'}`}
        >
          Месяц
        </button>
        <button
          onClick={() => setPeriod('yearly')}
          className={`flex-1 text-xs py-1.5 rounded-lg transition font-medium ${period === 'yearly' ? 'bg-brand-600 text-white' : 'bg-dark-500 text-dark-200'}`}
        >
          Год
        </button>
      </div>

      <ul className="space-y-3 mb-6 flex-1">
        <FeatureItem text={`Скидка ${features.discount_percent}% на заказы`} />
        <FeatureItem text={`${features.free_orders_monthly} бесплатных заказов/мес`} />
        {features.priority_queue && <FeatureItem text="Приоритетная очередь" />}
        {features.no_ads && <FeatureItem text="Без рекламы" />}
        {features.custom_song_discount > 0 && <FeatureItem text={`Скидка ${features.custom_song_discount}% на кастомные песни`} />}
      </ul>

      <button
        onClick={handlePurchase}
        disabled={loading || isCurrentPlan}
        className={`w-full py-3 rounded-lg font-semibold transition text-sm ${isCurrentPlan ? 'bg-green-600/20 text-green-400 cursor-default' : 'btn-primary'} disabled:opacity-60`}
      >
        {loading ? 'Обработка...' : isCurrentPlan ? 'Активна' : `Подписаться — ${price} ₽`}
      </button>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <li className="flex items-center gap-2 text-sm text-dark-100">
      <HiCheck className="text-green-400 flex-shrink-0" />
      {text}
    </li>
  );
}
