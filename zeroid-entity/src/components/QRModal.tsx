import { ethers } from 'ethers';
import { QRCodeSVG } from 'qrcode.react';

interface QRModalProps {
  sessionId: string;
  purchasingTokenId: number | null;
  purchasingPrice: bigint | null;
  manualDID: string;
  manualEthAddress: string;
  onClose: () => void;
  onManualDIDChange: (value: string) => void;
  onManualEthAddressChange: (value: string) => void;
  onManualSubmit: () => void;
}

export default function QRModal({
  sessionId,
  purchasingTokenId,
  purchasingPrice,
  manualDID,
  manualEthAddress,
  onClose,
  onManualDIDChange,
  onManualEthAddressChange,
  onManualSubmit,
}: QRModalProps) {
  return (
    <div className='qRequestDiv'>
      <div className='closeButtonDiv'>
        <button onClick={onClose} className='closeButton'>
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
            value={JSON.stringify({ type: 'did-request', sessionId })}
            size={200}
          />
        </div>
        <p className='waitingscan'>
          Waiting for wallet response...
        </p>

        <div className='inputdiv'>
          <h4 className='texth4'>Or enter manually:</h4>

          <input
            type="text"
            placeholder="User DID (e.g., did:zeroid:...)"
            value={manualDID}
            onChange={(e) => onManualDIDChange(e.target.value)}
            className='didInput'
          />

          {manualDID.trim() && (
            <input
              type="text"
              placeholder="Ethereum Address (0x...)"
              value={manualEthAddress}
              onChange={(e) => onManualEthAddressChange(e.target.value)}
              className='didInput'
            />
          )}

          <button
            onClick={onManualSubmit}
            disabled={!manualDID.trim() || !manualEthAddress.trim()}
            className="buttonStyle submitManual"
          >
            Submit Manual Entry
          </button>
        </div>
      </div>
    </div>
  );
}
