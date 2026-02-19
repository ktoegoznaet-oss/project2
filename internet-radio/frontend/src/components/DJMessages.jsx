'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function DJMessages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    api.chat.history({ limit: 10 }).then(data => {
      const djMsgs = data.messages.filter(m => m.message_type === 'dj' || m.is_bot);
      setMessages(djMsgs.slice(-5));
    }).catch(() => {});
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-xl">🎙</span> DJ Толик
      </h3>
      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-brand-600/10 border-l-2 border-brand-500 rounded-r-lg px-4 py-3">
            <p className="text-sm text-dark-50">{msg.message.replace('🎙 DJ Толик: ', '')}</p>
            <p className="text-xs text-dark-300 mt-1">
              {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
