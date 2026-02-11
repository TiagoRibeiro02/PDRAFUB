import { useState } from 'react';

export default function Login() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;

        try {
            const response = await fetch('http://localhost/zeroid-wallet/backend/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(data.data));
                // Redirect to wallet
                window.location.href = '/';
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Connection error. Please make sure the backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "2rem" }}>
            <div style={{ marginTop: "2rem" }}>
                <h2>Login</h2>
            </div>

            {error && (
                <div style={{ 
                    padding: "1rem", 
                    marginTop: "1rem", 
                    backgroundColor: "#fee", 
                    color: "#c33",
                    borderRadius: "4px" 
                }}>
                    {error}
                </div>
            )}

            <form style={{ marginTop: "1rem" }} id="login-form" onSubmit={handleSubmit}>
                <label>Username</label>
                <input 
                    type="text" 
                    id="username" 
                    placeholder="username" 
                    required 
                    style={{ width: "100%", marginBottom: "1rem" }} 
                    disabled={loading}
                />

                <label>Password</label>
                <input 
                    type="password" 
                    id="password" 
                    placeholder="password" 
                    required 
                    style={{ width: "100%", marginBottom: "1rem" }} 
                    disabled={loading}
                />

                <button type="submit" style={{ width: "100%" }} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                <p style={{ marginTop: "1rem", textAlign: "center" }}>
                    Don't have an account? <a href="/register">Register here</a>
                </p>
            </form>
        </div>
    );
}