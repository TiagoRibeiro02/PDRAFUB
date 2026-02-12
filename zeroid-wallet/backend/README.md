# ZeroID Wallet Backend

PHP backend for user authentication and registration.

## Setup

### 1. Prerequisites
- PHP 7.4 or higher
- MySQL 5.7 or higher
- Apache/Nginx web server (or PHP built-in server for development)

### 2. Database Setup

Create the database and table:

```bash
mysql -u root -p < ../db.sql
```

Or manually execute the SQL commands in `db.sql`.

### 3. Configure Database Connection

Edit `db.php` if needed to match your database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'zeroid_wallet');
```

### 4. Start the Server

#### Option A: Using Apache/Nginx
- Place the project in your web server's document root
- Make sure the backend folder is accessible at `http://localhost/zeroid-wallet/backend/`

#### Option B: Using PHP Built-in Server (Development Only)
```bash
cd /home/tiago/Documents/GitHub/PDRAFUB/zeroid-wallet/backend
php -S localhost:8000
```

Then update the frontend fetch URLs to use `http://localhost:8000/` instead.

### 5. Test the Endpoints

#### Register
```bash
curl -X POST http://localhost/zeroid-wallet/backend/register.php \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

#### Login (SCRAM-SHA-256 Authentication)

The login uses SCRAM-SHA-256 (Salted Challenge Response Authentication Mechanism) in two phases:

**Phase 1: Client-First Message**
```bash
curl -X POST http://localhost/zeroid-wallet/backend/login.php \
  -H "Content-Type: application/json" \
  -d '{"action":"client-first","username":"testuser","client_nonce":"random_nonce"}'
```

**Phase 2: Client-Final Message**
```bash
# Client computes: SaltedPassword = PBKDF2(password, salt, iterations)
# ClientKey = HMAC(SaltedPassword, "Client Key")
# StoredKey = SHA256(ClientKey)
# ClientSignature = HMAC(StoredKey, AuthMessage)
# ClientProof = ClientKey XOR ClientSignature
# NO PASSWORD IS TRANSMITTED!
curl -X POST http://localhost/zeroid-wallet/backend/login.php \
  -H "Content-Type: application/json" \
  -d '{"action":"client-final","username":"testuser","identifier":"12345","client_nonce":"...","server_nonce":"...","client_proof":"..."}'
```

## API Endpoints

### POST /register.php
Register a new user.

**Request:**
```json
{
  "username": "string (min 3 chars)",
  "password": "string (min 6 chars)",
  "did": "string (optional)",
  "pk": "string (optional)"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "username": "testuser",
    "token": 12345
  }
}
```

### POST /login.php
Authenticate a user using SCRAM-SHA-256 (Salted Challenge Response Authentication Mechanism).

#### Phase 1: Client-First Message

**Request:**
```json
{
  "action": "client-first",
  "username": "string",
  "client_nonce": "random_string"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "identifier": 12345,
    "salt": "hexadecimal_string",
    "iterations": 4096,
    "nonce": "combined_nonce",
    "server_nonce": "server_random_string"
  }
}
```

#### Phase 2: Client-Final Message

The client must compute:
1. `SaltedPassword = PBKDF2(password, salt, iterations)`
2. `ClientKey = HMAC(SaltedPassword, "Client Key")`
3. `StoredKey = SHA256(ClientKey)`
4. `ClientSignature = HMAC(StoredKey, AuthMessage)`
5. `ClientProof = ClientKey XOR ClientSignature`

**Important:** The password is NEVER transmitted over the network!

**Request:**
```json
{
  "action": "client-final",
  "username": "string",
  "identifier": 12345,
  "client_nonce": "string",
  "server_nonce": "string",
  "client_proof": "hexadecimal_string"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "id": 1,
    "username": "testuser",
    "did": "did:zeroid:...",
    "pk": "public_key_hex",
    "token": 12346,
    "server_signature": "hexadecimal_string"
  }
}
```

**Note:** 
- After successful authentication, the user's token is incremented by 1
- The `server_signature` allows the client to verify the server's identity (mutual authentication)
- Client should verify server_signature = HMAC(ServerKey, AuthMessage)

## Security Notes

- Passwords are hashed using Argon2id for secure storage
- SCRAM-SHA-256 authentication prevents password transmission over the network
- Provides mutual authentication (client verifies server, server verifies client)
- Uses PBKDF2 with 4096 iterations for key derivation
- Random salt per user prevents rainbow table attacks
- The token (identifier) is incremented after each successful authentication
- CORS is enabled for development (restrict in production)
- Use HTTPS in production
- Consider implementing JWT tokens for session management
- Add rate limiting for production use
