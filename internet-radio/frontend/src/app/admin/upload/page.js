'use client';

import { useState, useRef } from 'react';
import { api } from '../../../lib/api';
import AuthGuard from '../../../components/AuthGuard';
import toast from 'react-hot-toast';
import { HiUpload, HiMusicNote, HiX } from 'react-icons/hi';

export default function UploadPage() {
  return (
    <AuthGuard requireAdmin>
      <UploadContent />
    </AuthGuard>
  );
}

function UploadContent() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList)
      .filter(f => ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'].includes(f.type) || f.name.match(/\.(mp3|wav|ogg|flac)$/i))
      .map(f => ({
        file: f,
        title: f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
        artist: '',
        genre: 'pop',
        order_price: '100',
      }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index, field, value) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const uploadAll = async () => {
    setUploading(true);
    let success = 0;
    let failed = 0;

    for (const item of files) {
      try {
        const formData = new FormData();
        formData.append('audio', item.file);
        formData.append('title', item.title);
        formData.append('artist', item.artist);
        formData.append('genre', item.genre);
        formData.append('order_price', item.order_price);
        await api.songs.upload(formData);
        success++;
      } catch (err) {
        failed++;
        toast.error(`Ошибка: ${item.title} — ${err.message}`);
      }
    }

    if (success > 0) {
      toast.success(`Загружено ${success} песен`);
      setFiles(prev => prev.slice(success));
    }
    if (failed > 0) {
      toast.error(`Не удалось загрузить ${failed} файлов`);
    }
    setUploading(false);
  };

  const genres = ['pop', 'rock', 'electronic', 'hip-hop', 'jazz', 'blues', 'indie', 'chill', 'ambient', 'other'];

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24">
      <h1 className="text-3xl font-bold text-white mb-8">Загрузка песен</h1>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`card border-2 border-dashed cursor-pointer text-center py-16 transition ${dragOver ? 'border-brand-500 bg-brand-600/10' : 'border-dark-400 hover:border-dark-300'}`}
      >
        <HiUpload className="text-5xl text-dark-300 mx-auto mb-4" />
        <p className="text-lg text-dark-100 mb-1">Перетащите файлы сюда</p>
        <p className="text-sm text-dark-300">или нажмите для выбора (MP3, WAV, OGG, FLAC)</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp3,.wav,.ogg,.flac"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Файлы к загрузке ({files.length})</h2>
            <button onClick={uploadAll} disabled={uploading} className="btn-primary disabled:opacity-40">
              {uploading ? 'Загрузка...' : `Загрузить все (${files.length})`}
            </button>
          </div>

          {files.map((item, i) => (
            <div key={i} className="card flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 bg-dark-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <HiMusicNote className="text-brand-400" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <input type="text" value={item.title} onChange={(e) => updateFile(i, 'title', e.target.value)} placeholder="Название" className="input-field py-2 text-sm" />
                <input type="text" value={item.artist} onChange={(e) => updateFile(i, 'artist', e.target.value)} placeholder="Исполнитель *" className="input-field py-2 text-sm" />
                <select value={item.genre} onChange={(e) => updateFile(i, 'genre', e.target.value)} className="input-field py-2 text-sm">
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input type="number" value={item.order_price} onChange={(e) => updateFile(i, 'order_price', e.target.value)} placeholder="Цена заказа" className="input-field py-2 text-sm" />
              </div>
              <button onClick={() => removeFile(i)} className="text-dark-300 hover:text-red-400 transition flex-shrink-0">
                <HiX size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
