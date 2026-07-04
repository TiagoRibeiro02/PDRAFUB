# ProVerif models for zeroid-wallet

This folder contains an abstract ProVerif model for the security-critical flows in `zeroid-wallet`.

## Covered protocols

- SCRAM-SHA-256 login between the wallet client and the backend.
- QR-based DID sharing flow from the wallet side, including QR validation, signing, and encrypted relay submission.

## Modeling assumptions

- PBKDF2, HMAC-SHA-256, AES-GCM, and ECDSA are modeled as ideal cryptographic constructors/destructors.
- The QR secret is modeled as a local channel between the entity and the wallet, so relay attackers only see the ciphertext.
- Timestamp freshness is abstracted through fresh session values and equality checks on the session data.
- The wallet's ECDSA private key is modeled as a private name and the public key is derived with `pk(...)`.

## File

- [zeroid_wallet.pv](zeroid_wallet.pv)

## Suggested checks

- Authentication correspondence for SCRAM.
- Integrity of the QR submission: the entity only accepts a response that matches the generated session and challenge.
- Secrecy of the SCRAM password.
