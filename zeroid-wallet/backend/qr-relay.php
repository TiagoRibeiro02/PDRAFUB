<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$dataFile   = __DIR__ . '/qr-sessions.json';
$entityFile = __DIR__ . '/qr-entity-sessions.json';

// Initialize files if they don't exist
if (!file_exists($dataFile))   file_put_contents($dataFile,   json_encode([]));
if (!file_exists($entityFile)) file_put_contents($entityFile, json_encode([]));

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

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Entity registers its ephemeral public key for this session.
    // The wallet will cross-check this when verifying the QR code.
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['sessionId']) || !isset($input['entityPublicKey']) ||
        !isset($input['entitySignature']) || !isset($input['sessionTimestamp'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    $entityData = json_decode(file_get_contents($entityFile), true);
    $entityData = cleanupOldSessions($entityData);

    // Do not overwrite an existing registration (prevent hijack)
    if (isset($entityData[$input['sessionId']])) {
        http_response_code(409);
        echo json_encode(['error' => 'Session already registered']);
        exit;
    }

    $entityData[$input['sessionId']] = [
        'entityPublicKey'  => $input['entityPublicKey'],
        'entitySignature'  => $input['entitySignature'],
        'sessionTimestamp' => $input['sessionTimestamp'],
        'timestamp'        => time(),
    ];

    file_put_contents($entityFile, json_encode($entityData));
    echo json_encode(['success' => true]);

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Store a response
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['sessionId']) || !isset($input['did']) || !isset($input['signature'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields (sessionId, did, signature)']);
        exit;
    }
    
    $data = json_decode(file_get_contents($dataFile), true);
    $data = cleanupOldSessions($data);
    
    $data[$input['sessionId']] = [
        'did'         => $input['did'],
        'ethAddress'  => $input['ethAddress']  ?? null,
        'pk'          => $input['pk']          ?? null,
        'didDocument' => $input['didDocument'] ?? null,
        'signature'   => $input['signature'],
        'signedData'  => $input['signedData']  ?? null,
        'timestamp'   => time()
    ];
    
    file_put_contents($dataFile, json_encode($data));
    
    echo json_encode(['success' => true]);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Two modes:
    //   ?sessionId=X            → entity polls for wallet response (consumes entry)
    //   ?sessionId=X&verify=1   → wallet cross-checks entity public key (does NOT consume)
    $sessionId = $_GET['sessionId'] ?? null;
    $verify    = isset($_GET['verify']) && $_GET['verify'] === '1';

    if (!$sessionId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing sessionId']);
        exit;
    }

    if ($verify) {
        // Return entity registration data for wallet cross-validation
        $entityData = json_decode(file_get_contents($entityFile), true);
        $entityData = cleanupOldSessions($entityData);

        if (isset($entityData[$sessionId])) {
            echo json_encode([
                'success'         => true,
                'entityPublicKey' => $entityData[$sessionId]['entityPublicKey'],
            ]);
        } else {
            echo json_encode(['success' => false, 'entityPublicKey' => null]);
        }
    } else {
        // Entity polls for wallet response
        $data = json_decode(file_get_contents($dataFile), true);
        $data = cleanupOldSessions($data);

        if (isset($data[$sessionId])) {
            echo json_encode([
                'success' => true,
                'data'    => $data[$sessionId]
            ]);

            // Consume wallet response and entity registration together
            unset($data[$sessionId]);
            file_put_contents($dataFile, json_encode($data));

            $entityData = json_decode(file_get_contents($entityFile), true);
            unset($entityData[$sessionId]);
            file_put_contents($entityFile, json_encode($entityData));
        } else {
            echo json_encode(['success' => false, 'data' => null]);
        }
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
