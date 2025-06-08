"use client";
import { useEffect, useState, useRef } from 'react';
import styles from './members.module.css';
import Webcam from 'react-webcam';

interface Member {
  id: number;
  name: string;
  role: string;
  document?: string;
  marital_status?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  congregation?: string;
  photo_url: string;
  created_at: string;
  expires_at: string;
  status: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editUseWebcam, setEditUseWebcam] = useState(false);
  const editWebcamRef = useRef<any>(null);
  const statusOptions = ['Ativo', 'Inativo', 'Desligado'];
  const [editTimeline, setEditTimeline] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardPdfUrl, setCardPdfUrl] = useState<string | null>(null);
  const cardIframeRef = useRef<HTMLIFrameElement | null>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [iframeKey, setIframeKey] = useState(0);
  const [loadingCard, setLoadingCard] = useState(false);

  const roles = [
    'membro',
    'auxiliar',
    'diácono',
    'missionário',
    'presbítero',
    'evangelista',
    'pastor',
  ];
  const congregations = ['Flores da Cunha', 'Bento Gonçalves'];

  const maritalStatusOptions = [
    'Solteiro(a)',
    'Casado(a)',
    'Divorciado(a)',
    'Viúvo(a)',
    'União Estável',
    'Separado(a)'
  ];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCard = async (memberId: number) => {
    try {
      const res = await fetch(`/api/members/${memberId}/card`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carteirinha-${memberId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading card:', error);
    }
  };

  const handlePrintCard = async (memberId: number) => {
    try {
      const res = await fetch(`/api/members/${memberId}/card`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
    } catch (error) {
      console.error('Error printing card:', error);
    }
  };

  const handleViewCard = async (memberId: number) => {
    setLoadingCard(true);
    try {
      const res = await fetch(`/api/members/${memberId}/card`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const member = members.find(m => m.id === memberId);
        const safeName = member?.name ? member.name.replace(/[^a-zA-Z0-9-_]/g, '_') : `membro_${memberId}`;
        const fileName = `carteirinha-${safeName}.pdf`;
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
          // Mobile: abrir em nova aba
          const win = window.open();
          if (win) {
            win.location.href = url;
          } else {
            // Fallback: força download
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } else {
          // Desktop: abrir no modal
          setCardPdfUrl(url);
          setIframeKey(prev => prev + 1);
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

  const handleEdit = async (member: Member) => {
    setEditingMember(member);
    setEditForm({ ...member });
    setShowEditModal(true);
    // Buscar timeline
    try {
      const res = await fetch(`/api/members/${member.id}/history`);
      if (res.ok) {
        setEditTimeline(await res.json());
      } else {
        setEditTimeline([]);
      }
    } catch {
      setEditTimeline([]);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditPhoto(e.target.files[0]);
    }
  };

  const handleEditCapture = () => {
    const imageSrc = editWebcamRef.current.getScreenshot();
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `webcam-photo.jpg`, { type: 'image/jpeg' });
        setEditPhoto(file);
        setEditUseWebcam(false);
      });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      let res;
      if (editPhoto) {
        const formData = new FormData();
        Object.entries(editForm).forEach(([key, value]) => formData.append(key, value ? String(value) : ''));
        formData.append('photo', editPhoto);
        res = await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch(`/api/members/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      }
      if (res.ok) {
        setShowEditModal(false);
        setEditingMember(null);
        setEditPhoto(null);
        fetchMembers();
      }
    } catch {}
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/members/${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(false);
        setDeletingId(null);
        fetchMembers();
      }
    } catch {}
  };

  const getStatusBadge = (status: string) => {
    let color = '#10b981'; // verde
    if (status === 'Inativo') color = '#f59e42'; // laranja
    if (status === 'Desligado') color = '#ef4444'; // vermelho
    return <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>{status}</span>;
  };

  const filteredMembers = members.filter(member =>
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === '' || member.status === statusFilter)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Membros da Igreja</h2>
        <div className={styles.searchBox}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar membros..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ marginLeft: 16 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
            <option value="">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Desligado">Desligado</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando membros...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Data de Cadastro</th>
                <th>Data de Validade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <tr key={member.id}>
                  <td>
                    <img
                      src={member.photo_url}
                      alt={member.name}
                      className={styles.memberPhoto}
                    />
                  </td>
                  <td className={styles.memberName}>{member.name}</td>
                  <td>
                    <span className={styles.role}>{member.role}</span>
                  </td>
                  <td>{formatDate(member.created_at)}</td>
                  <td>
                    <span className={isExpiringSoon(member.expires_at) ? styles.expiringSoon : ''}>
                      {formatDate(member.expires_at)}
                    </span>
                  </td>
                  <td>{getStatusBadge(member.status)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleViewCard(member.id)}
                        className={styles.printButton}
                        title={member.status !== 'Ativo' ? 'Só é possível visualizar carteirinha de membros ativos' : 'Ver Carteirinha'}
                        disabled={member.status !== 'Ativo' || loadingCard}
                        style={member.status !== 'Ativo' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        {loadingCard ? (
                          <span style={{ fontSize: 12 }}>Carregando...</span>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M8 7h8M8 11h8M8 15h4"/>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(member)}
                        className={styles.editButton}
                        title="Editar Membro"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className={styles.deleteButton}
                        title="Excluir Membro"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className={styles.noResults}>
              Nenhum membro encontrado com sua busca.
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMember && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Editar Membro</h3>
            {editingMember.photo_url && !editPhoto && (
              <div className={styles.editPhotoPreview}>
                <img src={editingMember.photo_url} alt={editingMember.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
            {editPhoto && (
              <div className={styles.editPhotoPreview}>
                <img src={URL.createObjectURL(editPhoto)} alt="Nova foto" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
              </div>
            )}
            <form onSubmit={handleEditSubmit} className={styles.editForm}>
              <label>Nome</label>
              <input name="name" value={editForm.name || ''} onChange={handleEditChange} required />
              <label>Cargo</label>
              <select name="role" value={editForm.role || ''} onChange={handleEditChange} required>
                <option value="">Selecione o cargo</option>
                {roles.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <label>Documento</label>
              <input name="document" value={editForm.document || ''} onChange={handleEditChange} />
              <label>Estado Civil</label>
              <select
                name="marital_status"
                value={editForm.marital_status || ''}
                onChange={handleEditChange}
                required
              >
                <option value="">Selecione o estado civil</option>
                {maritalStatusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <label>Endereço</label>
              <input name="address" value={editForm.address || ''} onChange={handleEditChange} />
              <label>Telefone</label>
              <input name="phone" value={editForm.phone || ''} onChange={handleEditChange} />
              <label>Email</label>
              <input name="email" value={editForm.email || ''} onChange={handleEditChange} />
              <label>Cidade</label>
              <input name="city" value={editForm.city || ''} onChange={handleEditChange} />
              <label>Congregação</label>
              <select name="congregation" value={editForm.congregation || ''} onChange={handleEditChange} required>
                <option value="">Selecione a congregação</option>
                {congregations.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label>Status</label>
              <select name="status" value={editForm.status || 'Ativo'} onChange={handleEditChange} required>
                {statusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <label>Batizado?</label>
              <select name="baptized" value={editForm.baptized === true || editForm.baptized === 'true' ? 'sim' : 'nao'} onChange={e => setEditForm({ ...editForm, baptized: e.target.value })}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
              {editForm.baptized === true || editForm.baptized === 'true' || editForm.baptized === 'sim' ? (
                <>
                  <label>Data do Batismo</label>
                  <input
                    type="date"
                    name="baptism_date"
                    value={editForm.baptism_date ? editForm.baptism_date.slice(0, 10) : ''}
                    onChange={handleEditChange}
                  />
                </>
              ) : null}
              <div className={styles.editPhotoActions}>
                <input type="file" accept="image/*" onChange={handleEditPhotoChange} />
                <button type="button" onClick={() => setEditUseWebcam(true)} className={styles.webcamButton}>Usar Webcam</button>
              </div>
              {editUseWebcam && (
                <div className={styles.webcamContainer}>
                  <Webcam
                    ref={editWebcamRef}
                    screenshotFormat="image/jpeg"
                    width={320}
                    height={240}
                    className={styles.webcam}
                  />
                  <div className={styles.webcamButtons}>
                    <button type="button" onClick={handleEditCapture} className={styles.captureButton}>Capturar Foto</button>
                    <button type="button" onClick={() => setEditUseWebcam(false)} className={styles.cancelButton}>Cancelar</button>
                  </div>
                </div>
              )}
              {/* Timeline */}
              <div style={{ marginTop: 24 }}>
                <h4>Histórico de Status/Cargo</h4>
                {editTimeline.length === 0 ? (
                  <div style={{ color: '#888' }}>Nenhuma alteração registrada.</div>
                ) : (
                  <ul style={{ maxHeight: 120, overflowY: 'auto', padding: 0, margin: 0 }}>
                    {editTimeline.map((item, idx) => (
                      <li key={idx} style={{ fontSize: 13, marginBottom: 4, listStyle: 'none' }}>
                        <b>{item.change_type === 'status' ? 'Status' : 'Cargo'}:</b> {item.old_value || '-'} → <b>{item.new_value}</b> <span style={{ color: '#888', fontSize: 11 }}>({new Date(item.changed_at).toLocaleString('pt-BR')})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.saveButton}>Salvar</button>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.cancelButton}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir este membro?</p>
            <div className={styles.modalActions}>
              <button onClick={confirmDelete} className={styles.deleteButton}>Excluir</button>
              <button onClick={() => setShowDeleteConfirm(false)} className={styles.cancelButton}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {showCardModal && cardPdfUrl && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 500, minWidth: 350, width: '95vw', padding: 0 }}>
            <h3 style={{ fontSize: 18, padding: '16px 16px 0 16px' }}>Carteirinha do Membro</h3>
            <iframe
              ref={cardIframeRef}
              id={`card-pdf-iframe-${iframeKey}`}
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