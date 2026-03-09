<?php
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$userId = (int) ($_GET['user_id'] ?? 0);

if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'user_id is required']);
    exit();
}

try {
    $conn = getDBConnection();

    $stmt = $conn->prepare("
        SELECT u.id, u.username, u.entity_id,
               e.name  AS entity_name,
               e.did   AS entity_did,
               e.eth_address AS entity_eth_address,
               e.API   AS entity_api
        FROM users u
        LEFT JOIN entities e ON e.id = u.entity_id
        WHERE u.id = :id
    ");
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        exit();
    }

    echo json_encode(['success' => true, 'data' => $user]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
