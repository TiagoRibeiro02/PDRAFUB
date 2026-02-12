import { useState } from 'react';

export default function Register() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/register.php', {
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
                // Redirect to login
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
        <div style={{ padding: "2rem" }}>
            <div style={{ marginTop: "2rem" }}>
                <h2>Register</h2>
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

            <form style={{ marginTop: "1rem" }} id="register-form" onSubmit={handleSubmit}>
                <label>Username</label>
                <input 
                    type="text" 
                    id="username" 
                    placeholder="username" 
                    required 
                    minLength={3}
                    style={{ width: "100%", marginBottom: "1rem" }} 
                    disabled={loading}
                />

                <label>Password</label>
                <input 
                    type="password" 
                    id="password" 
                    placeholder="password" 
                    required 
                    minLength={6}
                    style={{ width: "100%", marginBottom: "1rem" }} 
                    disabled={loading}
                />

                <label>Confirm Password</label>
                <input 
                    type="password" 
                    id="confirm-password" 
                    placeholder="confirm password" 
                    required 
                    style={{ width: "100%", marginBottom: "1rem" }} 
                    disabled={loading}
                />

                <button type="submit" style={{ width: "100%" }} disabled={loading}>
                    {loading ? 'Registering...' : 'Register'}
                </button>

                <p style={{ marginTop: "1rem", textAlign: "center" }}>
                    Already have an account? <a href="/login">Login here</a>
                </p>
            </form>
        </div>
    );
}