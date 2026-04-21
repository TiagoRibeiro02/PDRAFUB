// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Local-only mock for RISC0 verifier integration tests/bench plumbing.
///         It accepts any proof and never reverts.
contract MockRisc0Verifier {
    function verify(bytes calldata, bytes32, bytes32) external pure {}
}
