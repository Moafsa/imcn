"use client";
import React, { useRef, useState } from 'react';
// @ts-ignore
import Webcam from 'react-webcam';
import styles from './register.module.css';

const roles = [
  'membro',
  'auxiliar',
  'diácono',
  'missionário',
  'presbítero',
  'evangelista',
  'pastor',
];

const maritalStatusOptions = [
  'Solteiro(a)',
  'Casado(a)',
  'Divorciado(a)',
  'Viúvo(a)',
  'União Estável',
  'Separado(a)'
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [role, setRole] = useState(roles[0]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const webcamRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [congregation, setCongregation] = useState('');
  const congregations = ['Flores da Cunha', 'Bento Gonçalves'];
  const [baptized, setBaptized] = useState('nao');
  const [baptismDate, setBaptismDate] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardPdfUrl, setCardPdfUrl] = useState<string | null>(null);
  const [lastMemberId, setLastMemberId] = useState<number | null>(null);
  const cardIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `webcam-photo.jpg`, { type: 'image/jpeg' });
        setPhoto(file);
        setUseWebcam(false);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    
    if (!name || !role || !photo) {
      setError('Todos os campos obrigatórios devem ser preenchidos.');
      setLoading(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('document', document);
    formData.append('marital_status', maritalStatus);
    formData.append('address', address);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('city', city);
    formData.append('congregation', congregation);
    formData.append('photo', photo);
    formData.append('baptized', baptized === 'sim' ? 'true' : 'false');
    formData.append('baptism_date', baptismDate);
    
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      console.log('Response:', res.status, data); // Debug log
      if (res.ok) {
        setSuccess('Membro cadastrado com sucesso!');
        setName('');
        setRole(roles[0]);
        setPhoto(null);
        setLastMemberId(data.id || null);
      } else {
        setError(data.error || 'Erro ao cadastrar membro.');
      }
    } catch (err) {
      console.error('Error:', err); // Debug log
      setError('Erro ao cadastrar membro.');
    }
    setLoading(false);
  };

  const handleViewCard = async () => {
    if (!lastMemberId) return;
    setLoadingCard(true);
    try {
      const res = await fetch(`/api/members/${lastMemberId}/card`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const safeName = name ? name.replace(/[^a-zA-Z0-9-_]/g, '_') : `membro_${lastMemberId}`;
        const fileName = `carteirinha-${safeName}.pdf`;
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          // Mobile: abrir em nova aba
          const win = window.open();
          if (win) {
            win.location.href = url;
          } else {
            // Fallback: força download
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.target = '_blank';
            anchor.download = fileName;
            window.document.body.appendChild(anchor);
            anchor.click();
            window.document.body.removeChild(anchor);
          }
        } else {
          // Desktop: abrir no modal
          setCardPdfUrl(url);
          setShowCardModal(true);
        }
      }
    } catch (error) {
      setCardPdfUrl(null);
      setShowCardModal(false);
    }
    setLoadingCard(false);
  };

  const handlePrintCardModal = () => {
    const iframe = cardIframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Cadastrar Novo Membro</h2>
      
      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Digite o nome completo do membro"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Cargo</label>
            <select value={role} onChange={e => setRole(e.target.value)} required>
              {roles.map(r => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label>Documento</label>
            <input
              type="text"
              value={document}
              onChange={e => setDocument(e.target.value)}
              placeholder="CPF ou RG"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Estado Civil</label>
            <select
              value={maritalStatus}
              onChange={e => setMaritalStatus(e.target.value)}
              required
            >
              <option value="">Selecione o estado civil</option>
              {maritalStatusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Endereço</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Endereço completo"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(99) 99999-9999"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Cidade</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Cidade do membro"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Congregação</label>
            <select
              value={congregation}
              onChange={e => setCongregation(e.target.value)}
              required
            >
              <option value="">Selecione a congregação</option>
              {congregations.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Batizado?</label>
            <select
              value={baptized}
              onChange={e => setBaptized(e.target.value)}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          {baptized === 'sim' && (
            <div className={styles.formGroup}>
              <label>Data do Batismo</label>
              <input
                type="date"
                value={baptismDate}
                onChange={e => setBaptismDate(e.target.value)}
              />
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label>Foto</label>
            {useWebcam ? (
              <div className={styles.webcamContainer}>
                <Webcam 
                  ref={webcamRef} 
                  screenshotFormat="image/jpeg" 
                  width={320} 
                  height={240}
                  className={styles.webcam}
                />
                <div className={styles.webcamButtons}>
                  <button type="button" onClick={capture} className={styles.captureButton}>
                    Capturar Foto
                  </button>
                  <button type="button" onClick={() => setUseWebcam(false)} className={styles.cancelButton}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.photoUpload}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange}
                  id="photo-upload"
                  className={styles.fileInput}
                />
                <label htmlFor="photo-upload" className={styles.uploadLabel}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Escolher Foto
                </label>
                <button type="button" onClick={() => setUseWebcam(true)} className={styles.webcamButton}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Usar Webcam
                </button>
                {photo && (
                  <div className={styles.preview}>
                    <img src={URL.createObjectURL(photo)} alt="Preview" />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Cadastrando...' : 'Cadastrar Membro'}
          </button>
        </form>
        
        {success && (
          <div className={styles.success}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {success}
            {lastMemberId && (
              <button onClick={handleViewCard} className={styles.printButton} style={{ marginLeft: 12 }} disabled={loadingCard}>
                {loadingCard ? 'Carregando...' : 'Ver carteirinha'}
              </button>
            )}
          </div>
        )}
        {error && (
          <div className={styles.error}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
      </div>
      {showCardModal && cardPdfUrl && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 500, minWidth: 350, width: '95vw', padding: 0 }}>
            <h3 style={{ fontSize: 18, padding: '16px 16px 0 16px' }}>Carteirinha do Membro</h3>
            <iframe
              ref={cardIframeRef}
              id="card-pdf-iframe"
              src={cardPdfUrl}
              width="100%"
              height="350px"
              style={{ border: '1px solid #ccc', borderRadius: 8, background: '#fff' }}
            />
            <div className={styles.modalActions} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
              <button onClick={handlePrintCardModal} className={styles.printButton} style={{ width: '100%' }}>Imprimir</button>
              <button onClick={() => setShowCardModal(false)} className={styles.cancelButton} style={{ width: '100%' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 