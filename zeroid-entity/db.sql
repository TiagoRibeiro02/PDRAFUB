CREATE DATABASE IF NOT EXISTS zeroid_entity;
USE zeroid_entity;


CREATE TABLE IF NOT EXISTS entities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    did VARCHAR(255) UNIQUE,
    eth_address VARCHAR(42) UNIQUE,
    API VARCHAR(255) UNIQUE
);

INSERT INTO entities (name, did, eth_address, API) VALUES
('Bank1', 'did:zeroid:bank1', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 'http://localhost:8002/bank1_api.php'),
('Bank2', 'did:zeroid:bank2', '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 'http://localhost:8004/bank2_api.php');

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    scram_salt VARCHAR(64) NOT NULL,
    scram_iterations INT NOT NULL DEFAULT 4096,
    scram_stored_key VARCHAR(64) NOT NULL,
    scram_server_key VARCHAR(64) NOT NULL,
    token INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entity_id INT,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);



CREATE DATABASE IF NOT EXISTS bank1;
USE bank1;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL UNIQUE,
    sobrenome VARCHAR(64) NOT NULL,
    NIF INT NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    kyc BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO users (nome, sobrenome, NIF, balance, kyc) VALUES
('Alice', 'Smith', 123456789, 1000.00, FALSE),
('Bob', 'Johnson', 987654321, 500.00, FALSE);

CREATE DATABASE IF NOT EXISTS bank2;
USE bank2;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL UNIQUE,
    sobrenome VARCHAR(64) NOT NULL,
    NIF INT NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    kyc BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO users (nome, sobrenome, NIF, balance, kyc) VALUES
('Charlie', 'Smith', 123456789, 1000.00, FALSE),
('David', 'Johnson', 987654321, 500.00, FALSE);