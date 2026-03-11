import { useState } from 'react';
import { generateNonce, computeScramProof, verifyServerSignature } from './utils/scram';

const BACKEND = 'http://localhost:8003/login.php';

export default function Login() {
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const username = (document.getElementById('username') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      const clientNonce = generateNonce();

      const r1 = await fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'client-first', username, client_nonce: clientNonce }),
      });
      const d1 = await r1.json();

      if (!d1.success) { setError(d1.message || 'Failed to start auth'); setLoading(false); return; }

      const { identifier, salt, iterations, server_nonce } = d1.data;

      const { clientProof, authMessage } = await computeScramProof(
        username, password, clientNonce, server_nonce, salt, iterations
      );

      const r2 = await fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'client-final', username, identifier,
          client_nonce: clientNonce, server_nonce, client_proof: clientProof,
        }),
      });
      const d2 = await r2.json();

      if (d2.success) {
        const serverValid = await verifyServerSignature(
          password, salt, iterations, authMessage, d2.data.server_signature
        );
        if (!serverValid) {
          setError('Server authentication failed! Possible man-in-the-middle attack.');
          setLoading(false);
          return;
        }
        localStorage.setItem('issuer_user', JSON.stringify(d2.data));
        window.location.href = '/app';
      } else {
        setError(d2.message || 'Authentication failed');
      }
    } catch {
      setError('Connection error. Is the backend running on port 8003?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ color: 'rgb(202, 165, 97)', marginTop: '2rem', textAlign: 'center' }}>
        <h2>ZeroID Issuer — Login</h2>
      </div>

      {error && (
        <div style={{ color: '#ff6b6b', background: '#2a1a1a', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input id="username" type="text"     placeholder="Username" required
          style={{ padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '6px' }} />
        <input id="password" type="password" placeholder="Password" required
          style={{ padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '6px' }} />
        <button type="submit" disabled={loading}
          style={{ padding: '0.75rem', background: loading ? '#555' : 'rgb(202,165,97)', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p style={{ color: '#888', textAlign: 'center', marginTop: '1rem' }}>
        No account?{' '}
        <a href="/register" style={{ color: 'rgb(202,165,97)' }}>Register</a>
      </p>
    </div>
  );
}
