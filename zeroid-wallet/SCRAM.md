# SCRAM-SHA-256 Authentication

This project implements **SCRAM-SHA-256** (Salted Challenge Response Authentication Mechanism) for secure user authentication.

## Why SCRAM instead of CHAP?

SCRAM-SHA-256 provides several advantages over CHAP:

### Security Benefits

1. **Mutual Authentication**: Both client and server verify each other's identity
   - Client verifies server through `server_signature`
   - Protects against man-in-the-middle attacks

2. **Salted Key Derivation**: Uses PBKDF2 with per-user salts
   - Prevents rainbow table attacks
   - Makes pre-computation attacks infeasible

3. **Configurable Iterations**: PBKDF2 with 4096 iterations (configurable)
   - Increases computational cost for attackers
   - Can be increased over time as hardware improves

4. **Industry Standard**: Used by many systems
   - MongoDB
   - LDAP
   - XMPP
   - PostgreSQL

5. **No Password Transmission**: Password never sent over network
   - Even during initial authentication
   - Only cryptographic proofs are exchanged

## How SCRAM Works

### Registration
1. Server generates random salt
2. Computes derived keys:
   ```
   SaltedPassword = PBKDF2(password, salt, 4096)
   ClientKey = HMAC(SaltedPassword, "Client Key")
   StoredKey = SHA256(ClientKey)
   ServerKey = HMAC(SaltedPassword, "Server Key")
   ```
3. Stores: `salt`, `iterations`, `StoredKey`, `ServerKey`

### Authentication (2 phases)

#### Phase 1: Client-First Message
- Client sends: `username`, `client_nonce`
- Server responds: `salt`, `iterations`, `server_nonce`, `identifier` (token)

#### Phase 2: Client-Final Message
- Client computes:
  ```
  SaltedPassword = PBKDF2(password, salt, iterations)
  ClientKey = HMAC(SaltedPassword, "Client Key")
  StoredKey = SHA256(ClientKey)
  ClientSignature = HMAC(StoredKey, AuthMessage)
  ClientProof = ClientKey XOR ClientSignature
  ```
- Client sends: `client_proof`
- Server verifies proof and responds with: `server_signature`
- Client verifies server signature (mutual authentication)

### Token Management
- Each user has a `token` that acts as an identifier
- Token increments by 1 after each successful authentication
- Provides replay attack protection when combined with nonces

## Implementation Details

### Server-Side (PHP)
- [register.php](backend/register.php): Generates SCRAM credentials during registration
- [login.php](backend/login.php): Implements 2-phase SCRAM authentication
- Database stores: `scram_salt`, `scram_iterations`, `scram_stored_key`, `scram_server_key`

### Client-Side (TypeScript)
- [scram.ts](src/utils/scram.ts): SCRAM utility functions using Web Crypto API
- [login.tsx](src/login.tsx): Implements SCRAM client flow with mutual authentication

## Security Considerations

1. **Always use HTTPS in production** - While SCRAM doesn't transmit passwords, HTTPS provides additional security layers

2. **Rate limiting** - Implement rate limiting to prevent brute force attacks

3. **Strong passwords** - SCRAM is secure, but weak passwords can still be compromised

4. **Nonce uniqueness** - Client nonces should be random and unique per authentication attempt

5. **Token management** - The incrementing token provides additional protection against replay attacks

## References

- [RFC 5802 - SCRAM-SHA-1](https://tools.ietf.org/html/rfc5802)
- [RFC 7677 - SCRAM-SHA-256](https://tools.ietf.org/html/rfc7677)
- [SCRAM Wikipedia](https://en.wikipedia.org/wiki/Salted_Challenge_Response_Authentication_Mechanism)
