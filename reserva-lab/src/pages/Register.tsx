import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { api } from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { card, field } from './authStyles';

export const Register: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
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
      await api.post('/api/auth/register', { name, email, password });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível concluir o cadastro. Tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={card}>
      <h2>Cadastro de Usuário</h2>
      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <label style={field}>
          Nome
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
        <label style={field}>
          E-mail
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label style={field}>
          Senha (mínimo 6 caracteres)
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
        </label>
        <button className="btn btn-block" type="submit" disabled={submitting}>{submitting ? 'Cadastrando...' : 'Cadastrar'}</button>
      </form>
      <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Já tem conta? <Link to="/login">Entrar</Link></p>
    </div>
  );
};
