CREATE DATABASE IF NOT EXISTS zeroid_wallet;
USE zeroid_wallet;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    scram_salt VARCHAR(64) NOT NULL,
    scram_iterations INT NOT NULL DEFAULT 4096,
    scram_stored_key VARCHAR(64) NOT NULL,
    scram_server_key VARCHAR(64) NOT NULL,
    did VARCHAR(255) UNIQUE,
    pk VARCHAR(255),
    token INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);