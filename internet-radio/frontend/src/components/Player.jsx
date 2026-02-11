'use client';

import { useState, useEffect } from 'react';
import { HiPlay, HiPause, HiVolumeUp, HiVolumeOff } from 'react-icons/hi';
import usePlayer from '../hooks/usePlayer';
import { api } from '../lib/api';

export default function Player() {
  const { playing, volume, muted, togglePlay, setVolume, toggleMute } = usePlayer();
  const [nowPlaying, setNowPlaying] = useState({ title: 'RadioWave', artist: 'Загрузка...' });

  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const data = await api.stream.nowPlaying();
        setNowPlaying(data);
      } catch (err) {
        // ignore
      }
    };
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-dark-400/50" onContextMenu={(e) => e.preventDefault()}>
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-dark-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {playing ? (
              <div className="flex items-end gap-0.5 h-6">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1 bg-brand-500 rounded-full equalizer-bar" style={{ height: '4px' }} />
                ))}
              </div>
            ) : (
              <div className="w-6 h-6 text-dark-200">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{nowPlaying.title}</p>
            <p className="text-xs text-dark-200 truncate">{nowPlaying.artist}</p>
          </div>
          {nowPlaying.genre && (
            <span className="hidden sm:inline text-xs bg-dark-500 text-dark-100 px-2 py-0.5 rounded-full">{nowPlaying.genre}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          >
            {playing ? <HiPause className="text-white text-xl" /> : <HiPlay className="text-white text-xl ml-0.5" />}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 flex-1 justify-end">
          <button onClick={toggleMute} className="text-dark-200 hover:text-white transition">
            {muted || volume === 0 ? <HiVolumeOff size={20} /> : <HiVolumeUp size={20} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-brand-500 h-1"
          />
          <span className="text-xs text-dark-300 w-8">{Math.round((muted ? 0 : volume) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
