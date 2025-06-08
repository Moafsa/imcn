"use client";
import { useState, useEffect } from 'react';
import styles from './settings.module.css';

export default function SettingsPage() {
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [churchName, setChurchName] = useState('IMCN - Igreja Missionária Caminho Novo');
  const [address, setAddress] = useState('Rua Dom Pedro, nº 33, bairro União');
  const [city, setCity] = useState('Flores da Cunha - RS');
  const [cardValidity, setCardValidity] = useState('12');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Buscar configurações ao carregar a página
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setChurchName(data.church_name || data.churchName || 'IMCN - Igreja Missionária Caminho Novo');
          setAddress(data.address || 'Rua Dom Pedro, nº 33, bairro União');
          setCity(data.city || 'Flores da Cunha - RS');
          setCardValidity((data.card_validity || data.cardValidity || 12).toString());
          setLogoUrl(data.logo_url || data.logoUrl || '');
        }
      } catch (e) {
        // Ignorar erro
      }
    }
    fetchSettings();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
      // Preview temporário
      setLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('churchName', churchName);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('cardValidity', cardValidity);
      if (logo) {
        formData.append('logo', logo);
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Configurações salvas com sucesso!');
        // Sempre usar a URL real do backend após salvar
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      } else {
        setError(data.error || 'Erro ao salvar configurações.');
      }
    } catch (err) {
      setError('Erro ao salvar configurações.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Configurações do Sistema</h2>
      
      <div className={styles.settingsCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h3>Informações da Igreja</h3>
            
            <div className={styles.formGroup}>
              <label>Nome da Igreja</label>
              <input
                type="text"
                value={churchName}
                onChange={e => setChurchName(e.target.value)}
                placeholder="Digite o nome da igreja"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Endereço</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Digite o endereço"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Cidade/Estado</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Digite a cidade e estado"
                required
              />
            </div>
          </div>

          <div className={styles.section}>
            <h3>Logo da Igreja</h3>
            
            <div className={styles.formGroup}>
              <label>Upload do Logo</label>
              <div className={styles.logoUpload}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoChange}
                  id="logo-upload"
                  className={styles.fileInput}
                />
                <label htmlFor="logo-upload" className={styles.uploadLabel}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Escolher Logo
                </label>
                {logoUrl && (
                  <div className={styles.preview}>
                    <img src={logoUrl} alt="Logo da igreja" />
                  </div>
                )}
              </div>
              <p className={styles.hint}>
                Recomendado: Imagem quadrada, mínimo 200x200 pixels
              </p>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Configurações de Carteirinha</h3>
            
            <div className={styles.formGroup}>
              <label>Validade Padrão</label>
              <select value={cardValidity} onChange={e => setCardValidity(e.target.value)} className={styles.select}>
                <option value="6">6 meses</option>
                <option value="12">1 ano</option>
                <option value="24">2 anos</option>
              </select>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
        
        {success && (
          <div className={styles.success}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {success}
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
    </div>
  );
} 