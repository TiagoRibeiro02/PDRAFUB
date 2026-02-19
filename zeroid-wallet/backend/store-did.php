<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$userId = $data['user_id'] ?? null;
$did = trim($data['did'] ?? '');
$publicKeyJwk = json_encode($data['public_key_jwk'] ?? null);
$ethAddress = trim($data['eth_address'] ?? '');

// Validation
if (empty($userId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'User ID is required']);
    exit();
}

if (empty($did)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'DID is required']);
    exit();
}

if (empty($publicKeyJwk) || $publicKeyJwk === 'null') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Public key is required']);
    exit();
}

if (empty($ethAddress)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ethereum address is required']);
    exit();
}

try {
    $conn = getDBConnection();
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, did FROM users WHERE id = :user_id");
    $stmt->execute(['user_id' => $userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }
    
    // Check if user already has a DID
    if (!empty($user['did'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User already has a DID']);
        exit();
    }
    
    // Update user with DID, public key, and Ethereum address
    $updateStmt = $conn->prepare("
        UPDATE users 
        SET did = :did, pk = :pk, eth_address = :eth_address 
        WHERE id = :user_id
    ");
    
    $updateStmt->execute([
        'did' => $did,
        'pk' => $publicKeyJwk,
        'eth_address' => $ethAddress,
        'user_id' => $userId
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'DID and Ethereum address stored successfully',
        'data' => [
            'did' => $did,
            'public_key_jwk' => json_decode($publicKeyJwk),
            'eth_address' => $ethAddress
        ]
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to store DID']);
}
