<?php
/**
 * bank2_api.php  –  Bank2 user-lookup API
 *
 * Served at: http://localhost:8004/bank2_api.php
 * (registered in zeroid_entity.entities.API for the Bank2 entity)
 *
 * GET  ?action=search&q=<query>   → search bank2 users by name or NIF
 * GET  ?action=get&id=<id>        → fetch a single bank2 user by id
 * POST { action:"set_kyc", userId:<id> } → mark a bank2 user as KYC-verified
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/bank2_db.php';

// ── GET ───────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'search';

    // ── search ────────────────────────────────────────────────────────────────
    if ($action === 'search') {
        $q    = trim($_GET['q'] ?? '');
        $conn = getBank2DBConnection();

        if ($q === '') {
            $stmt = $conn->query(
                'SELECT id, nome, sobrenome, NIF, balance, kyc
                 FROM users
                 ORDER BY nome
                 LIMIT 50'
            );
        } else {
            $like = '%' . $q . '%';
            $stmt = $conn->prepare(
                'SELECT id, nome, sobrenome, NIF, balance, kyc
                 FROM users
                 WHERE nome LIKE ? OR sobrenome LIKE ? OR CAST(NIF AS CHAR) LIKE ?
                 ORDER BY nome
                 LIMIT 20'
            );
            $stmt->execute([$like, $like, $like]);
        }

        $users = $stmt->fetchAll();
        foreach ($users as &$u) {
            $u['id']      = (int)   $u['id'];
            $u['NIF']     = (int)   $u['NIF'];
            $u['balance'] = (float) $u['balance'];
            $u['kyc']     = (bool)  $u['kyc'];
        }

        echo json_encode(['success' => true, 'users' => $users]);
        exit();
    }

    // ── get single user ───────────────────────────────────────────────────────
    if ($action === 'get') {
        $id   = (int) ($_GET['id'] ?? 0);
        $nif  = (int) ($_GET['nif'] ?? 0);

        if (!$id && !$nif) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'id or nif is required']);
            exit();
        }

        $conn = getBank2DBConnection();

        if ($id) {
            $stmt = $conn->prepare(
                'SELECT id, nome, sobrenome, NIF, balance, kyc FROM users WHERE id = ?'
            );
            $stmt->execute([$id]);
        } else {
            $stmt = $conn->prepare(
                'SELECT id, nome, sobrenome, NIF, balance, kyc FROM users WHERE NIF = ?'
            );
            $stmt->execute([$nif]);
        }

        $user = $stmt->fetch();

        if (!$user) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit();
        }

        $user['id']      = (int)   $user['id'];
        $user['NIF']     = (int)   $user['NIF'];
        $user['balance'] = (float) $user['balance'];
        $user['kyc']     = (bool)  $user['kyc'];

        echo json_encode(['success' => true, 'user' => $user]);
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

    // ── set_kyc ───────────────────────────────────────────────────────────────
    if ($action === 'set_kyc') {
        $userId = (int) ($input['userId'] ?? 0);

        if (!$userId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'userId is required']);
            exit();
        }

        $conn = getBank2DBConnection();
        $stmt = $conn->prepare('UPDATE users SET kyc = TRUE WHERE id = ?');
        $stmt->execute([$userId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found in bank2']);
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
