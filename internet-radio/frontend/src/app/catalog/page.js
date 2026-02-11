'use client';

import SongCatalog from '../../components/SongCatalog';

export default function CatalogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Каталог песен</h1>
        <p className="text-dark-300">Выберите песню и закажите её в эфир. Она прозвучит с вашим приветствием!</p>
      </div>
      <SongCatalog />
    </div>
  );
}
