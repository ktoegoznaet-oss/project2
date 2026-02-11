'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { HiCreditCard } from 'react-icons/hi';

export default function BalanceWidget() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);

  const presets = [100, 300, 500, 1000, 2000, 5000];

  const handleTopUp = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 10) {
      toast.error('Минимальная сумма пополнения — 10 ₽');
      return;
    }

    setLoading(true);
    try {
      const data = await api.payments.create({
        amount: parsedAmount,
        payment_type: 'balance_topup',
      });

      if (data.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        toast.success('Баланс пополнен!');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <HiCreditCard className="text-brand-400" /> Баланс
      </h3>

      <div className="text-center mb-6">
        <p className="text-4xl font-extrabold text-brand-400">{parseFloat(user.balance).toFixed(0)} ₽</p>
        <p className="text-sm text-dark-300 mt-1">Текущий баланс</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            className={`py-2 rounded-lg text-sm font-medium transition ${amount === String(p) ? 'bg-brand-600 text-white' : 'bg-dark-500 text-dark-200 hover:bg-dark-400'}`}
          >
            {p} ₽
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="number"
          min="10"
          max="100000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field flex-1 py-2 text-sm"
          placeholder="Сумма"
        />
        <button onClick={handleTopUp} disabled={loading} className="btn-primary py-2 px-4 text-sm disabled:opacity-40">
          {loading ? '...' : 'Пополнить'}
        </button>
      </div>
    </div>
  );
}
