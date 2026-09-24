Ran 5 tests for test/FflonkVerifierAdapterSecurity.t.sol:FflonkVerifierAdapterSecurityTest
[PASS] test_RejectsTooManyPublicSignals() (gas: 11126)
[PASS] test_RejectsWrongNumberOfPublicSignals() (gas: 10794)
[PASS] test_RejectsWrongProofLength() (gas: 11035)
[PASS] test_VerifierAddressCannotBeChanged() (gas: 7700)
[PASS] test_VerifyProofAndVerifyProofTxReturnSameResult() (gas: 66285)
Suite result: ok. 5 passed; 0 failed; 0 skipped; finished in 6.69ms (7.40ms CPU time)

Ran 11 tests for test/KYCComplienceSecurity.t.sol:KYCComplianceSecurityTest
[PASS] test_AdminCompromiseCanAuthorizeAttacker() (gas: 63200)
[FAIL: DID not found] test_CompromisedIssuerCanRevokeCompliance() (gas: 90354)
Traces:
  [90354] KYCComplianceSecurityTest::test_CompromisedIssuerCanRevokeCompliance()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [47634] KYCCompliance::setIssuerAuthorization(RIPEMD-160: [0x0000000000000000000000000000000000000003], true)
    │   ├─ emit IssuerAuthorizationUpdated(issuerAddress: RIPEMD-160: [0x0000000000000000000000000000000000000003], authorized: true)
    │   └─ ← [Stop]
    ├─ [0] VM::prank(RIPEMD-160: [0x0000000000000000000000000000000000000003])
    │   └─ ← [Return]
    ├─ [27029] KYCCompliance::revokeCompliance("did:example:123")
    │   └─ ← [Revert] DID not found
    └─ ← [Revert] DID not found

Backtrace:
  at KYCCompliance.revokeCompliance
  at KYCComplianceSecurityTest.test_CompromisedIssuerCanRevokeCompliance

[PASS] test_CompromisedIssuerRetainsIssuerPrivileges() (gas: 63222)
[FAIL: Error != expected error: Only authorized issuer can call this function != Expiry date must be in the future] test_ExpiredProofIsRejected() (gas: 42967)
Traces:
  [42967] KYCComplianceSecurityTest::test_ExpiredProofIsRejected()
    ├─ [0] VM::prank(SHA-256: [0x0000000000000000000000000000000000000002])
    │   └─ ← [Return]
    ├─ [0] VM::expectRevert(Expiry date must be in the future)
    │   └─ ← [Return]
    ├─ [28880] KYCCompliance::submitComplianceProof("did:example:123", 1, "123", 0, 0x0000000000000000000000000000000000000000000000000000000000000001, false, 0x1234, [0, 0, 0, 0, 0])
    │   └─ ← [Revert] Only authorized issuer can call this function
    └─ ← [Revert] Error != expected error: Only authorized issuer can call this function != Expiry date must be in the future

Backtrace:
  at KYCCompliance.submitComplianceProof
  at KYCComplianceSecurityTest.test_ExpiredProofIsRejected

[FAIL: Error != expected error: Only authorized issuer can call this function != Invalid zero-knowledge proof] test_InvalidVerifierResultIsRejected() (gas: 74454)
Traces:
  [74454] KYCComplianceSecurityTest::test_InvalidVerifierResultIsRejected()
    ├─ [26493] MockVerifier::setVerificationResult(false)
    │   └─ ← [Stop]
    ├─ [0] VM::prank(SHA-256: [0x0000000000000000000000000000000000000002])
    │   └─ ← [Return]
    ├─ [0] VM::expectRevert(Invalid zero-knowledge proof)
    │   └─ ← [Return]
    ├─ [28916] KYCCompliance::submitComplianceProof("did:example:123", 1, "123", 604801 [6.048e5], 0x0000000000000000000000000000000000000000000000000000000000000001, false, 0x1234, [0, 0, 0, 0, 0])
    │   └─ ← [Revert] Only authorized issuer can call this function
    └─ ← [Revert] Error != expected error: Only authorized issuer can call this function != Invalid zero-knowledge proof

Backtrace:
  at KYCCompliance.submitComplianceProof
  at KYCComplianceSecurityTest.test_InvalidVerifierResultIsRejected

[PASS] test_UnauthorizedCannotChangeIssuerAuthorization() (gas: 34851)
[PASS] test_UnauthorizedCannotRegisterPublicKey() (gas: 38118)
[PASS] test_UnauthorizedCannotRevokeCompliance() (gas: 37642)
[PASS] test_UnauthorizedCannotSubmitComplianceProof() (gas: 42956)
[PASS] test_UnauthorizedCannotUpdateIssuer() (gas: 34564)
[PASS] test_VerifierIsNotAuthorizedIssuer() (gas: 9960)
Suite result: FAILED. 8 passed; 3 failed; 0 skipped; finished in 7.26ms (9.85ms CPU time)

