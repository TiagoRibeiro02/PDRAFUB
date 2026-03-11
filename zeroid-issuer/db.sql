-- ZeroID Issuer database schema

CREATE DATABASE IF NOT EXISTS zeroid_issuer;
USE zeroid_issuer;

CREATE TABLE IF NOT EXISTS issuers (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL UNIQUE,
    did         VARCHAR(255) UNIQUE,
    eth_address VARCHAR(42)  UNIQUE
);


INSERT INTO issuers (name, did, eth_address) VALUES
('Diamond House', 'did:zeroid:diamond-house', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'),
('Gem Gallery',   'did:zeroid:gem-gallery',   '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');


CREATE TABLE IF NOT EXISTS users (
    id                 INT PRIMARY KEY AUTO_INCREMENT,
    username           VARCHAR(255) NOT NULL UNIQUE,
    scram_salt         VARCHAR(64)  NOT NULL,
    scram_iterations   INT          NOT NULL DEFAULT 4096,
    scram_stored_key   VARCHAR(64)  NOT NULL,
    scram_server_key   VARCHAR(64)  NOT NULL,
    token              INT          NOT NULL,
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    issuer_id          INT,
    FOREIGN KEY (issuer_id) REFERENCES issuers(id) ON DELETE SET NULL
);
