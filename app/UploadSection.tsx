'use client';

import React, { useRef, useState } from 'react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadSection() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Wybierz plik w formacie CSV.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('Plik jest zbyt duży. Maksymalny rozmiar to 10 MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(10);

    const progressInterval = window.setInterval(() => {
      setProgress((previous) => Math.min(90, previous + Math.floor(Math.random() * 10) + 5));
    }, 400);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      window.clearInterval(progressInterval);

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Błąd podczas wgrywania pliku.');
      }

      setProgress(100);
      window.setTimeout(() => {
        window.location.href = '/?tab=history';
      }, 500);
    } catch (uploadError: unknown) {
      window.clearInterval(progressInterval);
      setProgress(0);
      setError(uploadError instanceof Error ? uploadError.message : 'Nie udało się przetworzyć pliku.');
      setIsUploading(false);
    }
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleUpload(file);
  };

  return (
    <div
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-[32px] p-10 text-center transition-all duration-300 ${
        isUploading ? 'cursor-default border-blue-200 bg-blue-50/50' : 'cursor-pointer'
      } ${dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv,text/csv"
        onChange={handleChange}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center pointer-events-none">
        {isUploading ? (
          <div className="w-full max-w-sm mx-auto mb-6">
            <div className="flex justify-between text-xs text-blue-600 font-bold mb-2">
              <span>{progress === 100 ? 'Gotowe!' : 'Sprawdzanie i zapisywanie danych...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="text-5xl mb-4">📊</div>
        )}

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isUploading ? 'Importowanie historii...' : 'Wgraj historię zużycia energii'}
        </h3>

        <p className="text-slate-500 mb-6 max-w-lg mx-auto leading-relaxed">
          Na podstawie danych godzinowych porównamy profil zużycia z cenami RCE i pokażemy, w których godzinach zużywasz najwięcej energii. Wynik jest analizą orientacyjną, a nie gwarancją wysokości rachunku.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8 opacity-50 grayscale">
          <span className="text-[10px] font-black border border-slate-300 px-2 py-1 rounded-md bg-white">TAURON</span>
          <span className="text-[10px] font-black border border-slate-300 px-2 py-1 rounded-md bg-white">PGE</span>
          <span className="text-[10px] font-black border border-slate-300 px-2 py-1 rounded-md bg-white">ENEA</span>
          <span className="text-[10px] font-black border border-slate-300 px-2 py-1 rounded-md bg-white">ENERGA</span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl pointer-events-auto shadow-sm">
            <strong>Błąd:</strong> {error}
          </div>
        )}

        <button
          type="button"
          className={`px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all pointer-events-auto ${
            isUploading ? 'opacity-0 scale-95 h-0 overflow-hidden py-0' : 'hover:bg-blue-700 opacity-100'
          }`}
        >
          Wybierz plik CSV
        </button>

        {!isUploading && <p className="mt-4 text-xs text-slate-400">Maksymalnie 10 MB. Możesz też przeciągnąć plik tutaj.</p>}
      </div>
    </div>
  );
}
