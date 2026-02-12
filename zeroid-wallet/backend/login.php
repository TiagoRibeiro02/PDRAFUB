<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? 'client-first';
$username = trim($data['username'] ?? '');

// Validation
if (empty($username)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username is required']);
    exit();
}

try {
    $conn = getDBConnection();
    
    if ($action === 'client-first') {
        // Phase 1: SCRAM Client-First Message
        // Client sends: username, client_nonce
        
        $client_nonce = $data['client_nonce'] ?? '';
        
        if (empty($client_nonce)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Client nonce is required']);
            exit();
        }
        
        // Get user from database
        $stmt = $conn->prepare("
            SELECT id, token, scram_salt, scram_iterations
            FROM users 
            WHERE username = :username
        ");
        $stmt->execute(['username' => $username]);
        
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid username']);
            exit();
        }
        
        // Generate server nonce
        $server_nonce = bin2hex(random_bytes(16));
        $nonce = $client_nonce . $server_nonce;
        
        // Return server-first message
        echo json_encode([
            'success' => true,
            'data' => [
                'identifier' => $user['token'],
                'salt' => $user['scram_salt'],
                'iterations' => $user['scram_iterations'],
                'nonce' => $nonce,
                'server_nonce' => $server_nonce
            ]
        ]);
        
    } elseif ($action === 'client-final') {
        // Phase 2: SCRAM Client-Final Message
        // Client sends: client_proof, auth_message components
        
        $identifier = $data['identifier'] ?? '';
        $client_nonce = $data['client_nonce'] ?? '';
        $server_nonce = $data['server_nonce'] ?? '';
        $client_proof = $data['client_proof'] ?? '';
        
        if (empty($identifier) || empty($client_nonce) || empty($server_nonce) || empty($client_proof)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required parameters']);
            exit();
        }
        
        // Get user from database
        $stmt = $conn->prepare("
            SELECT id, username, did, pk, token, scram_salt, scram_iterations, scram_stored_key, scram_server_key
            FROM users 
            WHERE username = :username
        ");
        $stmt->execute(['username' => $username]);
        
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Authentication failed']);
            exit();
        }
        
        // Verify token matches identifier
        if ($user['token'] != $identifier) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid token']);
            exit();
        }
        
        // Reconstruct auth message
        $nonce = $client_nonce . $server_nonce;
        $client_first_bare = "n=" . $username . ",r=" . $client_nonce;
        $server_first = "r=" . $nonce . ",s=" . $user['scram_salt'] . ",i=" . $user['scram_iterations'];
        $client_final_without_proof = "c=biws,r=" . $nonce;
        $auth_message = $client_first_bare . "," . $server_first . "," . $client_final_without_proof;
        
        // Verify client proof
        // ClientSignature = HMAC(StoredKey, AuthMessage)
        $client_signature = hash_hmac('sha256', $auth_message, hex2bin($user['scram_stored_key']), true);
        
        // ClientKey = ClientProof XOR ClientSignature
        $client_proof_bin = hex2bin($client_proof);
        $client_key = $client_proof_bin ^ $client_signature;
        
        // Verify: StoredKey should equal SHA256(ClientKey)
        $computed_stored_key = hash('sha256', $client_key);
        
        if (!hash_equals($user['scram_stored_key'], $computed_stored_key)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Authentication failed']);
            exit();
        }
        
        // Generate server signature to prove server identity
        // ServerSignature = HMAC(ServerKey, AuthMessage)
        $server_signature = bin2hex(hash_hmac('sha256', $auth_message, hex2bin($user['scram_server_key']), true));
        
        // Authentication successful - increment token
        $newToken = $user['token'] + 1;
        $updateStmt = $conn->prepare("UPDATE users SET token = :token WHERE id = :id");
        $updateStmt->execute(['token' => $newToken, 'id' => $user['id']]);
        
        // Return success with user data and server signature
        echo json_encode([
            'success' => true,
            'message' => 'Authentication successful',
            'data' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'did' => $user['did'],
                'pk' => $user['pk'],
                'token' => $newToken,
                'server_signature' => $server_signature
            ]
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Authentication failed']);
}
