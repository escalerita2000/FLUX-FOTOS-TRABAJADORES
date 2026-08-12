import React, { useState } from 'react';
import { supabase } from '../supabase/client';
import { LogIn } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError('Por favor ingrese el correo y la contraseña.');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          throw new Error('Credenciales de acceso incorrectas. Verifique su correo y contraseña.');
        }
        throw authError;
      }

      onLoginSuccess();
    } catch (err: any) {
      console.error('Error de login:', err);
      setError(err.message || 'No se pudo conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">LECTORES FOTOS</h1>
          <p className="login-subtitle">Panel de Acceso para Supervisores</p>
        </div>

        {error && (
          <div className="alert-banner alert-danger">
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              CORREO ELECTRÓNICO
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="supervisor@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              CONTRASEÑA
            </label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '1.75rem' }}
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
            {!loading && <LogIn size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};
