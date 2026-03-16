<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

define('BANK2_DB_HOST', 'localhost');
define('BANK2_DB_USER', 'root');
define('BANK2_DB_PASS', 'admin');
define('BANK2_DB_NAME', 'bank2');

function getBank2DBConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . BANK2_DB_HOST . ";dbname=" . BANK2_DB_NAME . ";charset=utf8mb4",
            BANK2_DB_USER,
            BANK2_DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        return $conn;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Bank2 database connection failed']);
        exit();
    }
}
