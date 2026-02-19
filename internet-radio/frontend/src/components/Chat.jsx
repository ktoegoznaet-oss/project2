'use client';

import { useState, useEffect, useRef } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import useAuth from '../hooks/useAuth';
import { api } from '../lib/api';
import { HiPaperAirplane } from 'react-icons/hi';

export default function Chat() {
  const { user } = useAuth();
  const { connected, messages, sendMessage, setMessages } = useWebSocket();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [loadedHistory, setLoadedHistory] = useState(false);

  useEffect(() => {
    if (!loadedHistory) {
      api.chat.history({ limit: 50 }).then((data) => {
        setMessages(data.messages.map(m => ({
          type: 'chat_message',
          id: m.id,
          message: m.message,
          username: m.username || 'System',
          role: m.role || 'system',
          is_bot: m.is_bot,
          message_type: m.message_type,
          created_at: m.created_at,
        })));
        setLoadedHistory(true);
      }).catch(() => {});
    }
  }, [loadedHistory, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    sendMessage(input.trim());
    setInput('');
  };

  const getMessageStyle = (msg) => {
    if (msg.is_bot || msg.message_type === 'dj') return 'bg-brand-600/20 border-l-2 border-brand-500';
    if (msg.message_type === 'system') return 'bg-yellow-500/10 border-l-2 border-yellow-500';
    if (msg.message_type === 'order') return 'bg-green-500/10 border-l-2 border-green-500';
    return 'bg-dark-600';
  };

  return (
    <div className="card flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Чат</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-dark-200">{connected ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`rounded-lg px-3 py-2 ${getMessageStyle(msg)}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-semibold ${msg.role === 'admin' ? 'text-yellow-400' : msg.is_bot ? 'text-brand-400' : 'text-dark-100'}`}>
                {msg.is_bot ? '🎙 DJ Толик' : msg.username || 'Аноним'}
              </span>
              <span className="text-[10px] text-dark-300">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
            <p className="text-sm text-dark-50">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {user ? (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Написать сообщение..."
            maxLength={500}
            className="input-field flex-1 py-2 text-sm"
          />
          <button type="submit" disabled={!input.trim()} className="btn-primary py-2 px-3 disabled:opacity-40">
            <HiPaperAirplane className="text-lg" />
          </button>
        </form>
      ) : (
        <p className="text-sm text-dark-300 text-center py-2">Войдите, чтобы писать в чат</p>
      )}
    </div>
  );
}
