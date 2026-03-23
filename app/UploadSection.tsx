// @ts-nocheck
"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadSection() {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false); // Sterowanie rozwinięciem instrukcji
  const fileInputRef = useRef(null);
  
  const router = useRouter(); 

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setStatus('Wysyłanie pliku na serwer...');
    setProgress(15);
    setIsHelpOpen(false); // Zwijamy instrukcję, gdy ktoś zaczyna wgrywać

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
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
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        setTimeout(() => {
          router.refresh(); 
          setIsLoading(false);
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
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#ddd', fontSize: '1.2rem' }}>Wgraj swój plik z Taurona (CSV)</h3>
      
      {/* Przycisk pokazujący instrukcję */}
      <button 
        onClick={() => setIsHelpOpen(!isHelpOpen)} 
        style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.5rem', transition: 'color 0.2s' }}
        onMouseOver={(e) => e.target.style.color = '#60a5fa'}
        onMouseOut={(e) => e.target.style.color = '#3b82f6'}
      >
        {isHelpOpen ? 'Ukryj instrukcję ▲' : 'Nie wiesz jak pobrać plik? Zobacz instrukcję ▼'}
      </button>

      {/* Rozwijana instrukcja */}
      {isHelpOpen && (
        <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #222', marginBottom: '2rem', textAlign: 'left', fontSize: '0.95rem', color: '#aaa', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          <strong style={{ color: '#fff', fontSize: '1.05rem' }}>Jak pobrać dane z eLicznik Tauron?</strong>
          <ol style={{ paddingLeft: '1.2rem', marginTop: '0.8rem', marginBottom: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>Zaloguj się na swoje konto na stronie <strong>Mój Tauron / eLicznik</strong>.</li>
            <li style={{ marginBottom: '0.5rem' }}>Przejdź do zakładki z wykresami zużycia energii.</li>
            <li style={{ marginBottom: '0.5rem' }}>Wybierz zakres dat. Najlepiej wybrać <strong>Ostatnie 30 dni</strong> (system giełdowy RCE-PLN działa od czerwca 2024 r., więc nie wgrywaj starszych danych).</li>
            <li style={{ marginBottom: '0.5rem' }}>Wybierz rozdzielczość: <strong>Godzinowa</strong> lub <strong>15-minutowa</strong>.</li>
            <li>Kliknij przycisk <strong>Eksportuj do pliku</strong> (lub ikonę pobierania) i wybierz format <strong>CSV</strong>. Następnie wgraj ten plik poniżej.</li>
          </ol>
        </div>
      )}
      
      <div style={{ display: 'block' }}>
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
          {isLoading ? 'Przetwarzanie danych...' : 'Wybierz plik CSV z dysku'}
        </label>
      </div>

      {isLoading && (
        <div style={{ width: '100%', maxWidth: '400px', height: '6px', backgroundColor: '#222', borderRadius: '3px', margin: '1.5rem auto 0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#3b82f6', transition: 'width 0.4s ease-out', boxShadow: '0 0 10px #3b82f6' }} />
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
