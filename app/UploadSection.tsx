// @ts-nocheck
"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadSection() {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // Nasz nowy pasek postępu!
  const fileInputRef = useRef(null);
  
  // To narzędzie pozwoli nam odświeżyć dane w tle
  const router = useRouter(); 

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setStatus('Wysyłanie pliku na serwer...');
    setProgress(15);

    // Udajemy szybki postęp, żeby użytkownik widział, że "coś się mieli"
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev; // Zatrzymujemy na 85% do czasu odpowiedzi serwera
        return prev + 10;
      });
    }, 400);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      clearInterval(progressInterval);
      
      if (response.ok) {
        setProgress(100);
        setStatus(`✅ ${data.message} Odświeżam wykresy...`);
        
        // Resetujemy input, żeby można było wgrać coś jeszcze raz
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // MAGIA! Odświeżamy dane w tle bez przeładowania całej strony
        setTimeout(() => {
          router.refresh(); 
          setIsLoading(false);
          // Po chwili ukrywamy pasek postępu
          setTimeout(() => { setStatus(''); setProgress(0); }, 3000); 
        }, 1000);
        
      } else {
        setStatus(`❌ Błąd: ${data.error}`);
        setIsLoading(false);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setStatus(`❌ Błąd krytyczny: Nie udało się połączyć z serwerem.`);
      setIsLoading(false);
    } 
  };

  return (
    <div style={{ backgroundColor: '#141414', padding: '2rem', borderRadius: '24px', border: '1px dashed #333', marginBottom: '2.5rem', textAlign: 'center', position: 'relative' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: '#ddd', fontSize: '1.2rem' }}>Wgraj nowy plik z Taurona (CSV)</h3>
      
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        id="file-upload"
        ref={fileInputRef}
        disabled={isLoading}
      />
      
      <label htmlFor="file-upload" style={{ 
        display: 'inline-block',
        padding: '12px 30px', 
        backgroundColor: isLoading ? '#222' : '#10b981', 
        color: isLoading ? '#888' : '#fff', 
        borderRadius: '30px', 
        cursor: isLoading ? 'wait' : 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
        transition: 'all 0.3s',
        border: isLoading ? '1px solid #444' : '1px solid #10b981'
      }}>
        {isLoading ? 'Przetwarzanie danych...' : 'Wybierz plik z dysku'}
      </label>

      {/* Pasek postępu */}
      {isLoading && (
        <div style={{ width: '100%', maxWidth: '400px', height: '6px', backgroundColor: '#222', borderRadius: '3px', margin: '1.5rem auto 0', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${progress}%`, 
            backgroundColor: '#3b82f6', 
            transition: 'width 0.4s ease-out',
            boxShadow: '0 0 10px #3b82f6'
          }} />
        </div>
      )}

      {status && (
        <p style={{ marginTop: '1rem', fontSize: '0.95rem', fontWeight: '500', color: status.includes('❌') ? '#ef4444' : (progress === 100 ? '#10b981' : '#3b82f6') }}>
          {status}
        </p>
      )}
    </div>
  );
}
