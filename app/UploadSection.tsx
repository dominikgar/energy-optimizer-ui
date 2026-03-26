'use client';

import React, { useState } from 'react';

export default function UploadSection() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas wgrywania pliku.');
      }

      // Po sukcesie przekierowujemy użytkownika do zakładki historia
      // Używamy window.location, aby uniknąć problemów z dependencjami routera w niektórych środowiskach
      window.location.href = '/?tab=history';
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-[32px] p-10 text-center transition-all duration-300 ${
        dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:bg-white'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Ukryty input do wyboru pliku */}
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".csv"
        onChange={handleChange}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center">
        <div className={`text-5xl mb-4 transition-transform ${isUploading ? 'animate-bounce' : 'group-hover:scale-110'}`}>
          {isUploading ? '🚀' : '📊'}
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isUploading ? 'Przetwarzanie danych...' : 'Wgraj dane od swojego operatora'}
        </h3>
        
        <p className="text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
          Zoptymalizuj rachunki o <strong>15-20%</strong>. Obsługujemy pliki .csv z <strong>Tauron eLicznik, PGE, Enea oraz Energa</strong>.
        </p>

        {/* Branding Operatorów */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
           <span className="text-[9px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">TAURON</span>
           <span className="text-[9px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">PGE eBOK</span>
           <span className="text-[9px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">ENEA</span>
           <span className="text-[9px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">ENERGA</span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl animate-in fade-in zoom-in duration-300">
            <strong>Błąd:</strong> {error}
          </div>
        )}

        <label 
          htmlFor="file-upload"
          className={`px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all cursor-pointer ${
            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:scale-105 active:scale-95'
          }`}
        >
          {isUploading ? 'Wgrywanie...' : 'Wybierz plik CSV'}
        </label>
        
        {!isUploading && (
          <p className="mt-4 text-xs text-slate-400">
            Lub przeciągnij i upuść plik tutaj
          </p>
        )}
      </div>
      
      {/* Overlay podczas przeciągania */}
      {dragActive && <div className="absolute inset-0 z-10 rounded-[32px] pointer-events-none" />}
    </div>
  );
}
