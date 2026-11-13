import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

type Tab = 'operacional' | 'equipamentos' | 'regras_usuarios' | 'historico';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  _count?: { items: number };
}

interface Item {
  id: string;
  name: string;
  patrimony_code: string;
  is_active: boolean;
  category_id: string;
  category: Category;
  maintenance?: Array<{ id: string; description: string; start_date: string; end_date?: string | null }>;
}

interface Reservation {
  id: string;
  expected_pickup_at: string;
  expected_return_at: string;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    is_manually_blocked: boolean;
  };
  item: {
    id: string;
    name: string;
    patrimony_code: string;
    category?: { name: string };
  };
  loan?: {
    id: string;
    actual_pickup_at: string;
    actual_return_at?: string | null;
    return_observation?: string | null;
  } | null;
}

interface SystemSettings {
  id: string;
  max_rent_days: number;
  max_concurrent_items: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_manually_blocked: boolean;
  active_reservations_count: number;
  dynamic_status: 'LIBERADO' | 'BLOQUEADO' | 'LIMITE_ATINGIDO';
  status_reason: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('operacional');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dados operacionais
  const [pickups, setPickups] = useState<Reservation[]>([]);
  const [returns, setReturns] = useState<Reservation[]>([]);

  // Dados de equipamentos e categorias
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemSearch, setItemSearch] = useState<string>('');

  // Dados de regras e usuários
  const [settings, setSettings] = useState<SystemSettings>({ id: '', max_rent_days: 14, max_concurrent_items: 3 });
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Histórico
  const [history, setHistory] = useState<Reservation[]>([]);
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('');

  // Modais de Operação
  const [returnModal, setReturnModal] = useState<{ isOpen: boolean; reservationId: string; itemName: string } | null>(null);
  const [returnObservation, setReturnObservation] = useState<string>('');

  // Modais de Criação
  const [newItemModal, setNewItemModal] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPatrimony, setNewItemPatrimony] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<string>('');

  const [newCatModal, setNewCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  // Modais de Edição
  const [editItemModal, setEditItemModal] = useState<{ id: string; name: string; category_id: string } | null>(null);
  const [editCatModal, setEditCatModal] = useState<{ id: string; name: string; description: string } | null>(null);

  // Modal de Manutenção
  const [maintenanceModal, setMaintenanceModal] = useState<{ isOpen: boolean; itemId: string; itemName: string } | null>(null);
  const [maintenanceDesc, setMaintenanceDesc] = useState<string>('');

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadOperacional = useCallback(async () => {
    try {
      const [pickupsRes, returnsRes] = await Promise.all([
        api.get('/api/admin/dashboard/daily-pickups'),
        api.get('/api/admin/dashboard/daily-returns'),
      ]);
      setPickups(pickupsRes.data.pickups || []);
      setReturns(returnsRes.data.returns || []);
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao carregar dados operacionais', 'error');
    }
  }, []);

  const loadEquipamentos = useCallback(async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        api.get('/api/admin/items'),
        api.get('/api/admin/categories'),
      ]);
      setItems(itemsRes.data.items || []);
      setCategories(catsRes.data.categories || []);
      if (catsRes.data.categories?.length > 0) {
        setNewItemCategory((prev) => prev || catsRes.data.categories[0].id);
      }
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao carregar equipamentos', 'error');
    }
  }, []);

  const loadRegrasEUsuarios = useCallback(async () => {
    try {
      const [settingsRes, usersRes] = await Promise.all([
        api.get('/api/admin/settings'),
        api.get('/api/admin/users'),
      ]);
      if (settingsRes.data.settings) {
        setSettings(settingsRes.data.settings);
      }
      setUsers(usersRes.data.users || []);
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao carregar regras e usuários', 'error');
    }
  }, []);

  const loadHistorico = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/loans/history');
      setHistory(res.data.history || []);
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao carregar histórico geral', 'error');
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      loadOperacional(),
      loadEquipamentos(),
      loadRegrasEUsuarios(),
      loadHistorico(),
    ]);
    setIsRefreshing(false);
    setInitialLoaded(true);
  }, [loadOperacional, loadEquipamentos, loadRegrasEUsuarios, loadHistorico]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Ações Operacionais
  const handleConfirmPickup = async (reservationId: string) => {
    try {
      await api.post('/api/admin/loans/pickup', { reservation_id: reservationId });
      showFeedback('Retirada confirmada com sucesso! Empréstimo ativo.', 'success');
      loadOperacional();
      loadHistorico();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Falha ao confirmar retirada', 'error');
    }
  };

  const handleMarkNoShow = async (reservationId: string) => {
    if (!window.confirm('Marcar esta reserva como Não Comparecimento (No-Show)?')) return;
    try {
      await api.patch(`/api/admin/reservations/${reservationId}/no-show`);
      showFeedback('Reserva marcada como não comparecimento.', 'success');
      loadOperacional();
      loadHistorico();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Falha ao registrar não comparecimento', 'error');
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnModal) return;
    try {
      await api.post(`/api/admin/loans/${returnModal.reservationId}/return`, {
        return_observation: returnObservation.trim() || null,
      });
      showFeedback('Devolução concluída com sucesso!', 'success');
      setReturnModal(null);
      setReturnObservation('');
      loadOperacional();
      loadHistorico();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Falha ao registrar devolução', 'error');
    }
  };

  // Ações de Equipamentos
  const handleToggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/items/${itemId}/status`, { is_active: !currentStatus });
      showFeedback(`Equipamento ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao alterar status', 'error');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/items', {
        name: newItemName,
        patrimony_code: newItemPatrimony,
        category_id: newItemCategory,
      });
      showFeedback('Equipamento cadastrado com sucesso!', 'success');
      setNewItemModal(false);
      setNewItemName('');
      setNewItemPatrimony('');
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao cadastrar equipamento', 'error');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemModal) return;
    try {
      await api.put(`/api/admin/items/${editItemModal.id}`, {
        name: editItemModal.name,
        category_id: editItemModal.category_id,
      });
      showFeedback('Equipamento atualizado com sucesso!', 'success');
      setEditItemModal(null);
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao atualizar equipamento', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/categories', {
        name: newCatName,
        description: newCatDesc.trim() || null,
      });
      showFeedback('Categoria cadastrada com sucesso!', 'success');
      setNewCatModal(false);
      setNewCatName('');
      setNewCatDesc('');
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao cadastrar categoria', 'error');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatModal) return;
    try {
      await api.put(`/api/admin/categories/${editCatModal.id}`, {
        name: editCatModal.name,
        description: editCatModal.description.trim() || null,
      });
      showFeedback('Categoria atualizada com sucesso!', 'success');
      setEditCatModal(null);
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao atualizar categoria', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta categoria?')) return;
    try {
      await api.delete(`/api/admin/categories/${catId}`);
      showFeedback('Categoria removida com sucesso!', 'success');
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao remover categoria', 'error');
    }
  };

  const handleSendToMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceModal) return;
    try {
      await api.post(`/api/admin/items/${maintenanceModal.itemId}/maintenance`, {
        description: maintenanceDesc,
      });
      showFeedback('Equipamento enviado para manutenção!', 'success');
      setMaintenanceModal(null);
      setMaintenanceDesc('');
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao registrar manutenção', 'error');
    }
  };

  const handleConcludeMaintenance = async (maintenanceId: string) => {
    try {
      await api.patch(`/api/admin/maintenance/${maintenanceId}/conclude`);
      showFeedback('Manutenção concluída com sucesso! Equipamento liberado.', 'success');
      loadEquipamentos();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao concluir manutenção', 'error');
    }
  };

  // Ações de Regras e Usuários
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/api/admin/settings', {
        max_rent_days: Number(settings.max_rent_days),
        max_concurrent_items: Number(settings.max_concurrent_items),
      });
      showFeedback('Parâmetros do sistema atualizados com sucesso!', 'success');
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao atualizar parâmetros', 'error');
    }
  };

  const handleToggleUserBlock = async (userId: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}/toggle-block`);
      showFeedback('Status de bloqueio do usuário alterado com sucesso!', 'success');
      loadRegrasEUsuarios();
    } catch (err: any) {
      showFeedback(err.response?.data?.error || 'Erro ao alterar bloqueio', 'error');
    }
  };

  const filteredItems = items.filter((it) => {
    const q = itemSearch.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      it.patrimony_code.toLowerCase().includes(q) ||
      (it.category?.name && it.category.name.toLowerCase().includes(q))
    );
  });

  const filteredHistory = history.filter((h) => {
    if (!historyFilterStatus) return true;
    return h.status === historyFilterStatus;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
            Painel de Gestão Administrativa
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            Controle diário de separação, entregas, devoluções, ativos e parâmetros globais.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={refreshAllData}
          disabled={isRefreshing}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
        >
          {isRefreshing ? 'Sincronizando...' : '🔄 Sincronizar'}
        </button>
      </header>

      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            backgroundColor: message.type === 'success' ? 'var(--soft)' : 'var(--danger-soft)',
            color: message.type === 'success' ? 'var(--primary)' : 'var(--danger)',
            border: `1px solid ${message.type === 'success' ? 'var(--border)' : 'var(--danger)'}`,
            fontWeight: 500,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Navegação por Abas (troca instantânea sem delay) */}
      <nav style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('operacional')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            borderBottom: activeTab === 'operacional' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'operacional' ? 'var(--primary)' : 'var(--muted)',
          }}
        >
          Painel Operacional Diário
          {pickups.length > 0 && <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{pickups.length}</span>}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('equipamentos')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            borderBottom: activeTab === 'equipamentos' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'equipamentos' ? 'var(--primary)' : 'var(--muted)',
          }}
        >
          Equipamentos & Categorias
          <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{items.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('regras_usuarios')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            borderBottom: activeTab === 'regras_usuarios' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'regras_usuarios' ? 'var(--primary)' : 'var(--muted)',
          }}
        >
          Regras & Gestão de Usuários
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            borderBottom: activeTab === 'historico' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'historico' ? 'var(--primary)' : 'var(--muted)',
          }}
        >
          Histórico Geral
        </button>
      </nav>

      {!initialLoaded && isRefreshing && (
        <p style={{ color: 'var(--muted)', padding: '1rem 0' }}>Conectando ao banco de dados...</p>
      )}

      {/* ABA 1: PAINEL OPERACIONAL DIÁRIO */}
      {activeTab === 'operacional' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Seção Retiradas */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Ativos a Serem Separados / Retiradas de Hoje</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                  Reservas com status AGENDADO para retirada na data de hoje ou pendentes.
                </p>
              </div>
              <span className="badge">{pickups.length} pendente(s)</span>
            </div>

            {pickups.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Nenhuma retirada prevista no momento.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {pickups.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      backgroundColor: 'var(--surface)',
                      padding: '1.25rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{p.item.name}</strong>
                      <span className="badge" style={{ fontSize: '0.75rem' }}>{p.item.patrimony_code}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Solicitante: <strong>{p.user.name}</strong> ({p.user.email})
                    </p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Retirada Prevista: {new Date(p.expected_pickup_at).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Devolução Prevista: {new Date(p.expected_return_at).toLocaleDateString()}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }}
                        onClick={() => handleConfirmPickup(p.id)}
                      >
                        Confirmar Retirada
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.5rem', fontSize: '0.9rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => handleMarkNoShow(p.id)}
                      >
                        Não Compareceu
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Seção Devoluções */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Devoluções do Dia e Empréstimos Ativos</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                  Itens atualmente emprestados com prazo de devolução.
                </p>
              </div>
              <span className="badge">{returns.length} ativo(s)</span>
            </div>

            {returns.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Nenhum empréstimo com devolução pendente no momento.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {returns.map((r) => {
                  const isOverdue = new Date(r.expected_return_at) < new Date();
                  return (
                    <div
                      key={r.id}
                      style={{
                        backgroundColor: 'var(--surface)',
                        padding: '1.25rem',
                        borderRadius: '8px',
                        border: isOverdue ? '1px solid var(--danger)' : '1px solid var(--border)',
                        boxShadow: 'var(--shadow)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1.1rem' }}>{r.item.name}</strong>
                        {isOverdue && <span className="badge badge-danger">EM ATRASO</span>}
                      </div>
                      <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Patrimônio: <strong>{r.item.patrimony_code}</strong>
                      </p>
                      <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Responsável: <strong>{r.user.name}</strong> ({r.user.email})
                      </p>
                      <p style={{ margin: '0.25rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        Retirado em: {r.loan?.actual_pickup_at ? new Date(r.loan.actual_pickup_at).toLocaleString() : '-'}
                      </p>
                      <p style={{ margin: '0.25rem 0', color: isOverdue ? 'var(--danger)' : 'var(--muted)', fontSize: '0.85rem', fontWeight: isOverdue ? 600 : 400 }}>
                        Devolução Prevista: {new Date(r.expected_return_at).toLocaleDateString()}
                      </p>
                      <button
                        type="button"
                        className="btn"
                        style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', fontSize: '0.9rem' }}
                        onClick={() => setReturnModal({ isOpen: true, reservationId: r.id, itemName: r.item.name })}
                      >
                        Registrar Devolução
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ABA 2: EQUIPAMENTOS E CATEGORIAS */}
      {activeTab === 'equipamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Seção Equipamentos */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Catálogo de Equipamentos</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Gerencie itens, código de patrimônio e manutenções.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Buscar por nome ou patrimônio..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                />
                <button type="button" className="btn" onClick={() => setNewItemModal(true)}>
                  + Novo Equipamento
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--soft)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nome</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Patrimônio</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Categoria</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it) => {
                    const activeMaint = it.maintenance && it.maintenance.length > 0 ? it.maintenance[0] : null;
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{it.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}><code>{it.patrimony_code}</code></td>
                        <td style={{ padding: '0.75rem 1rem' }}>{it.category?.name || '-'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {activeMaint ? (
                            <span className="badge badge-warning">Em Manutenção</span>
                          ) : it.is_active ? (
                            <span className="badge">Ativo</span>
                          ) : (
                            <span className="badge badge-danger">Inativo</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              onClick={() => setEditItemModal({ id: it.id, name: it.name, category_id: it.category_id })}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              onClick={() => handleToggleItemStatus(it.id, it.is_active)}
                            >
                              {it.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                            {activeMaint ? (
                              <button
                                type="button"
                                className="btn"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                onClick={() => handleConcludeMaintenance(activeMaint.id)}
                              >
                                Concluir Manutenção
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                onClick={() => setMaintenanceModal({ isOpen: true, itemId: it.id, itemName: it.name })}
                              >
                                Manutenção
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Seção Categorias */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Categorias de Equipamentos</h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Agrupamentos do catálogo.</p>
              </div>
              <button type="button" className="btn" onClick={() => setNewCatModal(true)}>
                + Nova Categoria
              </button>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--soft)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nome</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Descrição</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Itens Cadastrados</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--muted)' }}>{c.description || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{c._count?.items ?? 0}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            onClick={() => setEditCatModal({ id: c.id, name: c.name, description: c.description || '' })}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={() => handleDeleteCategory(c.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ABA 3: REGRAS E GESTÃO DE USUÁRIOS */}
      {activeTab === 'regras_usuarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Seção Regras Globais */}
          <section style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>Regras Globais de Reserva (SystemSettings)</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Limites aplicados automaticamente a todos os usuários da plataforma no momento da reserva direta.
            </p>
            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Dias Máximos por Reserva (max_rent_days):
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.max_rent_days}
                  onChange={(e) => setSettings({ ...settings, max_rent_days: parseInt(e.target.value, 10) || 1 })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Itens Simultâneos por Usuário (max_concurrent_items):
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.max_concurrent_items}
                  onChange={(e) => setSettings({ ...settings, max_concurrent_items: parseInt(e.target.value, 10) || 1 })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                  required
                />
              </div>
              <button type="submit" className="btn" style={{ padding: '0.55rem 1.25rem' }}>
                Salvar Parâmetros
              </button>
            </form>
          </section>

          {/* Seção Gestão de Usuários */}
          <section>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Gestão de Usuários e Penalidades</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                Visualize o status dinâmico calculado (Liberado, Bloqueado, Limite Atingido) e aplique bloqueio manual.
              </p>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--soft)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nome</th>
                    <th style={{ padding: '0.75rem 1rem' }}>E-mail</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Perfil</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Empréstimos Ativos</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status Dinâmico</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><code>{u.role}</code></td>
                      <td style={{ padding: '0.75rem 1rem' }}>{u.active_reservations_count}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {u.dynamic_status === 'BLOQUEADO' && (
                          <span className="badge badge-danger" title={u.status_reason}>Bloqueado</span>
                        )}
                        {u.dynamic_status === 'LIMITE_ATINGIDO' && (
                          <span className="badge badge-warning" title={u.status_reason}>Limite Atingido</span>
                        )}
                        {u.dynamic_status === 'LIBERADO' && (
                          <span className="badge" title={u.status_reason}>Liberado</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          type="button"
                          className={u.is_manually_blocked ? 'btn' : 'btn btn-outline'}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.8rem',
                            ...(u.is_manually_blocked
                              ? {}
                              : { color: 'var(--danger)', borderColor: 'var(--danger)' }),
                          }}
                          onClick={() => handleToggleUserBlock(u.id)}
                        >
                          {u.is_manually_blocked ? 'Desbloquear' : 'Bloquear Manualmente'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ABA 4: HISTÓRICO GERAL */}
      {activeTab === 'historico' && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Histórico Consolidado de Reservas e Empréstimos</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Rastreabilidade de todas as movimentações acadêmicas.</p>
            </div>
            <select
              value={historyFilterStatus}
              onChange={(e) => setHistoryFilterStatus(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
            >
              <option value="">Todos os status</option>
              <option value="SCHEDULED">SCHEDULED (Agendado)</option>
              <option value="ACTIVE_LOAN">ACTIVE_LOAN (Retirado)</option>
              <option value="COMPLETED">COMPLETED (Devolvido)</option>
              <option value="NO_SHOW">NO_SHOW (Falta)</option>
              <option value="CANCELLED">CANCELLED (Cancelado)</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--soft)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Item</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Patrimônio</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Solicitante</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Período Previsto</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Retirada / Devolução Real</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Observação Devolução</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{h.item.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}><code>{h.item.patrimony_code}</code></td>
                    <td style={{ padding: '0.75rem 1rem' }}>{h.user.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {new Date(h.expected_pickup_at).toLocaleDateString()} a {new Date(h.expected_return_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {h.loan?.actual_pickup_at ? new Date(h.loan.actual_pickup_at).toLocaleDateString() : '-'}
                      {' / '}
                      {h.loan?.actual_return_at ? new Date(h.loan.actual_return_at).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge">{h.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--muted)' }}>
                      {h.loan?.return_observation || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: REGISTRAR DEVOLUÇÃO */}
      {returnModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Registrar Devolução: {returnModal.itemName}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Preencha observações sobre o estado de devolução do equipamento (ex: avarias, ausência de cabos, peças faltando).
            </p>
            <textarea
              rows={4}
              value={returnObservation}
              onChange={(e) => setReturnObservation(e.target.value)}
              placeholder="Ex: Item devolvido em perfeito estado físico e funcional..."
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setReturnModal(null)}>Cancelar</button>
              <button type="button" className="btn" onClick={handleConfirmReturn}>Confirmar Devolução</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO EQUIPAMENTO */}
      {newItemModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Cadastrar Novo Equipamento</h3>
            <form onSubmit={handleCreateItem}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nome do Equipamento:</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ex: Dell Inspiron 15"
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Código de Patrimônio (Único):</label>
                <input
                  type="text"
                  value={newItemPatrimony}
                  onChange={(e) => setNewItemPatrimony(e.target.value)}
                  placeholder="Ex: PAT-00123"
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Categoria:</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setNewItemModal(false)}>Cancelar</button>
                <button type="submit" className="btn">Cadastrar Equipamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EQUIPAMENTO */}
      {editItemModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Editar Equipamento</h3>
            <form onSubmit={handleUpdateItem}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nome do Equipamento:</label>
                <input
                  type="text"
                  value={editItemModal.name}
                  onChange={(e) => setEditItemModal({ ...editItemModal, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Categoria:</label>
                <select
                  value={editItemModal.category_id}
                  onChange={(e) => setEditItemModal({ ...editItemModal, category_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditItemModal(null)}>Cancelar</button>
                <button type="submit" className="btn">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CATEGORIA */}
      {newCatModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Cadastrar Nova Categoria</h3>
            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nome da Categoria:</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Câmeras e Filmadoras"
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Descrição:</label>
                <textarea
                  rows={3}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Descrição da categoria (opcional)"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setNewCatModal(false)}>Cancelar</button>
                <button type="submit" className="btn">Cadastrar Categoria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CATEGORIA */}
      {editCatModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Editar Categoria</h3>
            <form onSubmit={handleUpdateCategory}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nome da Categoria:</label>
                <input
                  type="text"
                  value={editCatModal.name}
                  onChange={(e) => setEditCatModal({ ...editCatModal, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Descrição:</label>
                <textarea
                  rows={3}
                  value={editCatModal.description}
                  onChange={(e) => setEditCatModal({ ...editCatModal, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditCatModal(null)}>Cancelar</button>
                <button type="submit" className="btn">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENVIAR PARA MANUTENÇÃO */}
      {maintenanceModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>Enviar para Manutenção: {maintenanceModal.itemName}</h3>
            <form onSubmit={handleSendToMaintenance}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Motivo / Descrição do Problema:</label>
                <textarea
                  rows={3}
                  value={maintenanceDesc}
                  onChange={(e) => setMaintenanceDesc(e.target.value)}
                  placeholder="Ex: Manutenção preventiva semestral / troca de conector HDMI"
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setMaintenanceModal(null)}>Cancelar</button>
                <button type="submit" className="btn">Confirmar Envio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
