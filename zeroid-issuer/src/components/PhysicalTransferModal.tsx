import { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import type { NFTItem } from '../IssuerNFTManager';
import { verifyOwnershipClaim, type OwnershipClaim, type VerificationResult } from '../utils/signatureVerify';

interface Props {
  nft: NFTItem;
  ethEurRate: number | null;
  kycContractAddress?: string;
  kycContractABI?: unknown;
  onClose: () => void;
}

type Step = 'instructions' | 'upload' | 'verifying' | 'result';

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.9)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: '1rem',
};

const PANEL: React.CSSProperties = {
  background: '#1a1a1a',
  border: '2px solid rgb(202,165,97)',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '2rem',
  position: 'relative',
};

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
      background: ok ? '#1a2a1a' : '#2a1a1a',
      color: ok ? '#4CAF50' : '#ff6b6b',
      border: `1px solid ${ok ? '#4CAF50' : '#ff6b6b'}`,
    }}>
      {ok ? '✓' : '✗'}
    </span>
  );
}

const HIGH_VALUE_KYC_THRESHOLD_EUR = 10_000;

function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    input.length + ((4 - (input.length % 4)) % 4),
    '='
  );
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function didToBigInt(did: string): Promise<bigint> {
  const data = new TextEncoder().encode(did);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return BigInt('0x' + hashHex.substring(0, 32));
}

