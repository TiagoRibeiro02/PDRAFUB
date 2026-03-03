/**
 * Wallet-side QR mutual authentication utilities.
 *
 * Protocol (SCRAM-like, adapted for QR/DID):
 *
 *  Phase 1  Entity → Relay (entity side):
 *    Entity generates ephemeral ECDSA key pair (signing) and ECDH key pair
 *    (encryption), signs "sessionId:challenge:sessionTimestamp" and PUTs
 *    { sessionId, entityPublicKey, entitySignature, sessionTimestamp,
 *      entityEncryptionPublicKey } to relay.
 *    QR contains all of the above so the wallet can verify without trusting
 *    the relay alone.
 *
 *  Phase 2  Wallet verifies entity (this file — verifyEntityQR):
 *    a. Verify entitySignature with entityPublicKey from QR
 *       → entity holds the ephemeral signing private key, so it generated the QR.
 *    b. Cross-check entityPublicKey against relay registration (?verify=1)
 *       → MITM would need to control BOTH the QR display AND the relay simultaneously.
 *    c. Check sessionTimestamp freshness (5 min window).
 *
 *  Phase 2.5  Wallet builds pre-auth commitment (this file — buildPreAuth):
 *    The wallet generates a walletChallenge (random hex), then encrypts
 *    "walletChallenge:did" with the entity's ECDH public key (ECDH + AES-GCM).
 *    This blob is sent to the relay together with the Phase 3 response.
 *    → Lets the entity know the expected DID before evaluating ECDSA material.
 *    → Only the entity (holding the ECDH private key) can decrypt it.
 *
 *  Phase 3  Wallet → Entity (this file — buildWalletResponse):
 *    signedData = "entityChallenge:walletChallenge:sessionId:entitySig:ethAddress:did:...:walletTimestamp"
 *    Embedding walletChallenge inside the signature binds the pre-auth commitment
 *    to the signed response (prevents a split-commitment attack).
 *    ethAddress at index 4 is inside the signature — swapping it in transit is detected.
 *
 *  Phase 4  Entity verifies wallet (entity side):
 *    Decrypts pre-auth, checks walletChallenge + DID commitment match signedData,
 *    then checks challenge, sessionId, entitySig, timestamp and ECDSA signature.
 */

// ─── Shared type ────────────────────────────────────────────────────────────

/**
 * Encrypted pre-auth payload sent by the wallet to the relay.
 * Only the entity (holding the ECDH private key) can decrypt it.
 */
export interface EncryptedPreAuth {
  /** Wallet's ephemeral ECDH P-256 public key used to derive the shared secret. */
  walletEphemeralPublicKey: JsonWebKey;
  /** AES-GCM IV (base64). */
  iv: string;
  /** AES-GCM ciphertext (base64) of the string "walletChallenge:did". */
  ciphertext: string;
}

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

// ─── Phase 2: wallet verifies entity ────────────────────────────────────────

/**
 * Verifies the entity's QR authenticity before showing the share dialog.
 * Throws a user-visible Error on any failure.
 */
