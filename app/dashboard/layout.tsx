"use client";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import styles from './dashboard.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      router.push('/login');
    }
    async function fetchLogo() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.logo_url || data.logoUrl) setLogoUrl(data.logo_url || data.logoUrl);
        }
      } catch {}
    }
    fetchLogo();
  }, [router]);

  // Fecha o sidebar ao clicar fora
  useEffect(() => {
    if (!sidebarOpen) return;
    function handleClick(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sidebarOpen]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      {/* Botão hamburguer visível só no mobile */}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu"
        style={{ display: 'none' }}
      >
        <span />
        <span />
        <span />
      </button>
      {/* Sidebar responsivo */}
      <aside
        ref={sidebarRef}
        className={
          styles.sidebar +
          (sidebarOpen ? ' ' + styles.sidebarOpen : '')
        }
      >
        {/* Botão fechar só no mobile */}
        <button
          className={styles.closeSidebar}
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        >
          ×
        </button>
        <div className={styles.logo}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da igreja" style={{ maxWidth: 80, maxHeight: 80, margin: '0 auto', display: 'block' }} />
          ) : (
            <h2>IMCN</h2>
          )}
          <p>Painel de Controle</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Início
          </Link>
          <Link href="/dashboard/register" className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Cadastrar Membro
          </Link>
          <Link href="/dashboard/members" className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Listar Membros
          </Link>
          <Link href="/dashboard/settings" className={styles.navItem}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m11-11h-6m-6 0H1m20.7-6.3L18 8.4M8.4 18l-6.3 3.7m0-14.7L8.4 18M18 8.4l3.7 6.3"/>
            </svg>
            Configurações
          </Link>
        </nav>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair
        </button>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          {/* Botão hamburguer no header só no mobile */}
          <button
            className={styles.hamburger + ' ' + styles.hamburgerHeader}
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <span />
            <span />
            <span />
          </button>
          <h1>Sistema de Gestão da Igreja</h1>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
} 