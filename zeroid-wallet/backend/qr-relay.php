<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataFile = __DIR__ . '/qr-sessions.json';

// Initialize file if it doesn't exist
if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([]));
}

// Clean up old sessions (older than 5 minutes)
function cleanupOldSessions($data) {
    $now = time();
    foreach ($data as $sessionId => $session) {
        if ($now - $session['timestamp'] > 300) { // 5 minutes
            unset($data[$sessionId]);
        }
    }
    return $data;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Store a response
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['sessionId']) || !isset($input['did'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }
    
    $data = json_decode(file_get_contents($dataFile), true);
    $data = cleanupOldSessions($data);
    
    $data[$input['sessionId']] = [
        'did' => $input['did'],
        'ethAddress' => $input['ethAddress'] ?? null,
        'timestamp' => time()
    ];
    
    file_put_contents($dataFile, json_encode($data));
    
    echo json_encode(['success' => true]);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retrieve a response
    $sessionId = $_GET['sessionId'] ?? null;
    
    if (!$sessionId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing sessionId']);
        exit;
    }
    
    $data = json_decode(file_get_contents($dataFile), true);
    $data = cleanupOldSessions($data);
    
    if (isset($data[$sessionId])) {
        echo json_encode([
            'success' => true,
            'data' => $data[$sessionId]
        ]);
        
        // Remove the session after retrieval
        unset($data[$sessionId]);
        file_put_contents($dataFile, json_encode($data));
    } else {
        echo json_encode([
            'success' => false,
            'data' => null
        ]);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Clear a session
    $sessionId = $_GET['sessionId'] ?? null;
    
    if ($sessionId) {
        $data = json_decode(file_get_contents($dataFile), true);
        unset($data[$sessionId]);
        file_put_contents($dataFile, json_encode($data));
    }
    
    echo json_encode(['success' => true]);
}
?>