Ran 20 tests for test/MyNFTSecurity.t.sol:MyNFTSecurityTest
[PASS] test_AlreadyLinkedDIDCannotBeChangedByAttacker() (gas: 91266)
[PASS] test_AnyoneCanLinkUnlinkedDID() (gas: 66180)
[FAIL: EvmError: Revert] test_AnyoneCanTransferNFTToAnotherDID() (gas: 206663)
Traces:
  [206663] MyNFTSecurityTest::test_AnyoneCanTransferNFTToAnotherDID()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [0] VM::deal(Identity: [0x0000000000000000000000000000000000000004], 1000000000000000000 [1e18])
    │   └─ ← [Return]
    ├─ [0] VM::prank(Identity: [0x0000000000000000000000000000000000000004])
    │   └─ ← [Return]
    ├─ [38721] MyNFT::purchaseNFT{value: 1000000000000000000}(0, "did:zeroid:alice")
    │   ├─ [2300] PRECOMPILES::ecrecover{value: 1000000000000000000}(0x)
    │   │   └─ ← [PrecompileOOG] 0x
    │   └─ ← [Revert] EvmError: Revert
    └─ ← [Revert] EvmError: Revert

Backtrace:
  at PRECOMPILES.ecrecover
  at MyNFT.purchaseNFT
  at MyNFTSecurityTest.test_AnyoneCanTransferNFTToAnotherDID

[FAIL: EvmError: Revert] test_AttackerCanOverwriteDIDOwnership() (gas: 206662)
Traces:
  [206662] MyNFTSecurityTest::test_AttackerCanOverwriteDIDOwnership()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [0] VM::deal(Identity: [0x0000000000000000000000000000000000000004], 1000000000000000000 [1e18])
    │   └─ ← [Return]
    ├─ [0] VM::prank(Identity: [0x0000000000000000000000000000000000000004])
    │   └─ ← [Return]
    ├─ [38721] MyNFT::purchaseNFT{value: 1000000000000000000}(0, "did:zeroid:alice")
    │   ├─ [2300] PRECOMPILES::ecrecover{value: 1000000000000000000}(0x)
    │   │   └─ ← [PrecompileOOG] 0x
    │   └─ ← [Revert] EvmError: Revert
    └─ ← [Revert] EvmError: Revert

Backtrace:
  at PRECOMPILES.ecrecover
  at MyNFT.purchaseNFT
  at MyNFTSecurityTest.test_AttackerCanOverwriteDIDOwnership

[PASS] test_AuthorizedEntityCanBeRevoked() (gas: 139919)
[PASS] test_AuthorizedEntityCanMint() (gas: 168280)
[FAIL: EvmError: Revert] test_CannotPurchaseNFTTwice() (gas: 318559)
Traces:
  [318559] MyNFTSecurityTest::test_CannotPurchaseNFTTwice()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [110778] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 1)
    │   ├─ emit MetadataUpdate(_tokenId: 1)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 1, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 1
    ├─ [0] VM::deal(Identity: [0x0000000000000000000000000000000000000004], 1000000000000000000 [1e18])
    │   └─ ← [Return]
    ├─ [0] VM::prank(Identity: [0x0000000000000000000000000000000000000004])
    │   └─ ← [Return]
    ├─ [38733] MyNFT::purchaseNFT{value: 1000000000000000000}(1, "did:zeroid:alice")
    │   ├─ [2300] PRECOMPILES::ecrecover{value: 1000000000000000000}(0x)
    │   │   └─ ← [PrecompileOOG] 0x
    │   └─ ← [Revert] EvmError: Revert
    └─ ← [Revert] EvmError: Revert

Backtrace:
  at PRECOMPILES.ecrecover
  at MyNFT.purchaseNFT
  at MyNFTSecurityTest.test_CannotPurchaseNFTTwice

