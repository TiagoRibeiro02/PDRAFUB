/**
 * Entity-side QR mutual authentication utilities.
 *
 * Phase 1 — session creation:
 *   generateEntityQRSession() creates:
 *     - an ephemeral ECDSA P-256 key pair (for entity self-signing)
 *     - an ephemeral ECDH P-256 key pair  (for wallet→entity encrypted pre-auth)
 *   Signs "sessionId:challenge:sessionTimestamp" with the ECDSA key and returns
 *   everything needed to:
 *     a. PUT the registration to the relay  (registerEntitySession)
 *     b. Embed in the QR code so the wallet can self-verify WITHOUT trusting relay alone
 *
 * Phase 2.5 — wallet pre-auth commitment (wallet side):
 *   After the wallet verifies the entity QR it generates a walletChallenge and
 *   encrypts "walletChallenge:did" with the entity's ECDH public key (ECDH + AES-GCM).
 *   The encrypted blob travels with the signed response in the relay POST so the
 *   entity knows the expected DID before evaluating any ECDSA signature material.
 *
 * Phase 4 — verifying the wallet response:
 *   verifyWalletResponse() checks:
 *     - Decrypts encryptedPreAuth → { walletChallenge, did }
 *       (only this entity can decrypt — proves the wallet used the real QR)
 *     - signedData format:
 *         "entityChallenge:walletChallenge:sessionId:entitySig:ethAddress:did:...:walletTimestamp"
 *     - walletChallenge in signedData matches decrypted pre-auth  (commitment binding)
 *     - DID in signedData matches decrypted pre-auth              (identity pre-commitment)
 *     - challenge, sessionId, entitySig match what was generated
 *     - walletTimestamp is fresh (5 min window)
 *     - DID is RESOLVED from the authoritative wallet backend (resolve-did.php)
 *       → the POST body's `pk` field is NEVER trusted for key material
 *     - ECDSA signature valid against the RESOLVED public key
 *   Returns the verified { did, ethAddress } on success, throws on failure.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function ab2b64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function signECDSA(privateKey: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(data)
  );
  return ab2b64(sig);
}

// ─── Shared type ────────────────────────────────────────────────────────────

/**
 * Encrypted pre-auth payload produced by the wallet and sent to the relay.
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

// ─── Phase 1: entity generates authenticated QR session ─────────────────────

export interface EntityQRSession {
  /** Embed all of these in the QR code value. */
  qrPayload: {
    type: 'did-request';
    sessionId: string;
    challenge: string;
    entityPublicKey: JsonWebKey;
    entitySignature: string;
    sessionTimestamp: number;
    /** ECDH P-256 public key — wallet uses this to encrypt the pre-auth commitment. */
    entityEncryptionPublicKey: JsonWebKey;
  };
  /** PUT this to the relay so the wallet can cross-validate. */
  relayRegistration: {
    sessionId: string;
    entityPublicKey: JsonWebKey;
    entitySignature: string;
    sessionTimestamp: number;
    entityEncryptionPublicKey: JsonWebKey;
  };
  /**
   * The entity's ECDH private key — kept in memory only, never leaves this
   * process. Used in Phase 4 to decrypt the wallet's pre-auth commitment.
   */
  encryptionPrivateKey: CryptoKey;
}

