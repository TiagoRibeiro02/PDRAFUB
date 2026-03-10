<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

define('BANK1_DB_HOST', 'localhost');
define('BANK1_DB_USER', 'root');
define('BANK1_DB_PASS', 'admin');
define('BANK1_DB_NAME', 'bank1');

function getBank1DBConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . BANK1_DB_HOST . ";dbname=" . BANK1_DB_NAME . ";charset=utf8mb4",
            BANK1_DB_USER,
            BANK1_DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
        return $conn;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Bank1 database connection failed']);
        exit();
    }
}
