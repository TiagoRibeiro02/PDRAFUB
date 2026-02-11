<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';
$did = $data['did'] ?? '';
$pk = $data['pk'] ?? '';

// Validation
if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and password are required']);
    exit();
}

if (strlen($username) < 3) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username must be at least 3 characters']);
    exit();
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
    exit();
}

try {
    $conn = getDBConnection();
    
    // Check if username already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = :username");
    $stmt->execute(['username' => $username]);
    
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit();
    }
    
    // Generate salt and hash password
    $salt = bin2hex(random_bytes(16));
    $password_hash = hash('sha256', $salt . $password);
    
    // Generate DID and PK if not provided
    if (empty($did)) {
        $did = 'did:zeroid:' . bin2hex(random_bytes(32));
    }
    if (empty($pk)) {
        $pk = bin2hex(random_bytes(32));
    }
    
    // Insert user
    $stmt = $conn->prepare("
        INSERT INTO users (username, password_hash, salt, did, pk) 
        VALUES (:username, :password_hash, :salt, :did, :pk)
    ");
    
    $stmt->execute([
        'username' => $username,
        'password_hash' => $password_hash,
        'salt' => $salt,
        'did' => $did,
        'pk' => $pk
    ]);
    
    $userId = $conn->lastInsertId();
    
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'User registered successfully',
        'data' => [
            'id' => $userId,
            'username' => $username,
            'did' => $did
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
}
