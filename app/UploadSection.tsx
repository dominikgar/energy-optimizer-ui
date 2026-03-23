"use client";
import { useState, useRef } from 'react';

export default function UploadSection() {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setStatus('Przetwarzanie i wysyłanie do bazy...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus(`✅ ${data.message} Odśwież stronę, aby zobaczyć wykres.`);
      } else {
        setStatus(`❌ Błąd: ${data.error}`);
      }
    } catch (err) {
      setStatus(`❌ Błąd krytyczny: Nie udało się połączyć z serwerem.`);
    } finally {
      setIsLoading(false);
      // Reset inputa, żeby można było wgrać ten sam plik jeszcze raz
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ backgroundColor: '#141414', padding: '1.5rem', borderRadius: '20px', border: '1px dashed #333', marginBottom: '2rem', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#ddd' }}>Wgraj plik z Taurona (CSV)</h3>
      
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        id="file-upload"
        ref={fileInputRef}
      />
      
      <label htmlFor="file-upload" style={{ 
        display: 'inline-block',
        padding: '10px 24px', 
        backgroundColor: isLoading ? '#333' : '#10b981', 
        color: '#fff', 
        borderRadius: '8px', 
        cursor: isLoading ? 'wait' : 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.2s'
      }}>
        {isLoading ? 'Mielę dane...' : 'Wybierz plik z dysku'}
      </label>

      {status && (
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: status.includes('❌') ? '#ef4444' : '#10b981' }}>
          {status}
        </p>
      )}
    </div>
  );
}
