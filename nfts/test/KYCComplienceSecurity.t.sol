// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/KYCCompliance.sol";

contract MockVerifier {
    bool public verificationResult = true;

    function setVerificationResult(bool result) external {
        verificationResult = result;
    }

    function verifyProof(
        bytes calldata,
        uint256[] calldata
    ) external view returns (bool) {
        return verificationResult;
    }
}

contract KYCComplianceSecurityTest is Test {

    KYCCompliance public kyc;
    MockVerifier public verifier;

    address public admin = address(0x1);
    address public issuer = address(0x2);
    address public attacker = address(0x3);

    string public did = "did:example:123";

    function setUp() public {
        verifier = new MockVerifier();

        vm.prank(admin);
        kyc = new KYCCompliance(address(verifier));

        vm.prank(admin);
        kyc.setIssuerAuthorization(issuer, true);
    }

    // ============================================================
    // ACCESS CONTROL
    // ============================================================

    function test_UnauthorizedCannotRegisterPublicKey() public {
        vm.prank(attacker);

        vm.expectRevert(
            "Only authorized issuer can call this function"
        );

        kyc.registerPublicKey(
            did,
            bytes32(uint256(1)),
            false
        );
    }

    function test_UnauthorizedCannotSubmitComplianceProof() public {
        uint256 expiry = block.timestamp + 7 days;

        uint256[] memory publicSignals = new uint256[](5);

        vm.prank(attacker);

        vm.expectRevert(
            "Only authorized issuer can call this function"
        );

        kyc.submitComplianceProof(
            did,
            1,
            "123",
            expiry,
            bytes32(uint256(1)),
            false,
            hex"1234",
            publicSignals
        );
    }

    function test_UnauthorizedCannotRevokeCompliance() public {
        vm.prank(attacker);

        vm.expectRevert(
            "Only authorized issuer can call this function"
        );

        kyc.revokeCompliance(did);
    }

    function test_UnauthorizedCannotChangeIssuerAuthorization() public {
        vm.prank(attacker);

        vm.expectRevert(
            "Only admin can call this function"
        );

        kyc.setIssuerAuthorization(
            attacker,
            true
        );
    }

    function test_UnauthorizedCannotUpdateIssuer() public {
        vm.prank(attacker);

        vm.expectRevert(
            "Only admin can call this function"
        );

        kyc.updateIssuer(attacker);
    }

    // ============================================================
    // KEY COMPROMISE
    // ============================================================

    /*
     * Simulates a compromised issuer private key.
     *
     * The attacker is explicitly given issuer authorization.
     * The attacker can then execute privileged issuer operations.
     */

    function test_CompromisedIssuerCanRevokeCompliance() public {

        // Setup: o issuer legítimo submete um compliance proof válido primeiro
        uint256 expiry = block.timestamp + 7 days;
        uint256[] memory publicSignals = new uint256[](5);
        publicSignals[0] = _didField(did);
        publicSignals[1] = 1;
        publicSignals[2] = 1;
        publicSignals[3] = 123;
        publicSignals[4] = expiry;

        vm.prank(issuer);
        kyc.submitComplianceProof(
            did, 1, "123", expiry, bytes32(uint256(1)), false, hex"1234", publicSignals
        );
        assertTrue(kyc.compliant(did)); // confirma que o setup funcionou


        // Simulate issuer key compromise
        vm.prank(admin);
        kyc.setIssuerAuthorization(
            attacker,
            true
        );

        // Attacker now possesses an authorized issuer key
        vm.prank(attacker);

        kyc.revokeCompliance(did);

        assertFalse(
            kyc.compliant(did)
        );
    }

    function test_CompromisedIssuerRetainsIssuerPrivileges() public {

        vm.prank(admin);

        kyc.setIssuerAuthorization(
            attacker,
            true
        );

        assertTrue(
            kyc.authorizedIssuers(attacker)
        );
    }

    function test_AdminCompromiseCanAuthorizeAttacker() public {

        // Simulate compromised admin key
        vm.prank(admin);

        kyc.setIssuerAuthorization(
            attacker,
            true
        );

        assertTrue(
            kyc.authorizedIssuers(attacker)
        );
    }

    // ============================================================
    // REENTRANCY
    // ============================================================

    /*
     * The verifier is an external contract.
     *
     * This test verifies that the verifier is not automatically
     * considered an authorized issuer.
     */

    function test_VerifierIsNotAuthorizedIssuer() public {

        assertFalse(
            kyc.authorizedIssuers(
                address(verifier)
            )
        );
    }

    // ============================================================
    // INPUT / PROOF VALIDATION
    // ============================================================

    function test_ExpiredProofIsRejected() public {

        uint256 expiry = block.timestamp - 1;

        uint256[] memory publicSignals =
            new uint256[](5);

        vm.prank(issuer);

        vm.expectRevert(
            "Expiry date must be in the future"
        );

        kyc.submitComplianceProof(
            did,
            1,
            "123",
            expiry,
            bytes32(uint256(1)),
            false,
            hex"1234",
            publicSignals
        );
    }

    // Helper — replica exatamente _didToFieldElement() do contrato
    function _didField(string memory did_) internal pure returns (uint256) {
        bytes32 h = sha256(bytes(did_));
        return uint256(uint128(bytes16(h)));
    }

    function test_InvalidVerifierResultIsRejected() public {

        verifier.setVerificationResult(false);

        uint256 expiry = block.timestamp + 7 days;

        uint256[] memory publicSignals = new uint256[](5);
        publicSignals[0] = _didField(did);   // bate com o DID
        publicSignals[1] = 1;                // status = compliant
        publicSignals[2] = 1;                // == commitment passado abaixo
        publicSignals[3] = 123;              // == _parseDecimal("123")
        publicSignals[4] = expiry;           // == expiryDate passado abaixo

        vm.prank(issuer);

        vm.expectRevert(
            "Invalid zero-knowledge proof"
        );

        kyc.submitComplianceProof(
            did,
            1,
            "123",
            expiry,
            bytes32(uint256(1)),
            false,
            hex"1234",
            publicSignals
        );
    }
}