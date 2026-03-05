/**
 * Wallet-side QR authentication utilities — symmetric secret approach.
 *
 * The entity generates a fresh AES-GCM 256-bit secret and embeds it in the
 * QR code (displayed locally).  The wallet's only job is to:
 *   1. Verify the QR contains the expected fields and is still fresh.
 *   2. Encrypt its identity data with the secret.
 *   3. Post the encrypted blob to the relay.
 *
 * Because the secret is delivered via the locally-displayed QR, only a wallet
 * that physically scanned that QR can produce a ciphertext the entity can
 * decrypt — no ECDH key exchange or ECDSA signing required.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

export function ab2b64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** Decrypt an AES-GCM + PBKDF2 encrypted private-key file. */
export async function decryptPrivateKey(encryptedBase64: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const combined = Uint8Array.from(atob(encryptedBase64.replace(/\s/g, '')), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv   = combined.slice(16, 28);
  const ct   = combined.slice(28);

  const pk = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const k  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    pk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, ct);
  return new TextDecoder().decode(pt);
}

/** Import PKCS8 PEM → ECDSA P-256 CryptoKey (sign). */
export async function importPrivateKeyFromPEM(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** ECDSA P-256 / SHA-256 sign → base64. */
export async function signECDSA(privateKey: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(data)
  );
  return ab2b64(sig);
}

/** ECDSA P-256 / SHA-256 verify. */
export async function verifyECDSA(publicKeyJwk: JsonWebKey, data: string, b64Sig: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'jwk', publicKeyJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
  );
  const sigBytes = Uint8Array.from(atob(b64Sig), c => c.charCodeAt(0));
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key, sigBytes,
    new TextEncoder().encode(data)
  );
}

// ─── Phase 1: wallet verifies entity QR ─────────────────────────────────────

/**
 * Validates the entity's QR payload before showing the share dialog.
 * Checks that the required fields (`secret`, `challenge`, `sessionTimestamp`)
 * are present and that the QR is still within the 5-minute freshness window.
 * Throws a user-visible Error on any failure.
 */
export async function verifyEntityQR(scannedData: {
  sessionId: string;
  challenge: string;
  sessionTimestamp?: number;
  secret?: string;
}): Promise<void> {
  const { sessionId, challenge, sessionTimestamp, secret } = scannedData;

  if (!sessionId || !challenge) {
    throw new Error(
      'This QR code is missing required session fields.\n' +
      'Please ask the requesting entity to regenerate the QR.'
    );
  }

  if (!secret) {
    throw new Error(
      'This QR code does not include an encryption secret.\n' +
      'Please ask the requesting entity to update their application.'
    );
  }

  if (!sessionTimestamp) {
    throw new Error('This QR code is missing a session timestamp.');
  }

  if (Math.abs(Date.now() - Number(sessionTimestamp)) > 5 * 60 * 1000) {
    throw new Error('This QR code has expired. Please ask the entity to generate a new one.');
  }
}

/**
 * Sign a canonical string with the user's DID private key file.
 * Detects automatically whether the file is encrypted (lacks PEM headers).
 * If encrypted, `password` must be provided.
 */
export async function signWalletPayload(
  fileContent: string,
  password: string | null,
  canonicalData: string
): Promise<string> {
  const trimmed = fileContent.trim();
  let pem: string;
  if (trimmed.startsWith('-----BEGIN PRIVATE KEY-----')) {
    pem = trimmed;
  } else {
    if (!password) throw new Error('This key file is encrypted — please enter your key password.');
    pem = await decryptPrivateKey(trimmed, password);
  }
  const privateKey = await importPrivateKeyFromPEM(pem);
  return signECDSA(privateKey, canonicalData);
}

// ─── Phase 2: wallet encrypts identity data with the QR secret ──────────────

/**
 * Imports the AES-GCM secret from the QR payload and encrypts the wallet's
 * identity data.  Returns `{ iv, ciphertext }` ready to POST to the relay.
 *
 * The entity decrypts this blob using the same secret it generated — only the
 * entity (and the wallet that scanned its local QR) ever knew that secret.
 */
export async function encryptWalletData(
  secret: string,
  payload: {
    did: string;
    ethAddress: string;
    publicKey: string;
    signature: string;
    challenge: string;
    sessionId: string;
    walletTimestamp: number;
  }
): Promise<{ iv: string; ciphertext: string }> {
  // Import the raw AES-GCM key from the base64-encoded secret in the QR
  const rawKey = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);

  return {
    iv:         ab2b64(iv.buffer as ArrayBuffer),
    ciphertext: ab2b64(ct),
  };
}