export default function PhysicalTransferModal({ nft, ethEurRate, kycContractAddress, kycContractABI, onClose }: Props) {
  const fileRef                 = useRef<HTMLInputElement>(null);
  const [step, setStep]         = useState<Step>('instructions');
  const [claim, setClaim]       = useState<OwnershipClaim | null>(null);
  const [parseError, setParseError] = useState('');
  const [result, setResult]     = useState<VerificationResult | null>(null);
  const [onChainKey, setOnChainKey] = useState<Uint8Array | null>(null);
  const [freshKycIssued, setFreshKycIssued] = useState(false);
  const [freshKycError, setFreshKycError] = useState('');
  const [issuingFreshKyc, setIssuingFreshKyc] = useState(false);
  const [issueKycError, setIssueKycError] = useState('');
  const [issueKycSuccess, setIssueKycSuccess] = useState('');
  const [fallbackEthEurRate, setFallbackEthEurRate] = useState<number | null>(null);

  useEffect(() => {
    if (ethEurRate !== null) {
      setFallbackEthEurRate(null);
      return;
    }

    let cancelled = false;

    const loadRate = async () => {
      try {
        const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHEUR');
        const d = await r.json();
        const parsed = parseFloat(d?.price);
        if (!cancelled && Number.isFinite(parsed) && parsed > 0) {
          setFallbackEthEurRate(parsed);
          return;
        }
      } catch {
        // fallback below
      }

      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=eur');
        const d = await r.json();
        const parsed = Number(d?.ethereum?.eur);
        if (!cancelled && Number.isFinite(parsed) && parsed > 0) {
          setFallbackEthEurRate(parsed);
        }
      } catch {
        if (!cancelled) setFallbackEthEurRate(null);
      }
    };

    void loadRate();
    return () => { cancelled = true; };
  }, [ethEurRate]);

  const effectiveEthEurRate = ethEurRate ?? fallbackEthEurRate;
  const eurValue = effectiveEthEurRate !== null ? (parseFloat(nft.price) * effectiveEthEurRate) : null;
  const requiresFreshKyc = eurValue !== null && eurValue > HIGH_VALUE_KYC_THRESHOLD_EUR;

  const checkFreshKycOnChain = async () => {
    if (!kycContractAddress || !kycContractABI) {
      setFreshKycError('KYC contract is not configured in this issuer portal.');
      setFreshKycIssued(false);
      return;
    }

    setFreshKycError('');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const kyc = new ethers.Contract(kycContractAddress, kycContractABI as ethers.InterfaceAbi, provider);
      const [isCompliant, timestamp] = await kyc.checkCompliance(nft.didOwner);

      const previousTimestamp = nft.complianceTimestamp ?? 0;
      const newTimestamp = Number(timestamp);
      const hasFreshKyc = Boolean(isCompliant) && newTimestamp > previousTimestamp;

      setFreshKycIssued(hasFreshKyc);
      if (!hasFreshKyc) {
        setFreshKycError(
          'A new KYC is still required. Issue a fresh KYC in the entity flow, then click "Check New KYC On-Chain" again.'
        );
      }
    } catch (err: unknown) {
      setFreshKycIssued(false);
      setFreshKycError(err instanceof Error ? err.message : String(err));
    }
  };

  const extractCompressedKeyFromClaim = (): { pkX: string; pkParity: boolean } | null => {
    if (!claim) return null;
    try {
      const jwk = JSON.parse(claim.publicKey) as JsonWebKey;
      if (!jwk.x) return null;

      const xBytes = b64urlToBytes(jwk.x);
      if (xBytes.length !== 32) return null;
      const pkX = '0x' + Array.from(xBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      let pkParity = false;
      if (jwk.y) {
        const yBytes = b64urlToBytes(jwk.y);
        pkParity = (yBytes[yBytes.length - 1] & 1) === 1;
      }

      return { pkX, pkParity };
    } catch {
      return null;
    }
  };

  const issueFreshKycLikeEntity = async () => {
    if (!kycContractAddress || !kycContractABI) {
      setIssueKycError('KYC contract is not configured in this issuer portal.');
      return;
    }

    setIssuingFreshKyc(true);
    setIssueKycError('');
    setIssueKycSuccess('');

    try {
      let verificationKey: any = null;
      try {
        const res = await fetch('/zkp/verification_key.json');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        verificationKey = await res.json();
      } catch {
        throw new Error('Could not load /zkp/verification_key.json from issuer app.');
      }

      const poseidon = await buildPoseidon();
      const DID = await didToBigInt(nft.didOwner);
      const status = BigInt(1);
      const r = BigInt(999888777);
      const commitmentHash = poseidon([DID, status, r]);
      const commitment = poseidon.F.toString(commitmentHash);

      const { proof, publicSignals } = await snarkjs.plonk.fullProve(
        { DID: DID.toString(), status: status.toString(), commitment, r: r.toString() },
        '/zkp/circuit_js/circuit.wasm',
        '/zkp/circuit_final.zkey',
      );

      const verified = await snarkjs.plonk.verify(verificationKey, publicSignals, proof);
      if (!verified) {
        throw new Error('Generated proof failed local verification.');
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const kyc = new ethers.Contract(kycContractAddress, kycContractABI as ethers.InterfaceAbi, signer);

      const proofArray = [
        proof.A[0], proof.A[1],
        proof.B[0], proof.B[1],
        proof.C[0], proof.C[1],
        proof.Z[0], proof.Z[1],
        proof.T1[0], proof.T1[1],
        proof.T2[0], proof.T2[1],
        proof.T3[0], proof.T3[1],
        proof.Wxi[0], proof.Wxi[1],
        proof.Wxiw[0], proof.Wxiw[1],
        proof.eval_a,
        proof.eval_b,
        proof.eval_c,
        proof.eval_s1,
        proof.eval_s2,
        proof.eval_zw,
      ];
      const proofBytes = ethers.AbiCoder.defaultAbiCoder().encode(['uint256[24]'], [proofArray]);

      const issuerUser = JSON.parse(localStorage.getItem('issuer_user') || 'null') as Record<string, string> | null;
      const kycIssuer = issuerUser?.issuer_name || issuerUser?.issuer_did || nft.issuerName || nft.issuer || 'did:zeroid:issuer';
      const expiryTimestamp = Math.floor((Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) / 1000);

      const claimPk = extractCompressedKeyFromClaim();
      const tx = await kyc.submitComplianceProof(
        nft.didOwner,
        commitment,
        kycIssuer,
        expiryTimestamp,
        claimPk?.pkX ?? ethers.ZeroHash,
        claimPk?.pkParity ?? false,
        proofBytes,
        publicSignals,
      );
      await tx.wait();

      setIssueKycSuccess('Fresh KYC submitted successfully. Re-checking on-chain status…');
      await checkFreshKycOnChain();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIssueKycError(msg);
    } finally {
      setIssuingFreshKyc(false);
    }
  };

  // ── file handling ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError('');
    setClaim(null);
    setResult(null);

    try {
      const text = await file.text();
      const parsed: OwnershipClaim = JSON.parse(text);

      // Basic shape validation
      if (!parsed.did || !parsed.message || !parsed.signature || !parsed.publicKey) {
        throw new Error('File is missing required fields: did, message, signature, publicKey');
      }
      if (typeof parsed.nftId === 'undefined') {
        throw new Error('File is missing nftId');
      }

      // Warn if DID or token ID doesn't match
      if (parsed.did !== nft.didOwner) {
        setParseError(
          `DID mismatch: file claims "${parsed.did}" but this NFT is owned by "${nft.didOwner}". Proceeding anyway.`
        );
      } else if (parsed.nftId !== nft.tokenId) {
        setParseError(
          `Token ID mismatch: file claims NFT #${parsed.nftId} but you opened NFT #${nft.tokenId}. Proceeding anyway.`
        );
      }

      setClaim(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setParseError(`Cannot parse file: ${msg}`);
    }
  };

  // ── full verification ──────────────────────────────────────────────────────
  const runVerification = async () => {
    if (!claim) return;
    setStep('verifying');
    setResult(null);

    let keyBytes: Uint8Array | null = null;

    // 1) Fetch on-chain public key for this DID
    if (kycContractAddress && kycContractABI && typeof window !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(
          (window as any).ethereum
        );
        const kyc = new ethers.Contract(
          kycContractAddress,
          kycContractABI as ethers.InterfaceAbi,
          provider
        );
        const hex: string = await kyc.getPublicKey(claim.did);
        if (hex && hex !== '0x' && hex.length >= 4) {
          // hex is 33-byte compressed key as hex string
          const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
          keyBytes = new Uint8Array(raw.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
          setOnChainKey(keyBytes);
        }
      } catch (err) {
        console.warn('Could not fetch on-chain public key:', err);
      }
    }

    // 2) Verify signature + key match
    try {
      const res = await verifyOwnershipClaim(claim, keyBytes);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ signatureValid: false, keyMatchesOnChain: false, verified: false, error: msg });
    }

    setStep('result');
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={PANEL} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#888', fontSize: '1.4rem', cursor: 'pointer' }}
        >✕</button>

        <h2 style={{ margin: '0 0 0.5rem', color: 'rgb(202,165,97)' }}>Physical Transfer</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
          NFT <strong style={{ color: 'white' }}>#{nft.tokenId} — {nft.name}</strong>
          <br />
          Owner DID: <span style={{ fontFamily: 'monospace', color: '#aaa', fontSize: '0.8rem', wordBreak: 'break-all' }}>{nft.didOwner}</span>
        </p>

        {/* ── Step: instructions ─────────────────────────────────────── */}
        {(step === 'instructions' || step === 'upload') && (
          <>
            <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'white' }}>
                How to verify ownership
              </h3>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', color: '#aaa', fontSize: '0.85rem', lineHeight: '1.8' }}>
                <li>Ask the asset owner to open their <strong>ZeroID Wallet</strong> app.</li>
                <li>In the wallet, navigate to this NFT and tap <strong>"Sign Ownership Claim"</strong>.</li>
                <li>The wallet will download a <code>claim_nft_#{nft.tokenId}.json</code> file.</li>
                <li>The owner sends or presents this file to you (physically or digitally).</li>
                <li>Upload the file below — the app will verify the signature against the public key stored on the blockchain.</li>
                {requiresFreshKyc && (
                  <li>
                    Because this asset is above €{HIGH_VALUE_KYC_THRESHOLD_EUR.toLocaleString('pt-PT')},
                    you must issue a <strong>new KYC</strong> before completing the transfer.
                  </li>
                )}
              </ol>
            </div>

            {/* File upload */}
            <div
              style={{
                border: '2px dashed #444', borderRadius: '8px',
                padding: '2rem', textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.2s',
                marginBottom: '1rem',
              }}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              <div style={{ color: '#888', fontSize: '0.9rem' }}>
                {claim
                  ? <span style={{ color: '#4CAF50' }}>✓ File loaded — {claim.did.slice(0, 30)}…</span>
                  : 'Click to upload the ownership claim file (.json)'
                }
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {parseError && (
              <div style={{
                background: '#2a1a1a', border: '1px solid #ff6b6b', borderRadius: '6px',
                color: '#ffaa88', padding: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem',
              }}>
                {parseError}
              </div>
            )}

            {claim && (
              <div style={{ background: '#111', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#888' }}>
                <strong style={{ color: '#aaa' }}>Claim summary:</strong>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span>DID: <code style={{ color: '#ccc' }}>{claim.did}</code></span>
                  <span>NFT: <code style={{ color: '#ccc' }}>#{claim.nftId}</code></span>
                  <span>Timestamp: <code style={{ color: '#ccc' }}>{claim.timestamp ? new Date(claim.timestamp).toLocaleString() : 'N/A'}</code></span>
                  <span style={{ wordBreak: 'break-all' }}>Message: <em style={{ color: '#ccc' }}>{claim.message.slice(0, 80)}…</em></span>
                </div>
              </div>
            )}

            <button
              disabled={!claim}
              onClick={runVerification}
              style={{
                width: '100%', padding: '0.85rem',
                background: claim ? 'rgb(202,165,97)' : '#333',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: claim ? 'pointer' : 'not-allowed',
                fontWeight: 'bold', fontSize: '1rem',
              }}
            >
              Verify Ownership Claim
            </button>
          </>
        )}

        {/* ── Step: verifying ────────────────────────────────────────── */}
        {step === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#aaa' }}>Verifying signature and querying blockchain…</p>
          </div>
        )}

        {/* ── Step: result ───────────────────────────────────────────── */}
        {step === 'result' && result && (
          <>
            <div style={{
              background: result.verified ? '#1a2a1a' : '#2a1a1a',
              border: `2px solid ${result.verified ? '#4CAF50' : '#ff6b6b'}`,
              borderRadius: '10px', padding: '1.5rem', marginBottom: '1.5rem',
            }}>
              <div style={{
                fontSize: '1.4rem', marginBottom: '0.75rem',
                color: result.verified ? '#4CAF50' : '#ff6b6b',
                fontWeight: 'bold',
              }}>
                {result.verified ? '✓ Ownership Verified' : '✗ Verification Failed'}
              </div>

              {result.error && (
                <p style={{ color: '#ffaa88', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                  {result.error}
                </p>
              )}

              {/* Check details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <StatusBadge ok={result.signatureValid} />
                  <span style={{ color: '#ccc' }}>
                    Cryptographic signature
                    {result.signatureValid
                      ? ' — P-256 ECDSA signature is valid'
                      : ' — signature is invalid or tampered'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <StatusBadge ok={result.keyMatchesOnChain} />
                  <span style={{ color: '#ccc' }}>
                    On-chain public key
                    {onChainKey
                      ? result.keyMatchesOnChain
                        ? ' — file key matches blockchain record'
                        : ' — file key does NOT match blockchain record'
                      : ' — no key registered on-chain for this DID'
                    }
                  </span>
                </div>

                {onChainKey && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#555', wordBreak: 'break-all' }}>
                    On-chain key: {Array.from(onChainKey).map(b => b.toString(16).padStart(2,'0')).join('')}
                  </div>
                )}
              </div>
            </div>

            {result.verified ? (
              <div style={{
                background: '#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'1rem',
                marginBottom:'1.5rem', color:'#aaa', fontSize:'0.85rem', lineHeight:'1.6'
              }}>
                <strong style={{ color:'white' }}>Next steps:</strong>
                <ul style={{ margin:'0.5rem 0 0', paddingLeft:'1.25rem' }}>
                  <li>Identity of the owner has been cryptographically confirmed.</li>
                  {requiresFreshKyc
                    ? <li>Asset value is above €{HIGH_VALUE_KYC_THRESHOLD_EUR.toLocaleString('pt-PT')}, so a new KYC must be issued first.</li>
                    : <li>You may now hand over the physical asset.</li>
                  }
                  <li>Record the transfer in your internal system / custody log.</li>
                </ul>
              </div>
            ) : (
              <div style={{
                background: '#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'1rem',
                marginBottom:'1.5rem', color:'#aaa', fontSize:'0.85rem'
              }}>
                <strong style={{ color:'#ff6b6b' }}>Do not hand over the asset.</strong> The verification
                failed — the claimant could not prove they hold the private key corresponding to the
                DID owner registered on the blockchain.
              </div>
            )}

            {result.verified && requiresFreshKyc && (
              <div style={{
                background: '#111', border: `1px solid ${freshKycIssued ? '#4CAF50' : '#444'}`,
                borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem'
              }}>
                <div style={{ color: '#ddd', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  High-value transfer policy: this NFT is approximately{' '}
                  <strong style={{ color: 'rgb(202,165,97)' }}>
                    €{eurValue!.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
                  </strong>{' '}
                  and requires a freshly issued KYC before completion.
                </div>

                <button
                  onClick={issueFreshKycLikeEntity}
                  disabled={issuingFreshKyc || freshKycIssued}
                  style={{
                    width: '100%', padding: '0.75rem',
                    background: 'rgb(202,165,97)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    cursor: issuingFreshKyc || freshKycIssued ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold', opacity: issuingFreshKyc || freshKycIssued ? 0.75 : 1,
                  }}
                >
                  {issuingFreshKyc
                    ? 'Issuing fresh KYC…'
                    : freshKycIssued
                      ? '✓ Fresh KYC Issued'
                      : 'Issue KYC'}
                </button>

                {!freshKycIssued && issueKycSuccess && (
                  <p style={{ color: '#8de59b', fontSize: '0.8rem', margin: '0.6rem 0 0' }}>
                    {issueKycSuccess}
                  </p>
                )}

                {!freshKycIssued && issueKycError && (
                  <p style={{ color: '#ffaa88', fontSize: '0.8rem', margin: '0.6rem 0 0' }}>
                    KYC issue failed: {issueKycError}
                  </p>
                )}

                {!freshKycIssued && freshKycError && (
                  <p style={{ color: '#ffaa88', fontSize: '0.8rem', margin: '0.6rem 0 0' }}>
                    {freshKycError}
                  </p>
                )}
              </div>
            )}

            {result.verified && eurValue === null && (
              <div style={{
                background: '#111', border: '1px solid #444',
                borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem',
                color: '#ccc', fontSize: '0.85rem'
              }}>
                Could not fetch ETH/EUR rate, so the €10,000 high-value KYC rule cannot be evaluated right now.
                Please refresh and retry once network pricing is available.
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setStep('upload');
                  setResult(null);
                  setClaim(null);
                  setParseError('');
                  setOnChainKey(null);
                  setFreshKycIssued(false);
                  setFreshKycError('');
                  setIssuingFreshKyc(false);
                  setIssueKycError('');
                  setIssueKycSuccess('');
                }}
                style={{ flex:1, padding:'0.75rem', background:'#333', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                disabled={result.verified && requiresFreshKyc && !freshKycIssued}
                style={{
                  flex:1, padding:'0.75rem',
                  background: result.verified
                    ? (requiresFreshKyc && !freshKycIssued ? '#555' : 'rgb(202,165,97)')
                    : '#555',
                  color:'white', border:'none', borderRadius:'8px',
                  cursor: result.verified && requiresFreshKyc && !freshKycIssued ? 'not-allowed' : 'pointer',
                  fontWeight:'bold'
                }}
              >
                {result.verified
                  ? (requiresFreshKyc && !freshKycIssued ? 'KYC Required Before Completion' : 'Complete Transfer')
                  : 'Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