[PASS] test_CannotPurchaseWithoutEnoughPayment() (gas: 197780)
[PASS] test_CompromisedEntityCanMintNFT() (gas: 211509)
[PASS] test_CompromisedEntityCanPurchaseAndTransferNFT() (gas: 349397)
[PASS] test_CompromisedOwnerCanAuthorizeAttacker() (gas: 63309)
[PASS] test_EmptyDIDIsRejected() (gas: 194944)
[PASS] test_OwnerIsAuthorizedEntity() (gas: 10033)
[FAIL: Caller is not an authorized entity] test_PurchaseAndTransferAssignsDID() (gas: 195214)
Traces:
  [195214] MyNFTSecurityTest::test_PurchaseAndTransferAssignsDID()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [0] VM::deal(SHA-256: [0x0000000000000000000000000000000000000002], 1000000000000000000 [1e18])
    │   └─ ← [Return]
    ├─ [0] VM::prank(SHA-256: [0x0000000000000000000000000000000000000002])
    │   └─ ← [Return]
    ├─ [25074] MyNFT::purchaseAndTransferNFT{value: 1000000000000000000}(0, "did:zeroid:alice", Identity: [0x0000000000000000000000000000000000000004])
    │   └─ ← [Revert] Caller is not an authorized entity
    └─ ← [Revert] Caller is not an authorized entity

Backtrace:
  at MyNFT.purchaseAndTransferNFT
  at MyNFTSecurityTest.test_PurchaseAndTransferAssignsDID

[FAIL: Caller is not an authorized entity] test_PurchaseAndTransferMarksNFTAsSold() (gas: 195148)
Traces:
  [195148] MyNFTSecurityTest::test_PurchaseAndTransferMarksNFTAsSold()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [0] VM::deal(SHA-256: [0x0000000000000000000000000000000000000002], 1000000000000000000 [1e18])
    │   └─ ← [Return]
    ├─ [0] VM::prank(SHA-256: [0x0000000000000000000000000000000000000002])
    │   └─ ← [Return]
    ├─ [25074] MyNFT::purchaseAndTransferNFT{value: 1000000000000000000}(0, "did:zeroid:alice", Identity: [0x0000000000000000000000000000000000000004])
    │   └─ ← [Revert] Caller is not an authorized entity
    └─ ← [Revert] Caller is not an authorized entity

Backtrace:
  at MyNFT.purchaseAndTransferNFT
  at MyNFTSecurityTest.test_PurchaseAndTransferMarksNFTAsSold

[FAIL: EvmError: Revert] test_PurchaseNFTCannotBeReentered() (gas: 573497)
Traces:
  [573497] MyNFTSecurityTest::test_PurchaseNFTCannotBeReentered()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [321207] → new ReentrantBuyer@0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f
    │   └─ ← [Return] 968 bytes of code
    ├─ [0] VM::deal(ReentrantBuyer: [0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f], 1000000000000000000 [1e18])
    │   └─ ← [Return]
    ├─ [54289] ReentrantBuyer::attack{value: 1000000000000000000}()
    │   ├─ [16929] MyNFT::purchaseNFT{value: 1000000000000000000}(0, "did:zeroid:alice")
    │   │   ├─ [2300] PRECOMPILES::ecrecover{value: 1000000000000000000}(0x)
    │   │   │   └─ ← [PrecompileOOG] 0x
    │   │   └─ ← [Revert] EvmError: Revert
    │   └─ ← [Revert] EvmError: Revert
    └─ ← [Revert] EvmError: Revert

Backtrace:
  at PRECOMPILES.ecrecover
  at MyNFT.purchaseNFT
  at ReentrantBuyer.attack
  at MyNFTSecurityTest.test_PurchaseNFTCannotBeReentered

[FAIL: Error != expected error: OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003) != Ownable: caller is not the owner] test_UnauthorizedCannotAuthorizeEntity() (gas: 34791)
Traces:
  [34791] MyNFTSecurityTest::test_UnauthorizedCannotAuthorizeEntity()
    ├─ [0] VM::prank(RIPEMD-160: [0x0000000000000000000000000000000000000003])
    │   └─ ← [Return]
    ├─ [0] VM::expectRevert(Ownable: caller is not the owner)
    │   └─ ← [Return]
    ├─ [23983] MyNFT::setEntityAuthorization(RIPEMD-160: [0x0000000000000000000000000000000000000003], true)
    │   └─ ← [Revert] OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003)
    └─ ← [Revert] Error != expected error: OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003) != Ownable: caller is not the owner

Backtrace:
  at MyNFT.setEntityAuthorization
  at MyNFTSecurityTest.test_UnauthorizedCannotAuthorizeEntity

