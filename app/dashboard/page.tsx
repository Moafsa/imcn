"use client";
import { useEffect, useState } from 'react';
import styles from './page.module.css';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    todayRegistrations: 0,
    expiringCards: 0
  });

  useEffect(() => {
    // Fetch statistics from API
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/members/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Visão Geral do Painel</h2>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Total de Membros</h3>
            <p className={styles.statNumber}>{stats.totalMembers}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#10b981' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Cadastros de Hoje</h3>
            <p className={styles.statNumber}>{stats.todayRegistrations}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#f59e0b' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className={styles.statContent}>
            <h3>Expirando em Breve</h3>
            <p className={styles.statNumber}>{stats.expiringCards}</p>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h3>Ações Rápidas</h3>
        <div className={styles.actionButtons}>
          <a href="/dashboard/register" className={styles.actionButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Cadastrar Novo Membro
          </a>
          <a href="/dashboard/members" className={styles.actionButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="9" x2="15" y2="9"/>
              <line x1="9" y1="13" x2="15" y2="13"/>
              <line x1="9" y1="17" x2="11" y2="17"/>
            </svg>
            Ver Todos os Membros
          </a>
        </div>
      </div>
    </div>
  );
} 