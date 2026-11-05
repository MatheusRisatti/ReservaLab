import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, userStatus, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'BLOQUEADO':
        return <span style={{ backgroundColor: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Bloqueado</span>;
      case 'LIMITE_ATINGIDO':
        return <span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Limite Atingido</span>;
      case 'LIBERADO':
      default:
        return <span style={{ backgroundColor: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Liberado</span>;
    }
  };

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      backgroundColor: '#1e293b',
      color: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link to="/" style={{ color: '#38bdf8', fontSize: '1.25rem', fontWeight: 'bold', textDecoration: 'none' }}>
          ReservaLab
        </Link>
        {isAuthenticated && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/" style={{ color: '#e2e8f0', textDecoration: 'none' }}>Catálogo</Link>
            <Link to="/minhas-reservas" style={{ color: '#e2e8f0', textDecoration: 'none' }}>Minhas Reservas</Link>
            {isAdmin && (
              <Link to="/admin" style={{ color: '#f59e0b', fontWeight: '600', textDecoration: 'none' }}>
                Painel Admin
              </Link>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isAuthenticated && user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{user.name}</span>
              {!isAdmin && getStatusBadge()}
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#334155',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/login" style={{ color: '#e2e8f0', textDecoration: 'none', padding: '0.5rem 1rem' }}>
              Entrar
            </Link>
            <Link
              to="/register"
              style={{
                backgroundColor: '#0284c7',
                color: '#fff',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px'
              }}
            >
              Cadastre-se
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
