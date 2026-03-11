// SCRAM-SHA-256 utility functions for client-side authentication

export function generateNonce(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, '');
}

function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
    return new Uint8Array(signature);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        passwordKey,
        256
    );
    return new Uint8Array(derivedBits);
}

export async function computeScramProof(
    username: string,
    password: string,
    clientNonce: string,
    serverNonce: string,
    salt: string,
    iterations: number
): Promise<{ clientProof: string; authMessage: string }> {
    const saltBytes      = hexToBytes(salt);
    const saltedPassword = await pbkdf2(password, saltBytes, iterations);
    const clientKey      = await hmacSha256(saltedPassword, 'Client Key');
    const storedKey      = await sha256(clientKey);

    const nonce                   = clientNonce + serverNonce;
    const clientFirstBare         = `n=${username},r=${clientNonce}`;
    const serverFirst             = `r=${nonce},s=${salt},i=${iterations}`;
    const clientFinalWithoutProof = `c=biws,r=${nonce}`;
    const authMessage             = `${clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;

    const clientSignature  = await hmacSha256(storedKey, authMessage);
    const clientProofBytes = xorBytes(clientKey, clientSignature);

    return { clientProof: bytesToHex(clientProofBytes), authMessage };
}

export async function verifyServerSignature(
    password: string,
    salt: string,
    iterations: number,
    authMessage: string,
    serverSignature: string
): Promise<boolean> {
    const saltBytes      = hexToBytes(salt);
    const saltedPassword = await pbkdf2(password, saltBytes, iterations);
    const serverKey      = await hmacSha256(saltedPassword, 'Server Key');
    const computed       = await hmacSha256(serverKey, authMessage);
    return bytesToHex(computed) === serverSignature;
}
