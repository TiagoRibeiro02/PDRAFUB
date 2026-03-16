import { useState } from 'react';

export default function Register() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const username        = (document.getElementById('username') as HTMLInputElement).value;
        const password        = (document.getElementById('password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:8001/register.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                alert('Registration successful!');
                window.location.href = '/login';
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            setError('Connection error. Please make sure the backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ color: 'rgb(202, 165, 97)', marginTop: '2rem', textAlign: 'center' }}>
                <h2>Entity Register</h2>
            </div>

            {error && (
                <div style={{
                    padding: '1rem',
                    marginTop: '1rem',
                    backgroundColor: '#fee',
                    color: '#c33',
                    borderRadius: '4px'
                }}>
                    {error}
                </div>
            )}

            <form style={{ marginTop: '1rem' }} id="register-form" onSubmit={handleSubmit}>
                <label>Username</label>
                <input
                    type="text"
                    id="username"
                    required
                    minLength={3}
                    style={{ width: '95%', marginBottom: '1rem' }}
                    disabled={loading}
                />

                <label>Password</label>
                <input
                    type="password"
                    id="password"
                    required
                    minLength={8}
                    style={{ width: '95%', marginBottom: '1rem' }}
                    disabled={loading}
                />

                <label>Confirm Password</label>
                <input
                    type="password"
                    id="confirm-password"
                    required
                    style={{ width: '95%', marginBottom: '1rem' }}
                    disabled={loading}
                />

                <div style={{ textAlign: 'center' }}>
                    <button type="submit" style={{ padding: '0.5rem 7.5rem' }} disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </div>

                <p style={{ marginTop: '1rem', textAlign: 'center' }}>
                    Already have an account? <a href="/login">Login here</a>
                </p>
            </form>
        </div>
    );
}
