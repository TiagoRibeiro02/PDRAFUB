import { useState } from 'react';
import { generateNonce, computeScramProof, verifyServerSignature } from './utils/scram';

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
            // Phase 1: SCRAM Client-First Message
            const clientNonce = generateNonce();
            
            const clientFirstResponse = await fetch('http://localhost:8000/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    action: 'client-first',
                    username,
                    client_nonce: clientNonce
                }),
            });

            const serverFirstData = await clientFirstResponse.json();

            if (!serverFirstData.success) {
                setError(serverFirstData.message || 'Failed to start authentication');
                setLoading(false);
                return;
            }

            const { identifier, salt, iterations, server_nonce } = serverFirstData.data;

            // Phase 2: SCRAM Client-Final Message
            // Compute client proof
            const { clientProof, authMessage } = await computeScramProof(
                username,
                password,
                clientNonce,
                server_nonce,
                salt,
                iterations
            );

            // Send client proof to server
            const clientFinalResponse = await fetch('http://localhost:8000/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'client-final',
                    username,
                    identifier,
                    client_nonce: clientNonce,
                    server_nonce: server_nonce,
                    client_proof: clientProof
                }),
            });

            const authData = await clientFinalResponse.json();

            if (authData.success) {
                // Phase 3: Verify server signature (mutual authentication)
                const isServerValid = await verifyServerSignature(
                    password,
                    salt,
                    iterations,
                    authMessage,
                    authData.data.server_signature
                );

                if (!isServerValid) {
                    setError('Server authentication failed! Possible man-in-the-middle attack.');
                    setLoading(false);
                    return;
                }

                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(authData.data));
                // Redirect to wallet
                window.location.href = '/wallet';
            } else {
                setError(authData.message || 'Authentication failed');
            }
        } catch (err) {
            setError('Connection error. Please make sure the backend server is running.');
            console.error('Login error:', err);
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