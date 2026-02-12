// SCRAM-SHA-256 utility functions for client-side authentication

/**
 * Generate a random nonce (base64 encoded)
 */
export function generateNonce(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * XOR two byte arrays
 */
function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

/**
 * Compute HMAC-SHA256
 */
async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    return new Uint8Array(signature);
}

/**
 * Compute SHA-256 hash
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
}

/**
 * Compute PBKDF2
 */
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        passwordKey,
        256 // 32 bytes = 256 bits
    );
    
    return new Uint8Array(derivedBits);
}

/**
 * Compute SCRAM client proof and server signature
 */
export async function computeScramProof(
    username: string,
    password: string,
    clientNonce: string,
    serverNonce: string,
    salt: string,
    iterations: number
): Promise<{ clientProof: string; authMessage: string }> {
    // Convert salt from hex to bytes
    const saltBytes = hexToBytes(salt);
    
    // SaltedPassword = PBKDF2(password, salt, iterations)
    const saltedPassword = await pbkdf2(password, saltBytes, iterations);
    
    // ClientKey = HMAC(SaltedPassword, "Client Key")
    const clientKey = await hmacSha256(saltedPassword, "Client Key");
    
    // StoredKey = SHA256(ClientKey)
    const storedKey = await sha256(clientKey);
    
    // Build auth message
    const nonce = clientNonce + serverNonce;
    const clientFirstBare = `n=${username},r=${clientNonce}`;
    const serverFirst = `r=${nonce},s=${salt},i=${iterations}`;
    const clientFinalWithoutProof = `c=biws,r=${nonce}`;
    const authMessage = `${clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;
    
    // ClientSignature = HMAC(StoredKey, AuthMessage)
    const clientSignature = await hmacSha256(storedKey, authMessage);
    
    // ClientProof = ClientKey XOR ClientSignature
    const clientProofBytes = xorBytes(clientKey, clientSignature);
    const clientProof = bytesToHex(clientProofBytes);
    
    return { clientProof, authMessage };
}

/**
 * Verify server signature
 */
export async function verifyServerSignature(
    password: string,
    salt: string,
    iterations: number,
    authMessage: string,
    serverSignature: string
): Promise<boolean> {
    // Convert salt from hex to bytes
    const saltBytes = hexToBytes(salt);
    
    // SaltedPassword = PBKDF2(password, salt, iterations)
    const saltedPassword = await pbkdf2(password, saltBytes, iterations);
    
    // ServerKey = HMAC(SaltedPassword, "Server Key")
    const serverKey = await hmacSha256(saltedPassword, "Server Key");
    
    // ServerSignature = HMAC(ServerKey, AuthMessage)
    const computedServerSignature = await hmacSha256(serverKey, authMessage);
    const computedServerSignatureHex = bytesToHex(computedServerSignature);
    
    // Compare signatures
    return computedServerSignatureHex === serverSignature;
}