export async function generateEntityQRSession(): Promise<EntityQRSession> {
  // Generate ephemeral ECDSA P-256 key pair for entity self-signing
  const signingKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const entityPublicKey = await crypto.subtle.exportKey('jwk', signingKeyPair.publicKey) as JsonWebKey;
  delete (entityPublicKey as any).d;

  // Generate ephemeral ECDH P-256 key pair for wallet→entity encrypted pre-auth
  const encryptionKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  const entityEncryptionPublicKey = await crypto.subtle.exportKey('jwk', encryptionKeyPair.publicKey) as JsonWebKey;
  delete (entityEncryptionPublicKey as any).d;

  // Random session ID
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Random 32-byte challenge (hex)
  const challengeBytes = new Uint8Array(32);
  crypto.getRandomValues(challengeBytes);
  const challenge = Array.from(challengeBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const sessionTimestamp = Date.now();

  // Entity signs own session data AND the ECDH encryption public key coords —
  // wallet will verify this, and any swap of entityEncryptionPublicKey will be detected.
  const entitySignature = await signECDSA(
    signingKeyPair.privateKey,
    `${sessionId}:${challenge}:${sessionTimestamp}:${entityEncryptionPublicKey.x}:${entityEncryptionPublicKey.y}`
  );

  const qrPayload = {
    type: 'did-request' as const,
    sessionId,
    challenge,
    entityPublicKey,
    entitySignature,
    sessionTimestamp,
    entityEncryptionPublicKey,
  };

  return {
    qrPayload,
    relayRegistration: {
      sessionId,
      entityPublicKey,
      entitySignature,
      sessionTimestamp,
      entityEncryptionPublicKey,
    },
    encryptionPrivateKey: encryptionKeyPair.privateKey,
  };
}

// ─── Phase 4 helper: decrypt wallet pre-auth commitment ──────────────────────

/**
 * Decrypts the wallet's pre-auth commitment.
 * The plaintext is "walletChallenge:did" — walletChallenge is 64 hex chars
 * (no colons), so the first colon unambiguously splits the two fields.
 */
export async function decryptPreAuth(
  preAuth: EncryptedPreAuth,
  encryptionPrivateKey: CryptoKey
): Promise<{ walletChallenge: string; did: string }> {
  const walletEcdhPub = await crypto.subtle.importKey(
    'jwk', preAuth.walletEphemeralPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: walletEcdhPub },
    encryptionPrivateKey,
    { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );

  const iv = Uint8Array.from(atob(preAuth.iv),         c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(preAuth.ciphertext), c => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, ct);
  const plaintext = new TextDecoder().decode(pt);

  // walletChallenge has no colons — first colon is the separator
  const sep = plaintext.indexOf(':');
  if (sep < 1) throw new Error('Malformed pre-auth plaintext');
  return {
    walletChallenge: plaintext.slice(0, sep),
    did:             plaintext.slice(sep + 1),
  };
}

/** Register the entity session on the relay via PUT. */
export async function registerEntitySession(
  reg: EntityQRSession['relayRegistration']
): Promise<void> {
  const res = await fetch('http://localhost:8000/qr-relay.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reg),
  });
  if (!res.ok) {
    throw new Error('Failed to register session on relay server');
  }
}

// ─── Phase 4: entity verifies wallet response ────────────────────────────────

/**
 * Verifies wallet's signed response.
 *
 * @param result              The raw relay response object (POST body mirror).
 * @param sessionId           The session ID generated by this entity.
 * @param challenge           The challenge generated by this entity.
 * @param entitySignature     The entity's own ephemeral signature from the QR session.
 * @param encryptionPrivateKey The entity's ECDH private key to decrypt the pre-auth blob.
 * @param didResolverUrl      Base URL of the wallet backend (default: http://localhost:8000).
 *
 * Returns `{ did, ethAddress }` on success, throws on failure.
 *
 * SECURITY:
 *  - Pre-auth commitment is decrypted first — entity knows expected DID before
 *    evaluating any ECDSA material (commitment binding, Phase 2.5).
 *  - `pk` field in `result` is NEVER used; key is always fetched from the
 *    authoritative DID resolver, preventing key-substitution attacks.
 */