[PASS] test_UnauthorizedCannotMintNFT() (gas: 35697)
[FAIL: call reverted as expected, but without data] test_UnauthorizedCannotPurchaseAndTransferNFT() (gas: 170020)
Traces:
  [170020] MyNFTSecurityTest::test_UnauthorizedCannotPurchaseAndTransferNFT()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [144978] MyNFT::mintNFT("ipfs://asset", 1000000000000000000 [1e18])
    │   ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0)
    │   ├─ emit MetadataUpdate(_tokenId: 0)
    │   ├─ emit NFTMinted(to: ECRecover: [0x0000000000000000000000000000000000000001], tokenId: 0, tokenURI: "ipfs://asset", price: 1000000000000000000 [1e18])
    │   └─ ← [Return] 0
    ├─ [0] VM::prank(RIPEMD-160: [0x0000000000000000000000000000000000000003])
    │   └─ ← [Return]
    ├─ [0] VM::expectRevert(Caller is not an authorized entity)
    │   └─ ← [Return]
    ├─ [0] MyNFT::purchaseAndTransferNFT{value: 1000000000000000000}(0, "did:zeroid:alice", Identity: [0x0000000000000000000000000000000000000004])
    │   └─ ← [Revert] EvmError: Revert
    └─ ← [Revert] call reverted as expected, but without data

Backtrace:
  at MyNFT.purchaseAndTransferNFT
  at MyNFTSecurityTest.test_UnauthorizedCannotPurchaseAndTransferNFT

[FAIL: Error != expected error: OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003) != Ownable: caller is not the owner] test_UnauthorizedCannotRevokeEntity() (gas: 87543)
Traces:
  [87543] MyNFTSecurityTest::test_UnauthorizedCannotRevokeEntity()
    ├─ [0] VM::prank(ECRecover: [0x0000000000000000000000000000000000000001])
    │   └─ ← [Return]
    ├─ [47627] MyNFT::setEntityAuthorization(SHA-256: [0x0000000000000000000000000000000000000002], true)
    │   ├─ emit EntityAuthorizationUpdated(entity: SHA-256: [0x0000000000000000000000000000000000000002], authorized: true)
    │   └─ ← [Stop]
    ├─ [0] VM::prank(RIPEMD-160: [0x0000000000000000000000000000000000000003])
    │   └─ ← [Return]
    ├─ [0] VM::expectRevert(Ownable: caller is not the owner)
    │   └─ ← [Return]
    ├─ [23971] MyNFT::setEntityAuthorization(SHA-256: [0x0000000000000000000000000000000000000002], false)
    │   └─ ← [Revert] OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003)
    └─ ← [Revert] Error != expected error: OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003) != Ownable: caller is not the owner

Backtrace:
  at MyNFT.setEntityAuthorization
  at MyNFTSecurityTest.test_UnauthorizedCannotRevokeEntity

Suite result: FAILED. 11 passed; 9 failed; 0 skipped; finished in 7.45ms (9.73ms CPU time)

Ran 3 test suites in 163.54ms (21.40ms CPU time): 24 tests passed, 12 failed, 0 skipped (36 total tests)

Failing tests:
Encountered 3 failing tests in test/KYCComplienceSecurity.t.sol:KYCComplianceSecurityTest
[FAIL: DID not found] test_CompromisedIssuerCanRevokeCompliance() (gas: 90354)
[FAIL: Error != expected error: Only authorized issuer can call this function != Expiry date must be in the future] test_ExpiredProofIsRejected() (gas: 42967)
[FAIL: Error != expected error: Only authorized issuer can call this function != Invalid zero-knowledge proof] test_InvalidVerifierResultIsRejected() (gas: 74454)

Encountered 9 failing tests in test/MyNFTSecurity.t.sol:MyNFTSecurityTest
[FAIL: EvmError: Revert] test_AnyoneCanTransferNFTToAnotherDID() (gas: 206663)
[FAIL: EvmError: Revert] test_AttackerCanOverwriteDIDOwnership() (gas: 206662)
[FAIL: EvmError: Revert] test_CannotPurchaseNFTTwice() (gas: 318559)
[FAIL: Caller is not an authorized entity] test_PurchaseAndTransferAssignsDID() (gas: 195214)
[FAIL: Caller is not an authorized entity] test_PurchaseAndTransferMarksNFTAsSold() (gas: 195148)
[FAIL: EvmError: Revert] test_PurchaseNFTCannotBeReentered() (gas: 573497)
[FAIL: Error != expected error: OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003) != Ownable: caller is not the owner] test_UnauthorizedCannotAuthorizeEntity() (gas: 34791)
[FAIL: call reverted as expected, but without data] test_UnauthorizedCannotPurchaseAndTransferNFT() (gas: 170020)
[FAIL: Error != expected error: OwnableUnauthorizedAccount(0x0000000000000000000000000000000000000003) != Ownable: caller is not the owner] test_UnauthorizedCannotRevokeEntity() (gas: 87543)

Encountered a total of 12 failing tests, 24 tests succeeded

Tip: Run `forge test --rerun` to retry only the 12 failed tests
Tip: Run `forge test --debug --match-test <TEST_NAME>` to inspect one failing test in the debugger