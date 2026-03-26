'use client';

import React, { useState, useRef } from 'react';

export default function UploadSection() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProgress(10); // Start postępu

    // Symulacja płynnego postępu na pasku podczas przetwarzania przez serwer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Zatrzymujemy na 90% do czasu faktycznej odpowiedzi
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 400);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas wgrywania pliku.');
      }

      setProgress(100); // Pełen sukces
      
      // Krótkie opóźnienie dla UX (żeby użytkownik nacieszył się widokiem 100%)
      setTimeout(() => {
        window.location.href = '/?tab=history';
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      setProgress(0);
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

  const handleContainerClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={`relative border-2 border-dashed rounded-[32px] p-10 text-center transition-all duration-300 ${
        isUploading ? 'cursor-default border-blue-200 bg-blue-50/50' : 'cursor-pointer'
      } ${
        dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv"
        onChange={handleChange}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center pointer-events-none">
        
        {/* Dynamiczna zamiana Ikonki na Pasek Postępu */}
        {isUploading ? (
          <div className="w-full max-w-sm mx-auto mb-6">
            <div className="flex justify-between text-xs text-blue-600 font-bold mb-2">
              <span>{progress === 100 ? 'Gotowe!' : 'Przetwarzanie pliku CSV...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="text-5xl mb-4 transition-transform group-hover:scale-110">
            📊
          </div>
        )}
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isUploading ? 'Zapisywanie w bazie...' : 'Wgraj dane od swojego operatora'}
        </h3>
        
        <p className="text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
          Zoptymalizuj rachunki o <strong>15-20%</strong>. Obsługujemy pliki .csv z <strong>Tauron eLicznik, PGE, Enea oraz Energa</strong>.
        </p>

        {/* Branding Operatorów */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 opacity-40 grayscale transition-all duration-500">
           <span className="text-[10px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">TAURON</span>
           <span className="text-[10px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">PGE eBOK</span>
           <span className="text-[10px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">ENEA</span>
           <span className="text-[10px] font-black tracking-tighter border border-slate-300 px-2 py-1 rounded-md bg-white">ENERGA</span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl animate-in fade-in zoom-in duration-300 pointer-events-auto shadow-sm">
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
        
        {!isUploading && (
          <p className="mt-4 text-xs text-slate-400">
            Lub przeciągnij i upuść plik tutaj
          </p>
        )}
      </div>
      
      {dragActive && <div className="absolute inset-0 z-10 rounded-[32px] pointer-events-none" />}
    </div>
  );
}