export async function verifyWalletResponse(
  result: any,
  sessionId: string,
  challenge: string,
  entitySignature: string,
  encryptionPrivateKey: CryptoKey,
  didResolverUrl = 'http://localhost:8000'
): Promise<{ did: string; ethAddress: string }> {
  const { signature, signedData, encryptedPreAuth } = result;

  if (!signature || !signedData) {
    throw new Error('Wallet response is missing required authentication fields.');
  }

  // ── Phase 2.5: decrypt wallet pre-auth commitment ─────────────────────────
  // The wallet encrypted "walletChallenge:did" with the entity's ECDH public key.
  // Only this entity can decrypt it — proves the wallet used the real QR / ECDH key.
  if (!encryptedPreAuth) {
    throw new Error('Wallet response is missing encrypted pre-auth commitment.');
  }
  let preAuthWalletChallenge: string;
  let preAuthDid: string;
  try {
    const decrypted = await decryptPreAuth(encryptedPreAuth as EncryptedPreAuth, encryptionPrivateKey);
    preAuthWalletChallenge = decrypted.walletChallenge;
    preAuthDid             = decrypted.did;
  } catch (err: any) {
    throw new Error(`Pre-auth decryption failed: ${err.message}`);
  }

  // ── Parse signedData ───────────────────────────────────────────────────────
  // Format: "entityChallenge:walletChallenge:sessionId:entitySig:ethAddress:did:...:walletTimestamp"
  //   index 0       = entityChallenge
  //   index 1       = walletChallenge  (hex, no colons)
  //   index 2       = sessionId        (session-<ts>-<rand>, no colons)
  //   index 3       = entitySig        (base64, no colons)
  //   index 4       = ethAddress       (0x..., no colons)
  //   index 5..n-1  = did              (may contain colons, e.g. did:zeroid:uuid)
  //   last          = walletTimestamp
  const parts              = (signedData as string).split(':');
  const sigChallenge       = parts[0];
  const sigWalletChallenge = parts[1];
  const sigSession         = parts[2];
  const sigEntitySig       = parts[3];
  const sigEthAddress      = parts[4];
  const sigTimestamp       = parts[parts.length - 1];
  const sigDid             = parts.slice(5, parts.length - 1).join(':');

  if (sigChallenge  !== challenge)       throw new Error('Challenge mismatch');
  if (sigSession    !== sessionId)       throw new Error('Session mismatch');
  if (sigEntitySig  !== entitySignature) throw new Error('Entity signature mismatch — possible relay substitution attack');
  if (!sigEthAddress || !sigEthAddress.startsWith('0x'))
    throw new Error('Ethereum address missing or malformed in signed data');
  if (!sigDid.startsWith('did:'))        throw new Error('DID missing or malformed in signed data');
  if (Math.abs(Date.now() - Number(sigTimestamp)) > 5 * 60 * 1000)
    throw new Error('Wallet response timestamp expired');

  // ── Verify pre-auth commitment matches signedData ─────────────────────────
  if (sigWalletChallenge !== preAuthWalletChallenge)
    throw new Error('Wallet challenge in signed data does not match decrypted pre-auth — commitment binding failure');
  if (sigDid !== preAuthDid)
    throw new Error('DID in signed data does not match decrypted pre-auth — identity commitment mismatch');

  // ── Resolve DID from authoritative source ──────────────────────────────────
  // NEVER trust the pk field from the POST body — an attacker can replace it.
  // Always fetch the public key from the wallet backend database.
  let resolvedPk: JsonWebKey;
  let resolvedEthAddress: string;
  try {
    const res = await fetch(
      `${didResolverUrl}/resolve-did.php?did=${encodeURIComponent(sigDid)}`
    );
    const json = await res.json();
    if (!json.success || !json.publicKeyJwk) {
      throw new Error(json.message ?? 'DID not found');
    }
    resolvedPk         = json.publicKeyJwk as JsonWebKey;
    resolvedEthAddress = (json.ethAddress as string ?? '').toLowerCase();
  } catch (err: any) {
    throw new Error(`DID resolution failed for ${sigDid}: ${err.message}`);
  }

  // ── Verify ethAddress matches DB registration ─────────────────────────────────
  // Prevents a legitimate user from redirecting the NFT to an unregistered
  // address by signing their own signedData with their own key.
  if (sigEthAddress.toLowerCase() !== resolvedEthAddress) {
    throw new Error(
      'Ethereum address in signed payload does not match the registered address for this DID. ' +
      'Asset redirect attempt blocked.'
    );
  }

  // ── Defense-in-depth: cross-check removed intentionally ──────────────────
  // The POST body's `pk` field is attacker-controlled and omittable, so any
  // check against it is bypassable. Security comes entirely from the DID
  // resolution above. A `pk` field in the POST is simply ignored.

  // ── Verify ECDSA signature using the RESOLVED key ──────────────────────────
  const publicKey = await crypto.subtle.importKey(
    'jwk', resolvedPk,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
  );
  const sigBytes = Uint8Array.from(atob(signature as string), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey, sigBytes,
    new TextEncoder().encode(signedData as string)
  );
  if (!valid) throw new Error('Invalid wallet ECDSA signature');

  return { did: sigDid, ethAddress: sigEthAddress };
}
