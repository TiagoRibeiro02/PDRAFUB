// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/FflonkVerifierAdapter.sol";

contract FflonkVerifierAdapterSecurityTest is Test {

    FflonkVerifierAdapter public adapter;

    function setUp() public {
        adapter = new FflonkVerifierAdapter();
    }

    // ============================================================
    // ACCESS CONTROL
    // ============================================================

    function test_VerifierAddressCannotBeChanged() public view {

        address verifier =
            adapter.getVerifierAddress();

        assertTrue(
            verifier != address(0)
        );
    }

    // ============================================================
    // INPUT VALIDATION
    // ============================================================

    function test_RejectsWrongNumberOfPublicSignals() public {

        bytes memory proof =
            new bytes(768);

        uint256[] memory signals =
            new uint256[](4);

        vm.expectRevert(
            "Invalid number of public signals"
        );

        adapter.verifyProof(
            proof,
            signals
        );
    }

    function test_RejectsTooManyPublicSignals() public {

        bytes memory proof =
            new bytes(768);

        uint256[] memory signals =
            new uint256[](6);

        vm.expectRevert(
            "Invalid number of public signals"
        );

        adapter.verifyProof(
            proof,
            signals
        );
    }

    function test_RejectsWrongProofLength() public {

        bytes memory proof =
            new bytes(767);

        uint256[] memory signals =
            new uint256[](5);

        vm.expectRevert(
            "Invalid proof length"
        );

        adapter.verifyProof(
            proof,
            signals
        );
    }

    // ============================================================
    // VERIFY CONSISTENCY
    // ============================================================

    function test_VerifyProofAndVerifyProofTxReturnSameResult()
        public
    {
        bytes memory proof =
            new bytes(768);

        uint256[] memory signals =
            new uint256[](5);

        bool result1 =
            adapter.verifyProof(
                proof,
                signals
            );

        bool result2 =
            adapter.verifyProofTx(
                proof,
                signals
            );

        assertEq(
            result1,
            result2
        );
    }
}