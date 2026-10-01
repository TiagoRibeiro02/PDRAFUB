<h1 align="center">Decentralised Platform for the Traceability of Physical Assets Using Blockchain</h1>

<div align="center">
  <img src="https://img.shields.io/badge/Blockchain-Traceability-0D9488?style=for-the-badge&logo=ethereum&logoColor=white" alt="Blockchain Traceability" />
  <img src="https://img.shields.io/badge/Identity-KYC%2FAML-8B5CF6?style=for-the-badge" alt="KYC AML" />
  <img src="https://img.shields.io/badge/Privacy-ZK%20Proofs-F59E0B?style=for-the-badge" alt="Zero knowledge proofs" />
</div>

<p align="center">
  <strong>Decentralised Platform for the Traceability of Physical Assets Using Blockchain</strong> is a decentralised platform for tracking high-value physical assets while preserving privacy and supporting regulatory compliance.
</p>

High-value physical assets require reliable traceability to prevent counterfeiting, fraud, and illicit trade while ensuring transparent ownership throughout their lifecycle. At the same time, regulatory frameworks such as KYC, AML, and GDPR require identity verification and privacy protection, creating a challenge for blockchain-based traceability systems. Existing solutions often address traceability, digital identity, or privacy in isolation, but there is still a clear gap for a framework that combines asset traceability, regulatory compliance, and privacy preservation in a single model.

This project proposes that approach by combining trusted financial institutions, off-chain KYC/AML verification, and Zero-Knowledge Proofs (ZKPs) that certify compliance without exposing personal information. Once verified, users receive a Decentralised Identifier (DID) that acts as a privacy-preserving identity linked to blockchain-based asset ownership. Smart contracts then publicly validate these proofs, while physical assets are represented as Non-Fungible Tokens (NFTs), enabling transparent and auditable ownership records without exposing sensitive user data.

The repository contains a functional prototype with a decentralised wallet, institution dashboard, issuer dashboard, and Ethereum smart contracts supporting proof generation, verification, and asset management. It is designed to demonstrate how privacy-preserving regulatory compliance can coexist with secure and auditable traceability for high-value physical assets.

---

## Why this project matters

This project explores a real-world problem: how to make asset ownership traceable without exposing personal data.

The platform combines:

- 🏷️ asset traceability through blockchain-backed NFTs
- 🧾 regulatory compliance through KYC/AML processes
- 🔒 privacy protection through zero-knowledge proofs
- 🆔 identity management using DIDs
- 📊 transparent and auditable ownership records

The result is a prototype that shows how blockchain can support trust and traceability in sensitive domains such as luxury goods, regulated assets, and identity-linked physical ownership.

---

## Platform overview

### 💡 Core idea

Different actors in the ecosystem interact with the same system in different ways:

- a user manages their wallet and identity
- a financial institution verifies compliance off-chain
- an issuer handles trusted credential processes
- a third party can verify ownership and compliance without seeing sensitive personal data
- the blockchain stores the public proof and the asset state

This turns the project into a decentralised ecosystem rather than a single app.

---

## Repository map

```text
PDRAFUB/
├── README.md
├── start-all.sh
├── package.json
├── nfts/
│   ├── contracts/
│   ├── frontend/
│   ├── scripts/
│   ├── test/
│   └── ...
├── zeroid-wallet/
│   ├── src/
│   ├── backend/
│   ├── public/
│   ├── db.sql
│   └── ...
├── zeroid-entity/
│   ├── src/
│   ├── backend/
│   ├── public/
│   ├── db.sql
│   └── ...
├── zeroid-issuer/
│   ├── src/
│   ├── backend/
│   ├── db.sql
│   └── ...
├── zeroid-3P/
│   ├── src/
│   ├── public/
│   └── ...
├── performance-experiments/
│   ├── charts/
│   ├── fflonk/
│   ├── halo2/
│   ├── noir/
│   ├── plonk/
│   └── ...
├── lib/
│   ├── forge-std/
│   └── openzeppelin-contracts/
└── ...
```

---

## Where each part fits

### 🪙 `nfts/`
The blockchain core of the project.

This folder contains the smart contracts, local deployment scripts, tests, and the NFT-related frontend. It is the main place for everything tied to blockchain asset management.

### 👛 `zeroid-wallet/`
The user-facing wallet experience.

This is where people interact with their digital identity and asset-linked records in a practical and accessible way.

### 🏢 `zeroid-entity/`
The institutional or organisational side.

This area supports entity-level workflows, compliance processes, and administrative interactions in the ecosystem.

### 🏦 `zeroid-issuer/`
The issuing and verification side.

This part is focused on trusted credential issuance and the identity flow behind compliance validation.

### 🔍 `zeroid-3P/`
The third-party viewer.

This is designed for read-only verification so external parties can check asset or compliance status without accessing private user data.

### 📈 `performance-experiments/`
Benchmarking and proof-system analysis.

This folder contains experiments around performance, gas costs, and zero-knowledge verification approaches.

---

## Quick start

To launch the full local setup:

```bash
./start-all.sh
```

This script helps install dependencies, prepare the databases, start the blockchain, deploy contracts, and bring the system together.

---

## Main technologies

- ⚙️ Solidity and Ethereum smart contracts
- 🔗 Hardhat for blockchain local development
- ⚛️ React + TypeScript + Vite for the web apps
- 🧠 Zero-knowledge proof components
- 🔐 DID-based identity logic
- 📊 benchmarking tools for gas and proof evaluation

---