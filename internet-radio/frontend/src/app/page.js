'use client';

import NowPlaying from '../components/NowPlaying';
import SongCatalog from '../components/SongCatalog';
import Chat from '../components/Chat';
import DJMessages from '../components/DJMessages';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <NowPlaying />
          <SongCatalog compact />
          <DJMessages />
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
}
