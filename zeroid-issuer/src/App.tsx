import { useState, useEffect } from 'react';
import IssuerNFTManager from './IssuerNFTManager.tsx';

let contractAddress: string | undefined;
let MyNFTABI: unknown;
let kycContractAddress: string | undefined;
let KYCComplianceABI: unknown;

try {
  const a = await import('./contracts/contract-address.json');
  const b = await import('./contracts/MyNFT.json');
  contractAddress = (a as { MyNFT: string }).MyNFT;
  MyNFTABI = (b as { abi: unknown }).abi;
} catch { console.warn('MyNFT contract files not found.'); }

try {
  const a = await import('./contracts/kyc-deployment.json');
  const b = await import('./contracts/KYCCompliance.json');
  kycContractAddress = (a as { KYCCompliance: string }).KYCCompliance;
  KYCComplianceABI = (b as { abi: unknown }).abi;
} catch { console.warn('KYC contract files not found.'); }

export default function App() {
  const [issuerUser, setIssuerUser] = useState<Record<string, string>>(
    JSON.parse(localStorage.getItem('issuer_user') || 'null')
  );

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('issuer_user') || 'null');
    if (stored?.id) {
      fetch(`http://localhost:8003/me.php?user_id=${stored.id}`)
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            const updated = { ...stored, ...res.data };
            localStorage.setItem('issuer_user', JSON.stringify(updated));
            setIssuerUser(updated);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('issuer_user');
    window.location.href = '/login';
  };

  if (!issuerUser) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>
      {/* Header */}
      <div style={{
        background: '#1a1a1a',
        padding: '1rem 2rem',
        borderBottom: '2px solid rgb(202, 165, 97)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, color: 'rgb(202,165,97)' }}>
            {issuerUser.issuer_name || 'ZeroID Issuer'} — Asset Portal
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgb(202,165,97)', fontSize: '0.9rem' }}>
            Logged in as <strong>{issuerUser.username}</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.4rem 1rem', background: '#c0392b', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      {contractAddress && MyNFTABI ? (
        <IssuerNFTManager
          contractAddress={contractAddress}
          contractABI={MyNFTABI}
          kycContractAddress={kycContractAddress}
          kycContractABI={KYCComplianceABI}
          issuerDid={issuerUser.issuer_did || ''}
          issuerName={issuerUser.issuer_name || 'Unknown Issuer'}
        />
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
          <h2>Contract Not Found</h2>
        </div>
      )}
    </div>
  );
}
