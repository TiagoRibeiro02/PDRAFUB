'npx hardhat clean' running (wd: /mnt/c/Users/tigol/Documents/GitHub/PDRAFUB/nfts)
'npx hardhat clean --global' running (wd: /mnt/c/Users/tigol/Documents/GitHub/PDRAFUB/nfts)
Problem executing hardhat: npm notice run nft-display-example@1.0.0 npx
npm notice run 'hardhat' console --no-compile

'npx hardhat compile --force' running (wd: /mnt/c/Users/tigol/Documents/GitHub/PDRAFUB/nfts)
INFO:Detectors:
Detector: arbitrary-send-eth
MyNFT.purchaseNFT(uint256,string) (contracts/MyNFT.sol#85-107) sends eth to arbitrary user
        Dangerous calls:
        - address(owner()).transfer(price) (contracts/MyNFT.sol#94)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#functions-that-send-ether-to-arbitrary-destinations
INFO:Detectors:
Detector: incorrect-exp
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) has bitwise-xor operator ^ instead of the exponentiation operator **:
         - inverse = (3 * denominator) ^ 2 (node_modules/@openzeppelin/contracts/utils/math/Math.sol#257)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-exponentiation
INFO:Detectors:
Detector: incorrect-return
FflonkVerifier.verifyProof(bytes32[24],uint256[5]) (contracts/verifier.sol#170-1315) calls FflonkVerifier.verifyProof.asm_0.computeInversions() (contracts/verifier.sol#684-739) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#287)
FflonkVerifier.verifyProof(bytes32[24],uint256[5]) (contracts/verifier.sol#170-1315) calls FflonkVerifier.verifyProof.asm_0.computeFEJ() (contracts/verifier.sol#1206-1233) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#1166)
FflonkVerifier.verifyProof(bytes32[24],uint256[5]) (contracts/verifier.sol#170-1315) calls FflonkVerifier.verifyProof.asm_0.checkPairing() (contracts/verifier.sol#1236-1274) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#1166)
FflonkVerifier.verifyProof(bytes32[24],uint256[5]) (contracts/verifier.sol#170-1315) calls FflonkVerifier.verifyProof.asm_0.checkProofData() (contracts/verifier.sol#418-452) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#414)
FflonkVerifier.verifyProof.asm_0.checkProofData() (contracts/verifier.sol#418-452) calls FflonkVerifier.verifyProof.asm_0.checkField() (contracts/verifier.sol#396-401) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#399)
FflonkVerifier.verifyProof.asm_0.checkProofData() (contracts/verifier.sol#418-452) calls FflonkVerifier.verifyProof.asm_0.checkPointBelongsToBN128Curve() (contracts/verifier.sol#403-416) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#414)
FflonkVerifier.verifyProof.asm_0.computeFEJ() (contracts/verifier.sol#1206-1233) calls FflonkVerifier.verifyProof.asm_0.g1_mulAcc() (contracts/verifier.sol#1155-1178) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#1176)
FflonkVerifier.verifyProof.asm_0.computeFEJ() (contracts/verifier.sol#1206-1233) calls FflonkVerifier.verifyProof.asm_0.g1_mulAccC() (contracts/verifier.sol#1181-1204) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#1202)
FflonkVerifier.verifyProof.asm_0.checkPairing() (contracts/verifier.sol#1236-1274) calls FflonkVerifier.verifyProof.asm_0.g1_mulAcc() (contracts/verifier.sol#1155-1178) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#1176)
FflonkVerifier.verifyProof.asm_0.checkPairing() (contracts/verifier.sol#1236-1274) calls FflonkVerifier.verifyProof.asm_0.g1_acc() (contracts/verifier.sol#1139-1152) which halt the execution return(uint256,uint256)(0,0x20) (contracts/verifier.sol#1150)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-return-in-assembly
INFO:Detectors:
Detector: divide-before-multiply
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse = (3 * denominator) ^ 2 (node_modules/@openzeppelin/contracts/utils/math/Math.sol#257)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse *= 2 - denominator * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#261)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse *= 2 - denominator * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#262)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse *= 2 - denominator * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#263)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse *= 2 - denominator * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#264)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse *= 2 - denominator * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#265)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - denominator = denominator / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#242)
        - inverse *= 2 - denominator * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#266)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) performs a multiplication on the result of a division:
        - low = low / twos (node_modules/@openzeppelin/contracts/utils/math/Math.sol#245)
        - result = low * inverse (node_modules/@openzeppelin/contracts/utils/math/Math.sol#272)
Math.invMod(uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#315-361) performs a multiplication on the result of a division:
        - quotient = gcd / remainder (node_modules/@openzeppelin/contracts/utils/math/Math.sol#337)
        - (gcd,remainder) = (remainder,gcd - remainder * quotient) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#339-346)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#divide-before-multiply
INFO:Detectors:
Detector: incorrect-equality
KYCCompliance.getPublicKey(string) (contracts/KYCCompliance.sol#165-179) uses a dangerous strict equality:
        - ! status.exists || status.pkX == bytes32(0) (contracts/KYCCompliance.sol#173)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-strict-equalities
INFO:Detectors:
Detector: shadowing-local
MyNFT.mintNFT(string,uint256).tokenURI (contracts/MyNFT.sol#67) shadows:
        - ERC721URIStorage.tokenURI(uint256) (node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol#31-47) (function)
        - ERC721.tokenURI(uint256) (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#76-81) (function)
        - IERC721Metadata.tokenURI(uint256) (node_modules/@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol#26) (function)
MyNFT.tokensOfOwner(address).owner (contracts/MyNFT.sol#282) shadows:
        - Ownable.owner() (node_modules/@openzeppelin/contracts/access/Ownable.sol#56-58) (function)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#local-variable-shadowing
INFO:Detectors:
Detector: reentrancy-benign
Reentrancy in MyNFT.mintNFT(string,uint256) (contracts/MyNFT.sol#67-78):
        External calls:
        - _safeMint(owner(),tokenId) (contracts/MyNFT.sol#71)
                - ERC721Utils.checkOnERC721Received(_msgSender(),address(0),to,tokenId,data) (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#289)
                - retval = IERC721Receiver(to).onERC721Received(operator,from,tokenId,data) (node_modules/@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol#33-47)
        State variables written after the call(s):
        - _prices[tokenId] = price (contracts/MyNFT.sol#73)
        - _setTokenURI(tokenId,tokenURI) (contracts/MyNFT.sol#72)
                - _tokenURIs[tokenId] = _tokenURI (node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol#55)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3
INFO:Detectors:
Detector: reentrancy-events
Reentrancy in MyNFT.mintNFT(string,uint256) (contracts/MyNFT.sol#67-78):
        External calls:
        - _safeMint(owner(),tokenId) (contracts/MyNFT.sol#71)
                - ERC721Utils.checkOnERC721Received(_msgSender(),address(0),to,tokenId,data) (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#289)
                - retval = IERC721Receiver(to).onERC721Received(operator,from,tokenId,data) (node_modules/@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol#33-47)
        Event emitted after the call(s):
        - MetadataUpdate(tokenId) (node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol#56)
                - _setTokenURI(tokenId,tokenURI) (contracts/MyNFT.sol#72)
        - NFTMinted(owner(),tokenId,tokenURI,price) (contracts/MyNFT.sol#75)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-4
INFO:Detectors:
Detector: timestamp
KYCCompliance.submitComplianceProof(string,uint256,string,uint256,bytes32,bool,bytes,uint256[]) (contracts/KYCCompliance.sol#107-148) uses timestamp for comparisons
        Dangerous comparisons:
        - require(bool,string)(expiryDate > block.timestamp,Expiry date must be in the future) (contracts/KYCCompliance.sol#119)
KYCCompliance.getPublicKey(string) (contracts/KYCCompliance.sol#165-179) uses timestamp for comparisons
        Dangerous comparisons:
        - ! status.exists || status.pkX == bytes32(0) (contracts/KYCCompliance.sol#173)
KYCCompliance.compliant(string) (contracts/KYCCompliance.sol#181-184) uses timestamp for comparisons
        Dangerous comparisons:
        - complianceStatuses[didHash].exists && complianceStatuses[didHash].isCompliant (contracts/KYCCompliance.sol#183)
KYCCompliance.revokeCompliance(string) (contracts/KYCCompliance.sol#186-193) uses timestamp for comparisons
        Dangerous comparisons:
        - require(bool,string)(complianceStatuses[didHash].exists,DID not found) (contracts/KYCCompliance.sol#188)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
INFO:Detectors:
Detector: assembly
ERC721Utils.checkOnERC721Received(address,address,address,uint256,bytes) (node_modules/@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol#25-49) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol#43-45)
Panic.panic(uint256) (node_modules/@openzeppelin/contracts/utils/Panic.sol#50-56) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/Panic.sol#51-55)
Strings.toString(uint256) (node_modules/@openzeppelin/contracts/utils/Strings.sol#45-63) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/Strings.sol#50-52)
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/Strings.sol#55-57)
Strings.toChecksumHexString(address) (node_modules/@openzeppelin/contracts/utils/Strings.sol#111-129) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/Strings.sol#116-118)
Strings.escapeJSON(string) (node_modules/@openzeppelin/contracts/utils/Strings.sol#446-476) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/Strings.sol#470-473)
Strings._unsafeReadBytesOffset(bytes,uint256) (node_modules/@openzeppelin/contracts/utils/Strings.sol#484-489) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/Strings.sol#486-488)
Math.add512(uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#25-30) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#26-29)
Math.mul512(uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#37-46) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#41-45)
Math.tryMul(uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#73-84) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#76-80)
Math.tryDiv(uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#89-97) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#92-95)
Math.tryMod(uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#102-110) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#105-108)
Math.mulDiv(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#204-275) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#227-234)
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#240-249)
Math.tryModExp(uint256,uint256,uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#409-433) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#411-432)
Math.tryModExp(bytes,bytes,bytes) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#449-471) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#461-470)
Math.log2(uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#612-651) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/Math.sol#648-650)
SafeCast.toUint(bool) (node_modules/@openzeppelin/contracts/utils/math/SafeCast.sol#1157-1161) uses assembly
        - INLINE ASM (node_modules/@openzeppelin/contracts/utils/math/SafeCast.sol#1158-1160)
FflonkVerifierAdapter.verifyProof(bytes,uint256[]) (contracts/FflonkVerifierAdapter.sol#15-38) uses assembly
        - INLINE ASM (contracts/FflonkVerifierAdapter.sol#26-28)
FflonkVerifier.verifyProof(bytes32[24],uint256[5]) (contracts/verifier.sol#170-1315) uses assembly
        - INLINE ASM (contracts/verifier.sol#171-1314)
FflonkVerifier.verifyProof.asm_0.inverseArray() (contracts/verifier.sol#175-394) uses assembly
        - INLINE ASM (contracts/verifier.sol#175-394)
FflonkVerifier.verifyProof.asm_0.checkField() (contracts/verifier.sol#396-401) uses assembly
        - INLINE ASM (contracts/verifier.sol#396-401)
FflonkVerifier.verifyProof.asm_0.checkPointBelongsToBN128Curve() (contracts/verifier.sol#403-416) uses assembly
        - INLINE ASM (contracts/verifier.sol#403-416)
FflonkVerifier.verifyProof.asm_0.checkProofData() (contracts/verifier.sol#418-452) uses assembly
        - INLINE ASM (contracts/verifier.sol#418-452)
FflonkVerifier.verifyProof.asm_0.computeChallenges() (contracts/verifier.sol#454-557) uses assembly
        - INLINE ASM (contracts/verifier.sol#454-557)
FflonkVerifier.verifyProof.asm_0.computeLiS0() (contracts/verifier.sol#559-612) uses assembly
        - INLINE ASM (contracts/verifier.sol#559-612)
FflonkVerifier.verifyProof.asm_0.computeLiS1() (contracts/verifier.sol#614-642) uses assembly
        - INLINE ASM (contracts/verifier.sol#614-642)
FflonkVerifier.verifyProof.asm_0.computeLiS2() (contracts/verifier.sol#644-681) uses assembly
        - INLINE ASM (contracts/verifier.sol#644-681)
FflonkVerifier.verifyProof.asm_0.computeInversions() (contracts/verifier.sol#684-739) uses assembly
        - INLINE ASM (contracts/verifier.sol#684-739)
FflonkVerifier.verifyProof.asm_0.computeLagrange() (contracts/verifier.sol#742-764) uses assembly
        - INLINE ASM (contracts/verifier.sol#742-764)
FflonkVerifier.verifyProof.asm_0.computePi() (contracts/verifier.sol#767-780) uses assembly
        - INLINE ASM (contracts/verifier.sol#767-780)
FflonkVerifier.verifyProof.asm_0.computeR0() (contracts/verifier.sol#786-966) uses assembly
        - INLINE ASM (contracts/verifier.sol#786-966)
FflonkVerifier.verifyProof.asm_0.computeR1() (contracts/verifier.sol#972-1041) uses assembly
        - INLINE ASM (contracts/verifier.sol#972-1041)
FflonkVerifier.verifyProof.asm_0.computeR2() (contracts/verifier.sol#1047-1136) uses assembly
        - INLINE ASM (contracts/verifier.sol#1047-1136)
FflonkVerifier.verifyProof.asm_0.g1_acc() (contracts/verifier.sol#1139-1152) uses assembly
        - INLINE ASM (contracts/verifier.sol#1139-1152)
FflonkVerifier.verifyProof.asm_0.g1_mulAcc() (contracts/verifier.sol#1155-1178) uses assembly
        - INLINE ASM (contracts/verifier.sol#1155-1178)
FflonkVerifier.verifyProof.asm_0.g1_mulAccC() (contracts/verifier.sol#1181-1204) uses assembly
        - INLINE ASM (contracts/verifier.sol#1181-1204)
FflonkVerifier.verifyProof.asm_0.computeFEJ() (contracts/verifier.sol#1206-1233) uses assembly
        - INLINE ASM (contracts/verifier.sol#1206-1233)
FflonkVerifier.verifyProof.asm_0.checkPairing() (contracts/verifier.sol#1236-1274) uses assembly
        - INLINE ASM (contracts/verifier.sol#1236-1274)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#assembly-usage
INFO:Detectors:
Detector: pragma
8 different versions of Solidity are used:
        - Version constraint ^0.8.20 is used by:
                -^0.8.20 (node_modules/@openzeppelin/contracts/access/Ownable.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/Context.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/Panic.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/Strings.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/introspection/ERC165.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/math/Math.sol#4)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/math/SafeCast.sol#5)
                -^0.8.20 (node_modules/@openzeppelin/contracts/utils/math/SignedMath.sol#4)
        - Version constraint >=0.4.16 is used by:
                ->=0.4.16 (node_modules/@openzeppelin/contracts/interfaces/IERC165.sol#4)
                ->=0.4.16 (node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol#4)
        - Version constraint >=0.6.2 is used by:
                ->=0.6.2 (node_modules/@openzeppelin/contracts/interfaces/IERC4906.sol#4)
                ->=0.6.2 (node_modules/@openzeppelin/contracts/interfaces/IERC721.sol#4)
                ->=0.6.2 (node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol#4)
                ->=0.6.2 (node_modules/@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol#4)
        - Version constraint >=0.8.4 is used by:
                ->=0.8.4 (node_modules/@openzeppelin/contracts/interfaces/draft-IERC6093.sol#3)
        - Version constraint >=0.5.0 is used by:
                ->=0.5.0 (node_modules/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol#4)
        - Version constraint ^0.8.0 is used by:
                -^0.8.0 (contracts/FflonkVerifierAdapter.sol#2)
                -^0.8.0 (contracts/KYCCompliance.sol#2)
        - Version constraint ^0.8.28 is used by:
                -^0.8.28 (contracts/MyNFT.sol#2)
        - Version constraint >=0.7.0<0.9.0 is used by:
                ->=0.7.0<0.9.0 (contracts/verifier.sol#21)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#different-pragma-directives-are-used
INFO:Detectors:
Detector: solc-version
Version constraint ^0.8.20 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
        - VerbatimInvalidDeduplication
        - FullInlinerNonExpressionSplitArgumentEvaluationOrder
        - MissingSideEffectsOnSelectorAccess.
It is used by:
        - ^0.8.20 (node_modules/@openzeppelin/contracts/access/Ownable.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/token/ERC721/utils/ERC721Utils.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/Context.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/Panic.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/Strings.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/introspection/ERC165.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/math/Math.sol#4)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/math/SafeCast.sol#5)
        - ^0.8.20 (node_modules/@openzeppelin/contracts/utils/math/SignedMath.sol#4)
Version constraint >=0.4.16 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
        - DirtyBytesArrayToStorage
        - ABIDecodeTwoDimensionalArrayMemory
        - KeccakCaching
        - EmptyByteArrayCopy
        - DynamicArrayCleanup
        - ImplicitConstructorCallvalueCheck
        - TupleAssignmentMultiStackSlotComponents
        - MemoryArrayCreationOverflow
        - privateCanBeOverridden
        - SignedArrayStorageCopy
        - ABIEncoderV2StorageArrayWithMultiSlotElement
        - DynamicConstructorArgumentsClippedABIV2
        - UninitializedFunctionPointerInConstructor_0.4.x
        - IncorrectEventSignatureInLibraries_0.4.x
        - ExpExponentCleanup
        - NestedArrayFunctionCallDecoder
        - ZeroFunctionSelector.
It is used by:
        - >=0.4.16 (node_modules/@openzeppelin/contracts/interfaces/IERC165.sol#4)
        - >=0.4.16 (node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol#4)
Version constraint >=0.6.2 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
        - MissingSideEffectsOnSelectorAccess
        - AbiReencodingHeadOverflowWithStaticArrayCleanup
        - DirtyBytesArrayToStorage
        - NestedCalldataArrayAbiReencodingSizeValidation
        - ABIDecodeTwoDimensionalArrayMemory
        - KeccakCaching
        - EmptyByteArrayCopy
        - DynamicArrayCleanup
        - MissingEscapingInFormatting
        - ArraySliceDynamicallyEncodedBaseType
        - ImplicitConstructorCallvalueCheck
        - TupleAssignmentMultiStackSlotComponents
        - MemoryArrayCreationOverflow.
It is used by:
        - >=0.6.2 (node_modules/@openzeppelin/contracts/interfaces/IERC4906.sol#4)
        - >=0.6.2 (node_modules/@openzeppelin/contracts/interfaces/IERC721.sol#4)
        - >=0.6.2 (node_modules/@openzeppelin/contracts/token/ERC721/IERC721.sol#4)
        - >=0.6.2 (node_modules/@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol#4)
Version constraint >=0.8.4 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
        - FullInlinerNonExpressionSplitArgumentEvaluationOrder
        - MissingSideEffectsOnSelectorAccess
        - AbiReencodingHeadOverflowWithStaticArrayCleanup
        - DirtyBytesArrayToStorage
        - DataLocationChangeInInternalOverride
        - NestedCalldataArrayAbiReencodingSizeValidation
        - SignedImmutables.
It is used by:
        - >=0.8.4 (node_modules/@openzeppelin/contracts/interfaces/draft-IERC6093.sol#3)
Version constraint >=0.5.0 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
        - DirtyBytesArrayToStorage
        - ABIDecodeTwoDimensionalArrayMemory
        - KeccakCaching
        - EmptyByteArrayCopy
        - DynamicArrayCleanup
        - ImplicitConstructorCallvalueCheck
        - TupleAssignmentMultiStackSlotComponents
        - MemoryArrayCreationOverflow
        - privateCanBeOverridden
        - SignedArrayStorageCopy
        - ABIEncoderV2StorageArrayWithMultiSlotElement
        - DynamicConstructorArgumentsClippedABIV2
        - UninitializedFunctionPointerInConstructor
        - IncorrectEventSignatureInLibraries
        - ABIEncoderV2PackedStorage.
It is used by:
        - >=0.5.0 (node_modules/@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol#4)
Version constraint ^0.8.0 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
        - FullInlinerNonExpressionSplitArgumentEvaluationOrder
        - MissingSideEffectsOnSelectorAccess
        - AbiReencodingHeadOverflowWithStaticArrayCleanup
        - DirtyBytesArrayToStorage
        - DataLocationChangeInInternalOverride
        - NestedCalldataArrayAbiReencodingSizeValidation
        - SignedImmutables
        - ABIDecodeTwoDimensionalArrayMemory
        - KeccakCaching.
It is used by:
        - ^0.8.0 (contracts/FflonkVerifierAdapter.sol#2)
        - ^0.8.0 (contracts/KYCCompliance.sol#2)
Version constraint >=0.7.0<0.9.0 is too complex.
It is used by:
        - >=0.7.0<0.9.0 (contracts/verifier.sol#21)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity
INFO:Detectors:
Detector: missing-inheritance
FflonkVerifierAdapter (contracts/FflonkVerifierAdapter.sol#6-52) should inherit from IProofVerifier (contracts/KYCCompliance.sol#4-6)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance
INFO:Detectors:
Detector: naming-convention
Constant FflonkVerifier.n (contracts/verifier.sol#24) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.k1 (contracts/verifier.sol#27) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.k2 (contracts/verifier.sol#28) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w1 (contracts/verifier.sol#32) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.wr (contracts/verifier.sol#33) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w3 (contracts/verifier.sol#35) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w3_2 (contracts/verifier.sol#36) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w4 (contracts/verifier.sol#38) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w4_2 (contracts/verifier.sol#39) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w4_3 (contracts/verifier.sol#40) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_1 (contracts/verifier.sol#42) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_2 (contracts/verifier.sol#43) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_3 (contracts/verifier.sol#44) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_4 (contracts/verifier.sol#45) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_5 (contracts/verifier.sol#46) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_6 (contracts/verifier.sol#47) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.w8_7 (contracts/verifier.sol#48) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.C0x (contracts/verifier.sol#51) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.C0y (contracts/verifier.sol#52) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.X2x1 (contracts/verifier.sol#55) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.X2x2 (contracts/verifier.sol#56) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.X2y1 (contracts/verifier.sol#57) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.X2y2 (contracts/verifier.sol#58) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.q (contracts/verifier.sol#61) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.qf (contracts/verifier.sol#63) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.G1x (contracts/verifier.sol#65) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.G1y (contracts/verifier.sol#66) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.G2x1 (contracts/verifier.sol#68) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.G2x2 (contracts/verifier.sol#69) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.G2y1 (contracts/verifier.sol#70) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.G2y2 (contracts/verifier.sol#71) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pC1 (contracts/verifier.sol#76) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pC2 (contracts/verifier.sol#77) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pW1 (contracts/verifier.sol#78) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pW2 (contracts/verifier.sol#79) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_ql (contracts/verifier.sol#81) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_qr (contracts/verifier.sol#82) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_qm (contracts/verifier.sol#83) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_qo (contracts/verifier.sol#84) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_qc (contracts/verifier.sol#85) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_s1 (contracts/verifier.sol#86) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_s2 (contracts/verifier.sol#87) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_s3 (contracts/verifier.sol#88) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_a (contracts/verifier.sol#89) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_b (contracts/verifier.sol#90) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_c (contracts/verifier.sol#91) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_z (contracts/verifier.sol#92) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_zw (contracts/verifier.sol#93) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_t1w (contracts/verifier.sol#94) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_t2w (contracts/verifier.sol#95) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_inv (contracts/verifier.sol#96) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pAlpha (contracts/verifier.sol#102) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pBeta (contracts/verifier.sol#103) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pGamma (contracts/verifier.sol#104) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pY (contracts/verifier.sol#105) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pXiSeed (contracts/verifier.sol#106) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pXiSeed2 (contracts/verifier.sol#107) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pXi (contracts/verifier.sol#108) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_0 (contracts/verifier.sol#112) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_1 (contracts/verifier.sol#113) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_2 (contracts/verifier.sol#114) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_3 (contracts/verifier.sol#115) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_4 (contracts/verifier.sol#116) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_5 (contracts/verifier.sol#117) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_6 (contracts/verifier.sol#118) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH0w8_7 (contracts/verifier.sol#119) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH1w4_0 (contracts/verifier.sol#122) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH1w4_1 (contracts/verifier.sol#123) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH1w4_2 (contracts/verifier.sol#124) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH1w4_3 (contracts/verifier.sol#125) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH2w3_0 (contracts/verifier.sol#129) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH2w3_1 (contracts/verifier.sol#130) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH2w3_2 (contracts/verifier.sol#131) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH3w3_0 (contracts/verifier.sol#133) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH3w3_1 (contracts/verifier.sol#134) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pH3w3_2 (contracts/verifier.sol#135) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pPi (contracts/verifier.sol#137) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pR0 (contracts/verifier.sol#138) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pR1 (contracts/verifier.sol#139) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pR2 (contracts/verifier.sol#140) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pF (contracts/verifier.sol#142) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pE (contracts/verifier.sol#143) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pJ (contracts/verifier.sol#144) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pZh (contracts/verifier.sol#146) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pZhInv (contracts/verifier.sol#148) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pDenH1 (contracts/verifier.sol#149) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pDenH2 (contracts/verifier.sol#150) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pLiS0Inv (contracts/verifier.sol#151) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pLiS1Inv (contracts/verifier.sol#152) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pLiS2Inv (contracts/verifier.sol#153) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_l1 (contracts/verifier.sol#156) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_l2 (contracts/verifier.sol#158) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_l3 (contracts/verifier.sol#160) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_l4 (contracts/verifier.sol#162) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.pEval_l5 (contracts/verifier.sol#164) is not in UPPER_CASE_WITH_UNDERSCORES
Constant FflonkVerifier.lastMem (contracts/verifier.sol#167) is not in UPPER_CASE_WITH_UNDERSCORES
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
INFO:Detectors:
Detector: reentrancy-unlimited-gas
Reentrancy in MyNFT.purchaseAndTransferNFT(uint256,string,address) (contracts/MyNFT.sol#161-190):
        External calls:
        - address(msg.sender).transfer(msg.value - price) (contracts/MyNFT.sol#172)
        State variables written after the call(s):
        - _transfer(owner(),recipientAddress,tokenId) (contracts/MyNFT.sol#189)
                - _balances[from] -= 1 (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#230)
                - _balances[to] += 1 (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#236)
        - _didOwners[tokenId] = buyerDID (contracts/MyNFT.sol#176)
        - _didToAddress[buyerDID] = recipientAddress (contracts/MyNFT.sol#184)
        - _transfer(owner(),recipientAddress,tokenId) (contracts/MyNFT.sol#189)
                - _owners[tokenId] = to (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#240)
        - _prices[tokenId] = 0 (contracts/MyNFT.sol#177)
        - _transfer(owner(),recipientAddress,tokenId) (contracts/MyNFT.sol#189)
                - _tokenApprovals[tokenId] = to (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#398)
        Event emitted after the call(s):
        - Approval(owner,to,tokenId) (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#394)
                - _transfer(owner(),recipientAddress,tokenId) (contracts/MyNFT.sol#189)
        - DIDLinked(buyerDID,recipientAddress) (contracts/MyNFT.sol#185)
        - DIDOwnershipTransferred(tokenId,,buyerDID) (contracts/MyNFT.sol#180)
        - NFTPurchased(tokenId,buyerDID,price) (contracts/MyNFT.sol#179)
        - Transfer(from,to,tokenId) (node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol#242)
                - _transfer(owner(),recipientAddress,tokenId) (contracts/MyNFT.sol#189)
Reentrancy in MyNFT.purchaseNFT(uint256,string) (contracts/MyNFT.sol#85-107):
        External calls:
        - address(owner()).transfer(price) (contracts/MyNFT.sol#94)
        - address(msg.sender).transfer(msg.value - price) (contracts/MyNFT.sol#98)
        State variables written after the call(s):
        - _didOwners[tokenId] = buyerDID (contracts/MyNFT.sol#102)
        - _prices[tokenId] = 0 (contracts/MyNFT.sol#103)
        Event emitted after the call(s):
        - DIDOwnershipTransferred(tokenId,,buyerDID) (contracts/MyNFT.sol#106)
        - NFTPurchased(tokenId,buyerDID,price) (contracts/MyNFT.sol#105)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-5
INFO:Detectors:
Detector: too-many-digits
Math.log2(uint256) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#612-651) uses literals with too many digits:
        - r = r | byte(uint256,uint256)(x >> r,0x0000010102020202030303030303030300000000000000000000000000000000) (node_modules/@openzeppelin/contracts/utils/math/Math.sol#649)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#too-many-digits
INFO:Detectors:
Detector: immutable-states
FflonkVerifierAdapter.fflonkVerifier (contracts/FflonkVerifierAdapter.sol#7) should be immutable
KYCCompliance.admin (contracts/KYCCompliance.sol#13) should be immutable
KYCCompliance.verifier (contracts/KYCCompliance.sol#12) should be immutable
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#state-variables-that-could-be-declared-immutable
INFO:Slither:. analyzed (24 contracts with 102 detectors), 178 result(s) found