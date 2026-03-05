CREATE DATABASE IF NOT EXISTS zeroid_entity;
USE zeroid_entity;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL UNIQUE,
    sobrenome VARCHAR(64) NOT NULL,
    NIF INT NOT NULL,
    pk VARCHAR(255),
    eth_address VARCHAR(42),
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    kyc BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO users (nome, sobrenome, NIF, pk, balance, kyc) VALUES
('Alice', 'Smith', 123456789, NULL, 1000.00, FALSE),
('Bob', 'Johnson', 987654321, NULL, 500.00, FALSE);