import { useState } from 'react';

const BACKEND = 'http://localhost:8003/register.php';

export default function Register() {
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const username = (document.getElementById('username') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const confirm  = (document.getElementById('confirm')  as HTMLInputElement).value;

    if (password !== confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res  = await fetch(BACKEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Account created! Redirecting to login…');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else {
        setError(data.message || 'Registration failed');
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
        <h2>ZeroID Issuer — Register</h2>
      </div>

      {error   && <div style={{ color: '#ff6b6b', background: '#2a1a1a', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ color: '#4CAF50', background: '#1a2a1a', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input id="username" type="text"     placeholder="Username" required
          style={{ padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '6px' }} />
        <input id="password" type="password" placeholder="Password (min 8 chars)" required
          style={{ padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '6px' }} />
        <input id="confirm"  type="password" placeholder="Confirm password" required
          style={{ padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', color: 'white', borderRadius: '6px' }} />
        <button type="submit" disabled={loading}
          style={{ padding: '0.75rem', background: loading ? '#555' : 'rgb(202,165,97)', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Registering…' : 'Register'}
        </button>
      </form>

      <p style={{ color: '#888', textAlign: 'center', marginTop: '1rem' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: 'rgb(202,165,97)' }}>Sign In</a>
      </p>
    </div>
  );
}
