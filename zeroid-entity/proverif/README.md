# ProVerif models for zeroid-entity

This folder contains an abstract ProVerif model for the security-critical flows in `zeroid-entity`.

## Covered protocols

- SCRAM-SHA-256 login between the client and the entity backend.
- QR-based DID sharing flow, including session binding, local QR secret handling, relay encryption, and signature verification.

## Modeling assumptions

- PBKDF2, HMAC-SHA-256, AES-GCM, and ECDSA are modeled as ideal cryptographic constructors/destructors.
- The QR secret is modeled as a local channel between the entity and the wallet, so relay attackers only see the ciphertext.
- Timestamp freshness is abstracted through fresh session values and equality checks on the session data.
- The wallet's ECDSA private key is modeled as a private name and the public key is derived with `pk(...)`.

## File

- [zeroid_entity.pv](zeroid_entity.pv)

## Suggested checks

- Authentication correspondence for SCRAM.
- Integrity of the QR response: the entity only accepts a wallet response that matches the generated session and challenge.
- Secrecy of the SCRAM password.
