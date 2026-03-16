import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';
import type { EntityQRSession } from '../utils/qrAuth';
import UserPicker, { type BankUser } from './UserPicker';
import '../BankNFTManager.css';

interface QRModalProps {
  qrPayload: EntityQRSession['qrPayload'] | null;
  purchasingTokenId: number | null;
  purchasingPrice: bigint | null;
  bankApiUrl: string;
  manualDID: string;
  manualEthAddress: string;
  selectedBankUser: BankUser | null;
  onClose: () => void;
  onManualDIDChange: (value: string) => void;
  onManualEthAddressChange: (value: string) => void;
  onBankUserSelect: (user: BankUser | null) => void;
  onManualSubmit: () => void;
}

export default function QRModal({
  qrPayload,
  purchasingTokenId,
  purchasingPrice,
  bankApiUrl,
  manualDID,
  manualEthAddress,
  selectedBankUser,
  onClose,
  onManualDIDChange,
  onManualEthAddressChange,
  onBankUserSelect,
  onManualSubmit,
}: QRModalProps) {
  const canSubmit = manualDID.trim() && manualEthAddress.trim() && selectedBankUser !== null;

  return (
    <div className='ui-modal-overlay'>
      <div className='closeButtonDiv ui-modal-panel'>
        <button onClick={onClose} className='ui-modal-close'>
          ✕
        </button>
        <h3 className='titleStyle3Gold'>Purchase NFT for User</h3>
        <p className='scantext'>
          Scan with wallet or enter details manually
        </p>
        {purchasingTokenId !== null && (
          <p className='purchasenftgold'>
            Purchasing NFT #{purchasingTokenId}
            {purchasingPrice && ` for ${ethers.formatEther(purchasingPrice)} ETH`}
          </p>
        )}

        <div className='qrdiv'>
          <QRCodeSVG
            value={qrPayload ? JSON.stringify(qrPayload) : ''}
            size={200}
          />
        </div>

        {manualDID ? (
          <p className='responsereceived'>
            ✓ Wallet response received
          </p>
        ) : (
          <p className='waitingscan'>
            Waiting for wallet response…
          </p>
        )}

        <div className='inputdiv'>
          <h4 className='texth4'>Identity details:</h4>

          <input
            type="text"
            placeholder="User DID (e.g., did:zeroid: ...)"
            value={manualDID}
            onChange={(e) => onManualDIDChange(e.target.value)}
            className='didInput ui-input-dark'
          />

          {manualDID.trim() && (
            <input
              type="text"
              placeholder="Ethereum Address (0x...)"
              value={manualEthAddress}
              onChange={(e) => onManualEthAddressChange(e.target.value)}
              className='didInput ui-input-dark'
              style={{ marginTop: '0.5rem' }}
            />
          )}

          {/* Bank user picker */}
          <div style={{ marginTop: '1rem' }}>
            <UserPicker
              selectedUser={selectedBankUser}
              onSelect={onBankUserSelect}
              label="Select bank user to assign this NFT to"
              apiUrl={bankApiUrl}
            />
          </div>

          <button
            onClick={onManualSubmit}
            disabled={!canSubmit}
            className="ui-btn ui-btn-gold submitManual"
            style={{ marginTop: '1rem', opacity: canSubmit ? 1 : 0.5 }}
          >
            Confirm Purchase
          </button>
        </div>
      </div>
    </div>
  );
}
