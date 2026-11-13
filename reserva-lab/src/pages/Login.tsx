import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { card, field } from './authStyles';

export const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = (location.state as { registered?: boolean } | null)?.registered;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      if (response.data.user?.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={card}>
      <h2>Entrar no ReservaLab</h2>
      {registered && <div className="alert" style={{ marginBottom: "1rem" }}>Cadastro realizado! Entre com seu e-mail e senha.</div>}
      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={field}>
          E-mail
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label style={field}>
          Senha
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        <button className="btn btn-block" type="submit" disabled={submitting}>{submitting ? 'Entrando...' : 'Entrar'}</button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Não tem conta? <Link to="/register">Cadastre-se</Link></p>
    </div>
  );
};
