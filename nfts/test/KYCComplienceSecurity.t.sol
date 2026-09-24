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

    function test_InvalidVerifierResultIsRejected() public {

        verifier.setVerificationResult(false);

        uint256 expiry =
            block.timestamp + 7 days;

        uint256[] memory publicSignals =
            new uint256[](5);

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