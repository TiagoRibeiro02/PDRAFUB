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
$token    = random_int(10, 999999);

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

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
    exit();
}

try {
    $conn = getDBConnection();

    $stmt = $conn->prepare("SELECT id FROM users WHERE username = :username");
    $stmt->execute(['username' => $username]);

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        exit();
    }

    $scram_salt       = bin2hex(random_bytes(16));
    $scram_iterations = 4096;

    $salted_password = hash_pbkdf2('sha256', $password, hex2bin($scram_salt), $scram_iterations, 32, true);
    $client_key      = hash_hmac('sha256', 'Client Key', $salted_password, true);
    $stored_key      = hash('sha256', $client_key);
    $server_key      = bin2hex(hash_hmac('sha256', 'Server Key', $salted_password, true));

    $stmt = $conn->prepare("
        INSERT INTO users (username, scram_salt, scram_iterations, scram_stored_key, scram_server_key, token)
        VALUES (:username, :scram_salt, :scram_iterations, :scram_stored_key, :scram_server_key, :token)
    ");

    $stmt->execute([
        'username'         => $username,
        'scram_salt'       => $scram_salt,
        'scram_iterations' => $scram_iterations,
        'scram_stored_key' => $stored_key,
        'scram_server_key' => $server_key,
        'token'            => $token,
    ]);

    $userId = $conn->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'User registered successfully',
        'data' => [
            'id'       => $userId,
            'username' => $username,
            'token'    => $token
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
}
