/**
 * Physical-transfer signature verification utilities.
 *
 * The user produces a OwnershipClaim file in their ZeroID wallet by signing
 * a canonical ownership-claim string with their P-256 (WebCrypto ECDSA) key.
 *
 * The issuer uploads the file here; we:
 *   1. Verify the ECDSA P-256 signature over the message using the publicKey JWK
 *      embedded in the file.
 *   2. Retrieve the compressed public key stored on-chain for that DID via the
 *      KYCCompliance contract (getPublicKey).
 *   3. Compare the on-chain key's x-coordinate and parity with those in the JWK.
 *      If both checks pass, the user has proven ownership of the DID that owns
 *      the NFT.
 */

export interface OwnershipClaim {
  /** DID that claims to own the NFT. */
  did: string;
  /** Token ID of the claimed NFT. */
  nftId: number;
  /** Human-readable message that was signed. */
  message: string;
  /** Base64-encoded ECDSA P-256 / SHA-256 signature over `message`. */
  signature: string;
  /** JSON-serialised P-256 public key JWK (with kty, crv, x, y). */
  publicKey: string;
  /** Unix-ms timestamp when the claim was created. */
  timestamp: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

/** base64url → standard base64 */
function b64urlToB64(s: string): string {
  return s.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    s.length + ((4 - (s.length % 4)) % 4), '='
  );
}

// ─── Step 1: verify P-256 ECDSA signature ────────────────────────────────────

/**
 * Verify the P-256 ECDSA signature in an OwnershipClaim.
 * @returns true if the signature is valid.
 */
export async function verifyClaimSignature(claim: OwnershipClaim): Promise<boolean> {
  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(claim.publicKey) as JsonWebKey;
  } catch {
    throw new Error('Invalid publicKey field — cannot parse JWK');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );

  const sigBytes = b64ToBytes(claim.signature);
  const msgBytes = new TextEncoder().encode(claim.message);

  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    sigBytes,
    msgBytes
  );
}

// ─── Step 2: compare JWK against on-chain compressed key ─────────────────────

/**
 * Convert the pkX bytes32 hex + parity flag from the contract to a
 * comparable x-coordinate hex string (no 0x prefix, 64 lowercase hex chars).
 */
export function onChainKeyToXHex(compressedKeyBytes: Uint8Array): { xHex: string; parity: boolean } {
  if (compressedKeyBytes.length !== 33) {
    throw new Error('Expected 33-byte compressed public key');
  }
  const prefix = compressedKeyBytes[0];
  const parity = prefix === 0x03; // 0x03 = odd y, 0x02 = even y
  const xBytes = compressedKeyBytes.slice(1); // 32 bytes
  const xHex   = Array.from(xBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { xHex, parity };
}

/**
 * Extract the x-coordinate hex and parity from a P-256 JWK.
 * The JWK `x` field is base64url-encoded.
 */
export function jwkToXHex(jwk: JsonWebKey): { xHex: string; parity: boolean | null } {
  if (!jwk.x) throw new Error('JWK missing x coordinate');

  const xBytes = b64ToBytes(b64urlToB64(jwk.x));
  const xHex   = Array.from(xBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Determine the parity of y to match on-chain storage.
  // If y is present in the JWK, compute parity from its last byte.
  let parity: boolean | null = null;
  if (jwk.y) {
    const yBytes = b64ToBytes(b64urlToB64(jwk.y));
    parity = (yBytes[yBytes.length - 1] & 1) === 1; // odd y → true
  }

  return { xHex, parity };
}

/**
 * Verify that the JWK in a claim matches the compressed public key returned
 * by the KYCCompliance contract for the same DID.
 *
 * @param claim          The OwnershipClaim (contains publicKey JWK + did).
 * @param onChainBytes   33-byte compressed key from contract.getPublicKey(did).
 * @returns true if the keys match.
 */
export function verifyJwkMatchesOnChainKey(
  claim: OwnershipClaim,
  onChainBytes: Uint8Array
): boolean {
  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(claim.publicKey) as JsonWebKey;
  } catch {
    throw new Error('Invalid publicKey field — cannot parse JWK');
  }

  const { xHex: onChainX, parity: onChainParity } = onChainKeyToXHex(onChainBytes);
  const { xHex: jwkX,     parity: jwkParity      } = jwkToXHex(jwk);

  if (onChainX.toLowerCase() !== jwkX.toLowerCase()) return false;
  if (jwkParity !== null && jwkParity !== onChainParity) return false;

  return true;
}

// ─── Full verification pipeline ──────────────────────────────────────────────

export interface VerificationResult {
  signatureValid: boolean;
  keyMatchesOnChain: boolean;
  /** true only when both checks pass */
  verified: boolean;
  error?: string;
}

/**
 * Run the full two-step verification:
 *   1. Verify P-256 signature.
 *   2. Compare JWK x-coord + parity with on-chain compressed key.
 *
 * @param claim          Parsed OwnershipClaim from the uploaded file.
 * @param onChainBytes   33-byte compressed public key from KYCCompliance.getPublicKey(did).
 *                       Pass null / empty if the DID has no registered key yet.
 */
export async function verifyOwnershipClaim(
  claim: OwnershipClaim,
  onChainBytes: Uint8Array | null
): Promise<VerificationResult> {
  let signatureValid = false;
  let keyMatchesOnChain = false;

  try {
    signatureValid = await verifyClaimSignature(claim);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { signatureValid: false, keyMatchesOnChain: false, verified: false, error: msg };
  }

  if (!signatureValid) {
    return {
      signatureValid: false,
      keyMatchesOnChain: false,
      verified: false,
      error: 'Signature is invalid — the file may have been tampered with.',
    };
  }

  if (onChainBytes && onChainBytes.length === 33) {
    try {
      keyMatchesOnChain = verifyJwkMatchesOnChainKey(claim, onChainBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { signatureValid: true, keyMatchesOnChain: false, verified: false, error: msg };
    }

    if (!keyMatchesOnChain) {
      return {
        signatureValid: true,
        keyMatchesOnChain: false,
        verified: false,
        error: 'Public key in the file does not match the key registered on-chain for this DID.',
      };
    }
  } else {
    // No on-chain key yet — treat as warning, still note it
    keyMatchesOnChain = false;
  }

  return {
    signatureValid,
    keyMatchesOnChain: onChainBytes && onChainBytes.length === 33 ? keyMatchesOnChain : false,
    verified: signatureValid && (onChainBytes && onChainBytes.length === 33 ? keyMatchesOnChain : false),
  };
}
