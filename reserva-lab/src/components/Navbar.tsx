import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

const linkStyle: React.CSSProperties = { color: 'var(--nav-text)', textDecoration: 'none' };

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
        return <span className="badge badge-danger">Bloqueado</span>;
      case 'LIMITE_ATINGIDO':
        return <span className="badge badge-warning">Limite Atingido</span>;
      case 'LIBERADO':
      default:
        return <span className="badge">Liberado</span>;
    }
  };

  return (
    <nav
      className="site-nav"
      style={{
        backgroundColor: 'var(--nav-bg)',
        color: 'var(--nav-text)',
        borderBottom: '1px solid var(--nav-border)',
      }}
    >
      <div className="site-nav-brand">
        <Link to="/" className="brand-mark" aria-label="ReservaLab — início">
          <span>Reserva</span><span className="brand-mark-accent">Lab</span>
        </Link>
      </div>

      <div className="site-nav-links">
        {isAuthenticated && (
          <>
            <Link to="/" style={linkStyle}>Catálogo</Link>
            <Link to="/minhas-reservas" style={linkStyle}>Minhas Reservas</Link>
            {isAdmin && (
              <Link to="/admin" style={{ color: 'var(--nav-accent)', fontWeight: 600, textDecoration: 'none' }}>
                Painel Admin
              </Link>
            )}
          </>
        )}
      </div>

      <div className="site-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isAuthenticated && user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{user.name}</span>
              {!isAdmin && getStatusBadge()}
            </div>
            <button type="button" className="btn btn-outline" onClick={handleLogout}>
              Sair
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link to="/login" style={linkStyle}>Entrar</Link>
            <Link to="/register" className="btn">Cadastre-se</Link>
          </div>
        )}
      </div>
    </nav>
  );
};
