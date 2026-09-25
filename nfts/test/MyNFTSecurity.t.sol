// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/MyNFT.sol";

contract MyNFTSecurityTest is Test {

    MyNFT public nft;

    address public bank = address(0x1001);
    address public entity = address(0x1002);
    address public attacker = address(0x1003);
    address public user = address(0x1004);

    uint256 public constant PRICE = 1 ether;

    string public didAlice = "did:zeroid:alice";
    string public didBob = "did:zeroid:bob";

    function setUp() public {
        vm.prank(bank);
        nft = new MyNFT();

        vm.prank(bank);
        nft.setEntityAuthorization(entity, true);
    }

    // ============================================================
    // ACCESS CONTROL
    // ============================================================

    function test_UnauthorizedCannotMintNFT() public {
        vm.prank(attacker);

        vm.expectRevert(
            "Caller is not an authorized entity"
        );

        nft.mintNFT(
            "ipfs://asset",
            PRICE
        );
    }

    function test_UnauthorizedCannotAuthorizeEntity() public {
        vm.prank(attacker);

        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                attacker
            )
        );

        nft.setEntityAuthorization(
            attacker,
            true
        );
    }

    function test_UnauthorizedCannotRevokeEntity() public {
        vm.prank(bank);

        nft.setEntityAuthorization(
            entity,
            true
        );

        vm.prank(attacker);

        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                attacker
            )
        );

        nft.setEntityAuthorization(
            entity,
            false
        );
    }

    function test_UnauthorizedCannotPurchaseAndTransferNFT() public {
        uint256 tokenId = _mintNFT();

        vm.prank(attacker);

        vm.expectRevert();

        nft.purchaseAndTransferNFT{value: PRICE}(
            tokenId,
            didAlice,
            user
        );
    }

    // ============================================================
    // AUTHORIZED ENTITY
    // ============================================================

    function test_OwnerIsAuthorizedEntity() public view {
        assertTrue(
            nft.isAuthorizedEntity(bank)
        );
    }

    function test_AuthorizedEntityCanMint() public {

        vm.prank(bank);

        uint256 tokenId = nft.mintNFT(
            "ipfs://asset",
            PRICE
        );

        assertEq(
            tokenId,
            0
        );

        assertEq(
            nft.ownerOf(tokenId),
            bank
        );

        assertEq(
            nft.getPrice(tokenId),
            PRICE
        );
    }

    function test_AuthorizedEntityCanBeRevoked() public {

        vm.prank(bank);

        nft.setEntityAuthorization(
            entity,
            true
        );

        assertTrue(
            nft.isAuthorizedEntity(entity)
        );

        vm.prank(bank);

        nft.setEntityAuthorization(
            entity,
            false
        );

        assertFalse(
            nft.isAuthorizedEntity(entity)
        );

        vm.prank(entity);

        vm.expectRevert(
            "Caller is not an authorized entity"
        );

        nft.mintNFT(
            "ipfs://asset",
            PRICE
        );
    }

    // ============================================================
    // KEY COMPROMISE
    // ============================================================

    /*
     * Simulates compromise of an authorized entity private key.
     *
     * The attacker is explicitly given the same privilege as an
     * authorized entity.
     */

    function test_CompromisedEntityCanMintNFT() public {

        // Simulate compromised entity key
        vm.prank(bank);

        nft.setEntityAuthorization(
            attacker,
            true
        );

        // Attacker now has entity privileges
        vm.prank(attacker);

        uint256 tokenId = nft.mintNFT(
            "ipfs://malicious",
            PRICE
        );

        assertEq(
            nft.ownerOf(tokenId),
            bank
        );
    }

    function test_CompromisedEntityCanPurchaseAndTransferNFT() public {

        uint256 tokenId = _mintNFT();

        // Simulate compromised entity key
        vm.prank(bank);

        nft.setEntityAuthorization(
            attacker,
            true
        );

        vm.deal(attacker, PRICE);

        vm.prank(attacker);

        nft.purchaseAndTransferNFT{value: PRICE}(
            tokenId,
            didAlice,
            attacker
        );

        assertEq(
            nft.ownerOf(tokenId),
            attacker
        );

        assertEq(
            nft.getDidOwner(tokenId),
            didAlice
        );
    }

    function test_CompromisedOwnerCanAuthorizeAttacker() public {

        /*
         * Simulates compromise of the bank/contract owner's
         * private key.
         */

        vm.prank(bank);

        nft.setEntityAuthorization(
            attacker,
            true
        );

        assertTrue(
            nft.isAuthorizedEntity(attacker)
        );
    }

    // ============================================================
    // DID ACCESS CONTROL
    // ============================================================

    function test_AnyoneCanLinkUnlinkedDID() public {

        vm.prank(attacker);

        nft.linkDIDToAddress(
            didAlice,
            attacker
        );

        assertEq(
            nft.getAddressForDID(didAlice),
            attacker
        );
    }

    function test_AlreadyLinkedDIDCannotBeChangedByAttacker() public {

        vm.prank(user);

        nft.linkDIDToAddress(
            didAlice,
            user
        );

        vm.prank(attacker);

        vm.expectRevert(
            "DID already linked. Only authorized entity can update."
        );

        nft.linkDIDToAddress(
            didAlice,
            attacker
        );
    }

    // ============================================================
    // DID OWNERSHIP / CRITICAL AUTHORIZATION TEST
    // ============================================================

    /*
     * IMPORTANT:
     *
     * transferToDID() does NOT verify that msg.sender controls
     * the current DID.
     *
     * Therefore any address can change the DID associated with
     * an NFT.
     */

    function test_AnyoneCanTransferNFTToAnotherDID() public {

        uint256 tokenId = _purchaseNFT();

        assertEq(
            nft.getDidOwner(tokenId),
            didAlice
        );

        // Attacker changes ownership DID without owning Alice's DID
        vm.prank(attacker);

        nft.transferToDID(
            tokenId,
            didBob
        );

        assertEq(
            nft.getDidOwner(tokenId),
            didBob
        );
    }

    function test_AttackerCanOverwriteDIDOwnership() public {

        uint256 tokenId = _purchaseNFT();

        vm.prank(attacker);

        nft.transferToDID(
            tokenId,
            "did:zeroid:attacker"
        );

        assertEq(
            nft.getDidOwner(tokenId),
            "did:zeroid:attacker"
        );
    }

    // ============================================================
    // REENTRANCY
    // ============================================================

    /*
     * purchaseNFT() and purchaseAndTransferNFT() perform external
     * ETH transfers.
     *
     * The contract uses transfer(), which forwards only the
     * traditional 2300 gas stipend.
     *
     * These tests check that malicious recipient contracts cannot
     * re-enter the purchase functions.
     */

    function test_PurchaseNFTCannotBeReentered() public {

        uint256 tokenId = _mintNFT();

        ReentrantBuyer buyer =
            new ReentrantBuyer(
                address(nft),
                tokenId,
                didAlice
            );

        vm.deal(
            address(buyer),
            PRICE
        );

        buyer.attack{value: PRICE}();

        assertEq(
            nft.getPrice(tokenId),
            0
        );

        assertEq(
            nft.getDidOwner(tokenId),
            didAlice
        );
    }

    // ============================================================
    // PAYMENT VALIDATION
    // ============================================================

    function test_CannotPurchaseWithoutEnoughPayment() public {

        uint256 tokenId = _mintNFT();

        vm.deal(
            attacker,
            PRICE - 1
        );

        vm.prank(attacker);

        vm.expectRevert(
            "Insufficient payment"
        );

        nft.purchaseNFT{value: PRICE - 1}(
            tokenId,
            didAlice
        );
    }

    function test_CannotPurchaseNFTTwice() public {
        _mintNFT();
        _mintNFT();

        nft.purchaseNFT{value: PRICE}(1, "did:zeroid:alice");

        vm.expectRevert("NFT not for sale");

        nft.purchaseNFT{value: PRICE}(1, "did:zeroid:bob");
    }

    function test_EmptyDIDIsRejected() public {

        uint256 tokenId = _mintNFT();

        vm.deal(
            attacker,
            PRICE
        );

        vm.prank(attacker);

        vm.expectRevert(
            "Invalid DID"
        );

        nft.purchaseNFT{value: PRICE}(
            tokenId,
            ""
        );
    }

    // ============================================================
    // PURCHASE + TRANSFER
    // ============================================================

    function test_PurchaseAndTransferAssignsDID() public {

        uint256 tokenId = _mintNFT();

        vm.deal(
            entity,
            PRICE
        );

        vm.prank(entity);

        nft.purchaseAndTransferNFT{value: PRICE}(
            tokenId,
            didAlice,
            user
        );

        assertEq(
            nft.ownerOf(tokenId),
            user
        );

        assertEq(
            nft.getDidOwner(tokenId),
            didAlice
        );

        assertEq(
            nft.getAddressForDID(didAlice),
            user
        );
    }

    function test_PurchaseAndTransferMarksNFTAsSold() public {

        uint256 tokenId = _mintNFT();

        vm.deal(
            entity,
            PRICE
        );

        vm.prank(entity);

        nft.purchaseAndTransferNFT{value: PRICE}(
            tokenId,
            didAlice,
            user
        );

        assertEq(
            nft.getPrice(tokenId),
            0
        );
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function _mintNFT()
        internal
        returns (uint256)
    {
        vm.prank(bank);

        return nft.mintNFT(
            "ipfs://asset",
            PRICE
        );
    }

    function _purchaseNFT()
        internal
        returns (uint256)
    {
        uint256 tokenId = _mintNFT();

        vm.deal(
            user,
            PRICE
        );

        vm.prank(user);

        nft.purchaseNFT{value: PRICE}(
            tokenId,
            didAlice
        );

        return tokenId;
    }
}


/**
 * @dev Malicious buyer used to test reentrancy.
 */
contract ReentrantBuyer {

    MyNFT public nft;

    uint256 public tokenId;
    string public did;

    bool public entered;

    constructor(
        address nftAddress,
        uint256 _tokenId,
        string memory _did
    ) {
        nft = MyNFT(nftAddress);
        tokenId = _tokenId;
        did = _did;
    }

    function attack() external payable {

        nft.purchaseNFT{value: msg.value}(
            tokenId,
            did
        );
    }

    receive() external payable {

        if (!entered) {
            entered = true;

            // Attempt reentrancy
            try nft.purchaseNFT{value: msg.value}(
                tokenId,
                did
            ) {
            } catch {
                // Reentrancy should fail
            }
        }
    }
}