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

#### Login
```bash
curl -X POST http://localhost/zeroid-wallet/backend/login.php \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
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
    "did": "did:zeroid:..."
  }
}
```

### POST /login.php
Authenticate a user.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "username": "testuser",
    "did": "did:zeroid:...",
    "pk": "public_key_hex"
  }
}
```

## Security Notes

- Passwords are hashed using SHA-256 with a random salt
- CORS is enabled for development (restrict in production)
- Use HTTPS in production
- Consider implementing JWT tokens for session management
- Add rate limiting for production use