export async function verifyEntityQR(scannedData: {
  sessionId: string;
  challenge: string;
  entityPublicKey?: JsonWebKey;
  entitySignature?: string;
  sessionTimestamp?: number;
  entityEncryptionPublicKey?: JsonWebKey;
}): Promise<void> {
  const { sessionId, challenge, entityPublicKey, entitySignature, sessionTimestamp, entityEncryptionPublicKey } = scannedData;

  if (!entityPublicKey || !entitySignature || !sessionTimestamp || !entityEncryptionPublicKey) {
    throw new Error(
      'This QR code does not include entity authentication.\n\n' +
      'Sharing refused to prevent impersonation attacks.\n' +
      'Please ask the requesting entity to update their application.'
    );
  }

  // 1. Verify entity self-signature over QR session data INCLUDING the ECDH encryption key.
  //    Any swap of entityEncryptionPublicKey is detected here without trusting the relay.
  const entitySigValid = await verifyECDSA(
    entityPublicKey,
    `${sessionId}:${challenge}:${sessionTimestamp}:${entityEncryptionPublicKey.x}:${entityEncryptionPublicKey.y}`,
    entitySignature
  ).catch(() => false);

  if (!entitySigValid) {
    throw new Error(
      'Entity QR signature is invalid.\n' +
      'The QR code may have been tampered with — sharing refused.'
    );
  }

  // 2. Cross-validate entityPublicKey against the relay registration.
  //    A MITM attacker would need to simultaneously control both the QR display
  //    and the relay to pass this check.
  let relayData: any;
  try {
    const res = await fetch(
      `http://localhost:8000/qr-relay.php?sessionId=${encodeURIComponent(sessionId)}&verify=1`
    );
    relayData = await res.json();
  } catch {
    throw new Error(
      'Could not reach the relay server to verify entity identity.\n' +
      'Check your connection and try again.'
    );
  }

  if (!relayData.success || !relayData.entityPublicKey) {
    throw new Error(
      'Session not found on the relay server.\n' +
      'The entity may not have registered this session, or it has expired.'
    );
  }

  const rk  = relayData.entityPublicKey as JsonWebKey;
  const rke = relayData.entityEncryptionPublicKey as JsonWebKey | null;

  if (rk.kty !== entityPublicKey.kty ||
      rk.crv !== entityPublicKey.crv ||
      rk.x   !== entityPublicKey.x   ||
      rk.y   !== entityPublicKey.y) {
    throw new Error(
      'Entity public key in QR does not match the relay registration.\n' +
      'Possible man-in-the-middle attack — sharing refused.'
    );
  }

  if (!rke ||
      rke.kty !== entityEncryptionPublicKey.kty ||
      rke.crv !== entityEncryptionPublicKey.crv ||
      rke.x   !== entityEncryptionPublicKey.x   ||
      rke.y   !== entityEncryptionPublicKey.y) {
    throw new Error(
      'Entity encryption key in QR does not match the relay registration.\n' +
      'Possible man-in-the-middle attack — sharing refused.'
    );
  }

  // 3. Freshness check (5-minute window)
  if (Math.abs(Date.now() - Number(sessionTimestamp)) > 5 * 60 * 1000) {
    throw new Error('This QR code has expired. Please ask the entity to generate a new one.');
  }
}

// ─── Phase 2.5: wallet builds encrypted pre-auth commitment ─────────────────

/**
 * Encrypts "walletChallenge:did" with the entity's ECDH public key (AES-GCM).
 * Send the returned { encryptedPreAuth, walletChallenge } to the relay POST and
 * pass walletChallenge into buildWalletResponse so the two are bound together.
 */
export async function buildPreAuth(
  entityEncryptionPublicKey: JsonWebKey,
  did: string
): Promise<{ encryptedPreAuth: EncryptedPreAuth; walletChallenge: string }> {
  // Wallet generates a fresh walletChallenge (32 hex bytes, no colons)
  const wcBytes = new Uint8Array(32);
  crypto.getRandomValues(wcBytes);
  const walletChallenge = Array.from(wcBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Wallet's ephemeral ECDH key pair for this pre-auth only
  const walletECDHKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
  );
  const walletEphemeralPublicKey = await crypto.subtle.exportKey('jwk', walletECDHKeyPair.publicKey) as JsonWebKey;
  delete (walletEphemeralPublicKey as any).d;

  // Import entity's ECDH public key and derive shared AES-GCM key
  const entityEcdhPub = await crypto.subtle.importKey(
    'jwk', entityEncryptionPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: entityEcdhPub },
    walletECDHKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(`${walletChallenge}:${did}`);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, plaintext);

  return {
    walletChallenge,
    encryptedPreAuth: {
      walletEphemeralPublicKey,
      iv:         ab2b64(iv.buffer as ArrayBuffer),
      ciphertext: ab2b64(ct),
    },
  };
}

// ─── Phase 3: wallet builds signed response ──────────────────────────────────

/**
 * Builds the wallet's signed response, binding it to the specific entity session
 * and to the pre-auth commitment via walletChallenge.
 *
 * signedData format: "entityChallenge:walletChallenge:sessionId:entitySig:ethAddress:did:...:walletTimestamp"
 *   entityChallenge  — bound to this entity request (anti-replay)
 *   walletChallenge  — binds the pre-auth commitment to this signed payload
 *   sessionId        — bound to this relay session
 *   entitySig        — binds wallet response to this entity (mutual auth)
 *   ethAddress       — ETH address at index 4 (no colons, DID stays unambiguous)
 *   did              — the wallet identity (may contain colons itself)
 *   walletTimestamp  — limits freshness window
 */
export async function buildWalletResponse(
  challenge: string,
  sessionId: string,
  entitySignature: string,
  did: string,
  ethAddress: string,
  walletPrivKey: CryptoKey,
  walletChallenge: string
): Promise<{ signedData: string; signature: string }> {
  const walletTimestamp = Date.now();
  // ethAddress is at index 4 (no colons), DID occupies indices 5..n-1, timestamp is last.
  const signedData = `${challenge}:${walletChallenge}:${sessionId}:${entitySignature}:${ethAddress}:${did}:${walletTimestamp}`;
  const signature  = await signECDSA(walletPrivKey, signedData);
  return { signedData, signature };
}
