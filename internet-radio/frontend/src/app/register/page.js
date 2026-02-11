'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      toast.success('Регистрация успешна!');
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Регистрация</h1>
        <p className="text-dark-300 text-center mb-8">Создайте аккаунт, чтобы заказывать песни</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-200 mb-1">Имя пользователя</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={50} className="input-field" placeholder="Ваш ник" />
          </div>
          <div>
            <label className="block text-sm text-dark-200 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-field" placeholder="your@email.com" />
          </div>
          <div>
            <label className="block text-sm text-dark-200 mb-1">Пароль</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input-field" placeholder="Минимум 6 символов" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-40">
            {loading ? 'Создаём...' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="text-center text-sm text-dark-300 mt-6">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 transition">Войти</Link>
        </p>
      </div>
    </div>
  );
}
