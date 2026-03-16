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

INSERT INTO users (username, scram_salt, scram_iterations, scram_stored_key, scram_server_key, token, issuer_id) VALUES
('issuer1', '8b10b9d1d204c725c7af80028de99f4f', 4096, '58d85c9de34027f21c29bf0c6f8fb8a34b02501dab3594f9398fbe51468e3886', 'c7c00d8cfb38a1566050e8748df972134a33541e1a9dfc62b21eadc6780b563e', 666711, 1),
('issuer2', '7fa421788e33cfab1523c46cf5075830', 4096, '5e9affdef72fa0389bfe441f06960f42732c5082f67a2840088407f29a572f33', 'bb7a4060f920d4a08d88c15676e12cf41f03ac1a8422f64f81bfec1c9d4c7dfa', 191545, 2);
