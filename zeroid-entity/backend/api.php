<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

// ── GET ───────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'search';

    if ($action === 'search') {
        $q = trim($_GET['q'] ?? '');
        $conn = getDBConnection();

        if ($q === '') {
            $stmt = $conn->query('SELECT id, nome, sobrenome, NIF, pk, balance, kyc FROM users ORDER BY nome LIMIT 50');
        } else {
            $like = '%' . $q . '%';
            $stmt = $conn->prepare(
                'SELECT id, nome, sobrenome, NIF, pk, balance, kyc
                 FROM users
                 WHERE nome LIKE ? OR sobrenome LIKE ? OR CAST(NIF AS CHAR) LIKE ?
                 ORDER BY nome LIMIT 20'
            );
            $stmt->execute([$like, $like, $like]);
        }

        $users = $stmt->fetchAll();
        foreach ($users as &$u) {
            $u['id']      = (int) $u['id'];
            $u['NIF']     = (int) $u['NIF'];
            $u['balance'] = (float) $u['balance'];
            $u['kyc']     = (bool) $u['kyc'];
        }
        echo json_encode(['success' => true, 'users' => $users]);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unknown action']);
    exit();
}

// ── POST ──────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input  = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    // Link a DID (and optionally an ethAddress) to a bank user.
    // If pk is already set it must match — prevents reassignment.
    if ($action === 'link_did') {
        $userId    = (int) ($input['userId']    ?? 0);
        $publicKey = trim($input['publicKey']   ?? '');

        if (!$userId || !$publicKey) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'userId and publicKey are required']);
            exit();
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare('SELECT pk FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit();
        }

        if ($row['pk'] !== null && $row['pk'] !== $publicKey) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'User already has a different public key linked']);
            exit();
        }

        $stmt = $conn->prepare('UPDATE users SET pk = ? WHERE id = ?');
        $stmt->execute([$publicKey, $userId]);
        echo json_encode(['success' => true, 'firstTime' => $row['pk'] === null]);
        exit();
    }

    // Mark a bank user as KYC-verified.
    if ($action === 'set_kyc') {
        $userId = (int) ($input['userId'] ?? 0);

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'userId is required']);
            exit();
        }

        $conn = getDBConnection();
        $stmt = $conn->prepare('UPDATE users SET kyc = TRUE WHERE id = ?');
        $stmt->execute([$userId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit();
        }

        echo json_encode(['success' => true]);
        exit();
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unknown action']);
    exit();
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
