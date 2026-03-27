import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './IssuerNFTManager.css';
import IssuedNFTCard from './components/IssuedNFTCard';
import AvailableNFTCard from './components/AvailableNFTCard';
import NFTDetailModal from './components/NFTDetailModal.tsx';

declare global { interface Window { ethereum?: unknown } }

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  /** DID of the issuer org that created/issued this physical-asset NFT */
  issuer?: string;
  issuer_name?: string;
  asset_type?: string;
  [key: string]: unknown;
}

export interface NFTItem {
  tokenId: number;
  name: string;
  description: string;
  image: string;
  price: string;
  priceWei: bigint;
  /** DID of current NFT owner (empty when still in bank) */
  didOwner: string;
  issuer: string;
  issuerName: string;
  metadata: NFTMetadata;
  /** KYC status for the DID owner */
  isCompliant?: boolean;
  complianceTimestamp?: number;
  kycExpiryTimestamp?: number;
  kycIssuer?: string;
}

interface IssuerNFTManagerProps {
  contractAddress: string;
  contractABI: unknown;
  kycContractAddress?: string;
  kycContractABI?: unknown;
  issuerDid: string;
  issuerName: string;
}

export default function IssuerNFTManager({
  contractAddress, contractABI,
  kycContractAddress, kycContractABI,
  issuerDid, issuerName,
}: IssuerNFTManagerProps) {
  const [purchased, setPurchased]         = useState<NFTItem[]>([]);
  const [available, setAvailable]         = useState<NFTItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [account, setAccount]             = useState('');
  const [selectedNFT, setSelectedNFT]     = useState<NFTItem | null>(null);
  const [ethEurRate, setEthEurRate]       = useState<number | null>(null);
  const [showAllIssuers, setShowAllIssuers] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetImageUrl, setAssetImageUrl] = useState('');
  const [assetType, setAssetType] = useState('');
  const [assetPriceEth, setAssetPriceEth] = useState('');
  const [submittingAsset, setSubmittingAsset] = useState(false);
  const [assetSuccess, setAssetSuccess] = useState('');

  useEffect(() => {
    checkWallet();
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHEUR')
      .then(r => r.json())
      .then(d => setEthEurRate(parseFloat(d.price)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (account) loadNFTs();
  }, [account, contractAddress]);

  const checkWallet = async () => {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
    if (!eth) return;
    try {
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts.length) setAccount(accounts[0]);
    } catch { /* ignore */ }
  };

  const connectWallet = async () => {
    const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<string[]> } }).ethereum;
    if (!eth) { setError('MetaMask not installed'); return; }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err: unknown) {
      setError('Failed to connect wallet: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const loadNFTs = async () => {
    if (!contractAddress || !contractABI) { setLoading(false); return; }
    try {
      setLoading(true);
      setError('');
      const provider = new ethers.BrowserProvider((window as unknown as { ethereum: any }).ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI as ethers.InterfaceAbi, provider);

      const parseMetadata = async (tokenId: number | bigint): Promise<{ meta: NFTMetadata; price: bigint; didOwner: string }> => {
        const tokenURI: string = await contract.tokenURI(tokenId);
        const price: bigint    = await contract.getPrice(tokenId);
        const didOwner: string = await contract.getDidOwner(tokenId);

        let meta: NFTMetadata;
        if (tokenURI.startsWith('data:application/json')) {
          meta = JSON.parse(atob(tokenURI.split(',')[1]));
        } else {
          meta = await fetch(tokenURI).then(r => r.json());
        }
        return { meta, price, didOwner };
      };

      /**
       * Extract issuer DID and name from metadata.
       * Prefers the top-level `issuer` / `issuer_name` fields added in newer
       * minting scripts; falls back to the `attributes` array for backwards
       * compatibility with NFTs minted before those fields were added.
       */
      const extractIssuerFields = (meta: NFTMetadata): { issuer: string; issuerName: string } => {
        const attrIssuer = Array.isArray(meta.attributes)
          ? (meta.attributes as { trait_type: string; value: string }[]).find(
              a => a.trait_type === 'Issuer'
            )
          : undefined;

        return {
          issuer: (typeof meta.issuer === 'string' && meta.issuer)
            ? meta.issuer
            : attrIssuer ? String(attrIssuer.value) : '',
          issuerName: (typeof meta.issuer_name === 'string' && meta.issuer_name)
            ? meta.issuer_name
            : attrIssuer ? String(attrIssuer.value) : '',
        };
      };

      // ── Available NFTs (still in bank) ────────────────────────────────
      const [availableIds, prices]: [bigint[], bigint[]] = await contract.getAvailableNFTs();
      const availItems: NFTItem[] = [];

      for (let i = 0; i < availableIds.length; i++) {
        try {
          const { meta } = await parseMetadata(availableIds[i]);
          const { issuer: avIssuer, issuerName: avIssuerName } = extractIssuerFields(meta);
          availItems.push({
            tokenId: Number(availableIds[i]),
            name: meta.name || `NFT #${availableIds[i]}`,
            description: meta.description || '',
            image: meta.image || '',
            price: ethers.formatEther(prices[i]),
            priceWei: prices[i],
            didOwner: '',
            issuer: avIssuer,
            issuerName: avIssuerName,
            metadata: meta,
          });
        } catch (e) { console.error(`NFT #${availableIds[i]} load error:`, e); }
      }
      setAvailable(availItems);

      // ── Purchased NFTs (have a DID owner) ─────────────────────────────
      const totalSupply: bigint = await contract.totalSupply();
      const purchItems: NFTItem[] = [];
      const didsToCheck: string[] = [];
      const soldPriceByTokenId = new Map<number, bigint>();

      // In this contract, `getPrice(tokenId)` is set to 0 after purchase.
      // Recover the historical sale price from NFTPurchased events.
      try {
        const purchaseEvents = await contract.queryFilter(contract.filters.NFTPurchased());
        for (const ev of purchaseEvents) {
          const args = (ev as ethers.EventLog).args as { tokenId?: bigint; price?: bigint; [k: number]: unknown };
          const tokenIdRaw = args.tokenId ?? (args[0] as bigint | undefined);
          const priceRaw = args.price ?? (args[2] as bigint | undefined);
          if (typeof tokenIdRaw !== 'undefined' && typeof priceRaw !== 'undefined') {
            soldPriceByTokenId.set(Number(tokenIdRaw), BigInt(priceRaw.toString()));
          }
        }
      } catch (e) {
        console.warn('Could not load NFTPurchased event history:', e);
      }

      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          const didOwner: string = await contract.getDidOwner(i);
          if (!didOwner) continue;

          const { meta, price } = await parseMetadata(i);
          const effectivePrice = price > 0n ? price : (soldPriceByTokenId.get(i) ?? 0n);
          const { issuer: pIssuer, issuerName: pIssuerName } = extractIssuerFields(meta);
          const item: NFTItem = {
            tokenId: i,
            name: meta.name || `NFT #${i}`,
            description: meta.description || '',
            image: meta.image || '',
            price: ethers.formatEther(effectivePrice),
            priceWei: effectivePrice,
            didOwner,
            issuer: pIssuer,
            issuerName: pIssuerName,
            metadata: meta,
          };
          purchItems.push(item);
          didsToCheck.push(didOwner);
        } catch (e) { console.error(`NFT #${i} load error:`, e); }
      }

      // ── KYC compliance check ─────────────────────────────────────────
      if (kycContractAddress && kycContractABI && didsToCheck.length) {
        const kyc = new ethers.Contract(kycContractAddress, kycContractABI as ethers.InterfaceAbi, provider);
        for (const item of purchItems) {
          try {
            const [isCompliant, ts, expiry, , kycIss] = await kyc.checkCompliance(item.didOwner);
            item.isCompliant = Boolean(isCompliant);
            item.complianceTimestamp = Number(ts);
            item.kycExpiryTimestamp  = Number(expiry);
            item.kycIssuer = typeof kycIss === 'string' ? kycIss : '';
          } catch { /* skip */ }
        }
      }

      setPurchased(purchItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to load NFTs from blockchain');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAssetSuccess('');
    setError('');

    if (!contractAddress || !contractABI) {
      setError('Contract not configured');
      return;
    }

    const trimmedName = assetName.trim();
    const trimmedDescription = assetDescription.trim();
    const trimmedImage = assetImageUrl.trim();
    const trimmedType = assetType.trim();
    const trimmedPrice = assetPriceEth.trim();

    if (!trimmedName || !trimmedDescription || !trimmedImage || !trimmedPrice) {
      setError('Please fill name, description, image URL, and price');
      return;
    }

    let priceWei: bigint;
    try {
      priceWei = ethers.parseEther(trimmedPrice);
    } catch {
      setError('Invalid price format. Use a numeric ETH value (e.g. 0.75).');
      return;
    }

    if (priceWei <= 0n) {
      setError('Price must be greater than 0 ETH.');
      return;
    }

    try {
      setSubmittingAsset(true);
      const provider = new ethers.BrowserProvider((window as unknown as { ethereum: any }).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI as ethers.InterfaceAbi, signer);

      const metadata = {
        name: trimmedName,
        description: trimmedDescription,
        image: trimmedImage,
        issuer: issuerDid,
        issuer_name: issuerName,
        asset_type: trimmedType,
        attributes: [
          { trait_type: 'Asset Type', value: trimmedType || 'Unspecified' },
          { trait_type: 'Issuer', value: issuerName || issuerDid || 'Unknown Issuer' },
        ],
      };

      const tokenURI = `data:application/json;base64,${btoa(unescape(encodeURIComponent(JSON.stringify(metadata))))}`;

      const tx = await contract.mintNFT(tokenURI, priceWei);
      await tx.wait();

      setAssetName('');
      setAssetDescription('');
      setAssetImageUrl('');
      setAssetType('');
      setAssetPriceEth('');
      setAssetSuccess('Asset created and listed successfully.');
      await loadNFTs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Caller is not an authorized entity')) {
        setError('This wallet is not authorized to mint assets. Ask the contract owner to authorize it.');
      } else {
        setError('Failed to create asset: ' + msg);
      }
    } finally {
      setSubmittingAsset(false);
    }
  };

  // Sold assets should always be scoped to this issuer.
  const myPurchased = issuerDid
    ? purchased.filter(n => n.issuer === issuerDid)
    : purchased;

  // "Show all issuers" only affects available assets.
  const myAvailable = (showAllIssuers || !issuerDid)
    ? available
    : available.filter(n => n.issuer === issuerDid);

  if (!account) {
    return (
      <div className="issuer-manager" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <h2>Connect your wallet to view NFTs</h2>
        <button className="btn btn-gold" onClick={connectWallet}>Connect MetaMask</button>
      </div>
    );
  }

  return (
    <div className="issuer-manager">
      {/* Info bar */}
      <div className="issuer-info-bar">
        <span><strong>Issuer DID:</strong> {issuerDid || <em>not linked — showing all NFTs</em>}</span>
        <span><strong>Contract:</strong> {contractAddress.slice(0, 8)}…{contractAddress.slice(-4)}</span>
        <span><strong>Network:</strong> Localhost:8545</span>
        <span className="wallet-chip">
          Wallet: {account.slice(0, 6)}…{account.slice(-4)}
        </span>
      </div>

      {/* Action bar */}
      <div className="issuer-action-bar">
        <button className="btn btn-gold" onClick={loadNFTs} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showAllIssuers}
            onChange={e => setShowAllIssuers(e.target.checked)}
          />
          Show available assets from all issuers
        </label>
      </div>

      <section className="issuer-section">
        <h2>Add New Asset</h2>
        <p className="issuer-section-hint">
          Mint a new physical asset NFT to the bank inventory and list it for sale.
        </p>

        <form className="issuer-add-form" onSubmit={handleAddAsset}>
          <input
            className="issuer-input"
            type="text"
            placeholder="Asset name"
            value={assetName}
            onChange={e => setAssetName(e.target.value)}
            disabled={submittingAsset}
          />
          <input
            className="issuer-input"
            type="text"
            placeholder="Asset type (optional)"
            value={assetType}
            onChange={e => setAssetType(e.target.value)}
            disabled={submittingAsset}
          />
          <input
            className="issuer-input"
            type="url"
            placeholder="Image URL"
            value={assetImageUrl}
            onChange={e => setAssetImageUrl(e.target.value)}
            disabled={submittingAsset}
          />
          <input
            className="issuer-input"
            type="text"
            inputMode="decimal"
            placeholder="Price in ETH (e.g. 0.75)"
            value={assetPriceEth}
            onChange={e => setAssetPriceEth(e.target.value)}
            disabled={submittingAsset}
          />
          <textarea
            className="issuer-textarea"
            placeholder="Description"
            value={assetDescription}
            onChange={e => setAssetDescription(e.target.value)}
            rows={3}
            disabled={submittingAsset}
          />
          <button className="btn btn-gold" type="submit" disabled={submittingAsset}>
            {submittingAsset ? 'Creating…' : 'Create Asset'}
          </button>
        </form>

        {assetSuccess && <div className="success-bar">{assetSuccess}</div>}
      </section>

      {error && <div className="error-bar">{error}</div>}

      <div className="main-content">
        <div className={`nft-list-container ${selectedNFT ? 'with-detail' : ''}`}>
          {/* ── PURCHASED / SOLD NFTs ─────────────────────────────────────── */}
          <section className="issuer-section">
            <h2>
              Sold Assets ({myPurchased.length})
              {issuerDid && (
                <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                  — {issuerName}
                </span>
              )}
            </h2>
            <p className="issuer-section-hint">
              Physical assets that have been purchased and assigned to a user DID.
              Click any card to view details and manage physical delivery.
            </p>

            {loading && myPurchased.length === 0 ? (
              <div className="empty-state">Loading…</div>
            ) : myPurchased.length === 0 ? (
              <div className="empty-state">No sold assets yet.</div>
            ) : (
              <div className="nft-grid">
                {myPurchased.map(nft => (
                  <IssuedNFTCard
                    key={nft.tokenId}
                    nft={nft}
                    onClick={() => setSelectedNFT(nft)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── AVAILABLE / TO-BE-BOUGHT NFTs ────────────────────────────── */}
          <section className="issuer-section">
            <h2>
              Available Assets ({myAvailable.length})
              {!showAllIssuers && issuerDid && (
                <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                  — {issuerName}
                </span>
              )}
            </h2>
            <p className="issuer-section-hint">
              Assets listed for sale, awaiting a buyer. Sold via the bank portal.
            </p>

            {loading && myAvailable.length === 0 ? (
              <div className="empty-state">Loading…</div>
            ) : myAvailable.length === 0 ? (
              <div className="empty-state">No assets currently listed for sale.</div>
            ) : (
              <div className="nft-grid">
                {myAvailable.map(nft => (
                  <AvailableNFTCard
                    key={nft.tokenId}
                    nft={nft}
                    ethEurRate={ethEurRate}
                    onClick={() => setSelectedNFT(nft)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {selectedNFT && (
          <NFTDetailModal
            nft={selectedNFT}
            ethEurRate={ethEurRate}
            kycContractAddress={kycContractAddress}
            kycContractABI={kycContractABI}
            onClose={() => setSelectedNFT(null)}
          />
        )}
      </div>
    </div>
  );
}
