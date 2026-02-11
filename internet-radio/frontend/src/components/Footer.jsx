'use client';

import Link from 'next/link';
import { HiMusicNote } from 'react-icons/hi';

export default function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-dark-400/50 pb-28">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                <HiMusicNote className="text-white text-sm" />
              </div>
              <span className="text-lg font-bold text-white">RadioWave</span>
            </div>
            <p className="text-sm text-dark-300">Интернет-радио с возможностью заказа песен, чатом и подписками.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Навигация</h4>
            <div className="space-y-2">
              <Link href="/" className="block text-sm text-dark-300 hover:text-white transition">Главная</Link>
              <Link href="/catalog" className="block text-sm text-dark-300 hover:text-white transition">Каталог</Link>
              <Link href="/subscriptions" className="block text-sm text-dark-300 hover:text-white transition">Подписки</Link>
              <Link href="/custom-order" className="block text-sm text-dark-300 hover:text-white transition">Своя песня</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Аккаунт</h4>
            <div className="space-y-2">
              <Link href="/login" className="block text-sm text-dark-300 hover:text-white transition">Войти</Link>
              <Link href="/register" className="block text-sm text-dark-300 hover:text-white transition">Регистрация</Link>
              <Link href="/profile" className="block text-sm text-dark-300 hover:text-white transition">Личный кабинет</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Контакты</h4>
            <div className="space-y-2 text-sm text-dark-300">
              <p>support@radiowave.ru</p>
              <p>+7 (000) 000-00-00</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-dark-400/50 text-center text-sm text-dark-300">
          &copy; {new Date().getFullYear()} RadioWave. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
