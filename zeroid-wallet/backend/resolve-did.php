<?php
/**
 * DID resolver — returns the authoritative public key JWK and registered
 * Ethereum address for a given DID.
 *
 * GET /resolve-did.php?did=did:zeroid:<uuid>
 *
 * Response (success):
 *   { "success": true, "publicKeyJwk": { ... }, "ethAddress": "0x..." }
 *
 * Response (not found):
 *   { "success": false, "message": "DID not found" }
 *
 * The ethAddress is returned so verifiers can confirm the signing wallet's
 * registered address matches what appears in the signed payload, preventing
 * a legitimate user from redirecting assets to an unregistered address.
 */

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$did = trim($_GET['did'] ?? '');

if (empty($did) || !str_starts_with($did, 'did:')) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing or invalid DID parameter']);
    exit();
}

try {
    $conn = getDBConnection();

    $stmt = $conn->prepare("SELECT pk, eth_address FROM users WHERE did = :did LIMIT 1");
    $stmt->execute(['did' => $did]);
    $row = $stmt->fetch();

    if (!$row || empty($row['pk'])) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'DID not found']);
        exit();
    }

    $publicKeyJwk = json_decode($row['pk'], true);
    if (!$publicKeyJwk) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Stored public key is malformed']);
        exit();
    }

    // Emit ONLY the public key — never leak private fields
    unset($publicKeyJwk['d']);

    echo json_encode([
        'success'      => true,
        'publicKeyJwk' => $publicKeyJwk,
        'ethAddress'   => $row['eth_address'],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error during DID resolution']);
}
