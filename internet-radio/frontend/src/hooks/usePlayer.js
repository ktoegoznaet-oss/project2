'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const STREAM_URL = process.env.NEXT_PUBLIC_STREAM_URL || 'http://localhost:8000/stream';

export default function usePlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audioRef.current = audio;

    const savedVolume = localStorage.getItem('radio_volume');
    if (savedVolume) {
      const v = parseFloat(savedVolume);
      audio.volume = v;
      setVolumeState(v);
    } else {
      audio.volume = 0.7;
    }

    audio.addEventListener('playing', () => setPlaying(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('ended', () => setPlaying(false));
    audio.addEventListener('error', () => setPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = STREAM_URL;
    audio.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = '';
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, play, pause]);

  const setVolume = useCallback((v) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clampedVolume = Math.max(0, Math.min(1, v));
    audio.volume = clampedVolume;
    setVolumeState(clampedVolume);
    localStorage.setItem('radio_volume', String(clampedVolume));
    if (clampedVolume > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.volume = volume;
      setMuted(false);
    } else {
      audio.volume = 0;
      setMuted(true);
    }
  }, [muted, volume]);

  return { playing, volume, muted, play, pause, togglePlay, setVolume, toggleMute };
}
