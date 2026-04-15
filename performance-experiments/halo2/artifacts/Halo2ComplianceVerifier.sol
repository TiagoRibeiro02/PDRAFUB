
// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract Halo2Verifier {
    fallback(bytes calldata) external returns (bytes memory) {
        assembly ("memory-safe") {
            // Enforce that Solidity memory layout is respected
            let data := mload(0x40)
            if iszero(eq(data, 0x80)) {
                revert(0, 0)
            }

            let success := true
            let f_p := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
            let f_q := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
            function validate_ec_point(x, y) -> valid {
                {
                    let x_lt_p := lt(x, 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47)
                    let y_lt_p := lt(y, 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47)
                    valid := and(x_lt_p, y_lt_p)
                }
                {
                    let y_square := mulmod(y, y, 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47)
                    let x_square := mulmod(x, x, 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47)
                    let x_cube := mulmod(x_square, x, 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47)
                    let x_cube_plus_3 := addmod(x_cube, 3, 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47)
                    let is_affine := eq(x_cube_plus_3, y_square)
                    valid := and(valid, is_affine)
                }
            }
            mstore(0xa0, mod(calldataload(0x0), f_q))
mstore(0xc0, mod(calldataload(0x20), f_q))
mstore(0xe0, mod(calldataload(0x40), f_q))
mstore(0x80, 216009333571474041051036300685676054406633393719607454603336567728204536699)

        {
            let x := calldataload(0x60)
            mstore(0x100, x)
            let y := calldataload(0x80)
            mstore(0x120, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0xa0)
            mstore(0x140, x)
            let y := calldataload(0xc0)
            mstore(0x160, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0xe0)
            mstore(0x180, x)
            let y := calldataload(0x100)
            mstore(0x1a0, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x120)
            mstore(0x1c0, x)
            let y := calldataload(0x140)
            mstore(0x1e0, y)
            success := and(validate_ec_point(x, y), success)
        }
mstore(0x200, keccak256(0x80, 384))
{
            let hash := mload(0x200)
            mstore(0x220, mod(hash, f_q))
            mstore(0x240, hash)
        }
mstore8(608, 1)
mstore(0x260, keccak256(0x240, 33))
{
            let hash := mload(0x260)
            mstore(0x280, mod(hash, f_q))
            mstore(0x2a0, hash)
        }
mstore8(704, 1)
mstore(0x2c0, keccak256(0x2a0, 33))
{
            let hash := mload(0x2c0)
            mstore(0x2e0, mod(hash, f_q))
            mstore(0x300, hash)
        }

        {
            let x := calldataload(0x160)
            mstore(0x320, x)
            let y := calldataload(0x180)
            mstore(0x340, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x1a0)
            mstore(0x360, x)
            let y := calldataload(0x1c0)
            mstore(0x380, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x1e0)
            mstore(0x3a0, x)
            let y := calldataload(0x200)
            mstore(0x3c0, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x220)
            mstore(0x3e0, x)
            let y := calldataload(0x240)
            mstore(0x400, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x260)
            mstore(0x420, x)
            let y := calldataload(0x280)
            mstore(0x440, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x2a0)
            mstore(0x460, x)
            let y := calldataload(0x2c0)
            mstore(0x480, y)
            success := and(validate_ec_point(x, y), success)
        }
mstore(0x4a0, keccak256(0x300, 416))
{
            let hash := mload(0x4a0)
            mstore(0x4c0, mod(hash, f_q))
            mstore(0x4e0, hash)
        }

        {
            let x := calldataload(0x2e0)
            mstore(0x500, x)
            let y := calldataload(0x300)
            mstore(0x520, y)
            success := and(validate_ec_point(x, y), success)
        }

        {
            let x := calldataload(0x320)
            mstore(0x540, x)
            let y := calldataload(0x340)
            mstore(0x560, y)
            success := and(validate_ec_point(x, y), success)
        }
mstore(0x580, keccak256(0x4e0, 160))
{
            let hash := mload(0x580)
            mstore(0x5a0, mod(hash, f_q))
            mstore(0x5c0, hash)
        }
mstore(0x5e0, mod(calldataload(0x360), f_q))
mstore(0x600, mod(calldataload(0x380), f_q))
mstore(0x620, mod(calldataload(0x3a0), f_q))
mstore(0x640, mod(calldataload(0x3c0), f_q))
mstore(0x660, mod(calldataload(0x3e0), f_q))
mstore(0x680, mod(calldataload(0x400), f_q))
mstore(0x6a0, mod(calldataload(0x420), f_q))
mstore(0x6c0, mod(calldataload(0x440), f_q))
mstore(0x6e0, mod(calldataload(0x460), f_q))
mstore(0x700, mod(calldataload(0x480), f_q))
mstore(0x720, mod(calldataload(0x4a0), f_q))
mstore(0x740, mod(calldataload(0x4c0), f_q))
mstore(0x760, mod(calldataload(0x4e0), f_q))
mstore(0x780, mod(calldataload(0x500), f_q))
mstore(0x7a0, mod(calldataload(0x520), f_q))
mstore(0x7c0, mod(calldataload(0x540), f_q))
mstore(0x7e0, mod(calldataload(0x560), f_q))
mstore(0x800, mod(calldataload(0x580), f_q))
mstore(0x820, mod(calldataload(0x5a0), f_q))
mstore(0x840, mod(calldataload(0x5c0), f_q))
mstore(0x860, mod(calldataload(0x5e0), f_q))
mstore(0x880, mod(calldataload(0x600), f_q))
mstore(0x8a0, mod(calldataload(0x620), f_q))
mstore(0x8c0, mod(calldataload(0x640), f_q))
mstore(0x8e0, mod(calldataload(0x660), f_q))
mstore(0x900, keccak256(0x5c0, 832))
{
            let hash := mload(0x900)
            mstore(0x920, mod(hash, f_q))
            mstore(0x940, hash)
        }
mstore8(2400, 1)
mstore(0x960, keccak256(0x940, 33))
{
            let hash := mload(0x960)
            mstore(0x980, mod(hash, f_q))
            mstore(0x9a0, hash)
        }

        {
            let x := calldataload(0x680)
            mstore(0x9c0, x)
            let y := calldataload(0x6a0)
            mstore(0x9e0, y)
            success := and(validate_ec_point(x, y), success)
        }
mstore(0xa00, keccak256(0x9a0, 96))
{
            let hash := mload(0xa00)
            mstore(0xa20, mod(hash, f_q))
            mstore(0xa40, hash)
        }

        {
            let x := calldataload(0x6c0)
            mstore(0xa60, x)
            let y := calldataload(0x6e0)
            mstore(0xa80, y)
            success := and(validate_ec_point(x, y), success)
        }
mstore(0xaa0, mulmod(mload(0x5a0), mload(0x5a0), f_q))
mstore(0xac0, mulmod(mload(0xaa0), mload(0xaa0), f_q))
mstore(0xae0, mulmod(mload(0xac0), mload(0xac0), f_q))
mstore(0xb00, mulmod(mload(0xae0), mload(0xae0), f_q))
mstore(0xb20, mulmod(mload(0xb00), mload(0xb00), f_q))
mstore(0xb40, mulmod(mload(0xb20), mload(0xb20), f_q))
mstore(0xb60, mulmod(mload(0xb40), mload(0xb40), f_q))
mstore(0xb80, mulmod(mload(0xb60), mload(0xb60), f_q))
mstore(0xba0, mulmod(mload(0xb80), mload(0xb80), f_q))
mstore(0xbc0, mulmod(mload(0xba0), mload(0xba0), f_q))
mstore(0xbe0, mulmod(mload(0xbc0), mload(0xbc0), f_q))
mstore(0xc00, mulmod(mload(0xbe0), mload(0xbe0), f_q))
mstore(0xc20, addmod(mload(0xc00), 21888242871839275222246405745257275088548364400416034343698204186575808495616, f_q))
mstore(0xc40, mulmod(mload(0xc20), 21882899062544392586694099493854624386622449272388589022813512242194320261121, f_q))
mstore(0xc60, mulmod(mload(0xc40), 18302882236472339419631414285403968768409802182737928837767912484847322191909, f_q))
mstore(0xc80, addmod(mload(0x5a0), 3585360635366935802614991459853306320138562217678105505930291701728486303708, f_q))
mstore(0xca0, mulmod(mload(0xc40), 11537035432936037313763253554381703723723793827542696094189990411849785474670, f_q))
mstore(0xcc0, addmod(mload(0x5a0), 10351207438903237908483152190875571364824570572873338249508213774726023020947, f_q))
mstore(0xce0, mulmod(mload(0xc40), 4925592601992654644734291590386747644864797672605745962807370354577123815907, f_q))
mstore(0xd00, addmod(mload(0x5a0), 16962650269846620577512114154870527443683566727810288380890833831998684679710, f_q))
mstore(0xd20, mulmod(mload(0xc40), 14428378809216400477736413013847344056809954101862299032583274736599544656045, f_q))
mstore(0xd40, addmod(mload(0x5a0), 7459864062622874744509992731409931031738410298553735311114929449976263839572, f_q))
mstore(0xd60, mulmod(mload(0xc40), 19444693496467964793333684482470811869395409953158764080291550423779334624794, f_q))
mstore(0xd80, addmod(mload(0x5a0), 2443549375371310428912721262786463219152954447257270263406653762796473870823, f_q))
mstore(0xda0, mulmod(mload(0xc40), 10679069158860809785885364198325818746230765378937472123583344754591056515264, f_q))
mstore(0xdc0, addmod(mload(0x5a0), 11209173712978465436361041546931456342317599021478562220114859431984751980353, f_q))
mstore(0xde0, mulmod(mload(0xc40), 1, f_q))
mstore(0xe00, addmod(mload(0x5a0), 21888242871839275222246405745257275088548364400416034343698204186575808495616, f_q))
mstore(0xe20, mulmod(mload(0xc40), 21430327775050057859055751320913139171897713365144575466426070809149931679462, f_q))
mstore(0xe40, addmod(mload(0x5a0), 457915096789217363190654424344135916650651035271458877272133377425876816155, f_q))
mstore(0xe60, mulmod(mload(0xc40), 9396103202274256930945606623206526900461945684265495839012435492634193195103, f_q))
mstore(0xe80, addmod(mload(0x5a0), 12492139669565018291300799122050748188086418716150538504685768693941615300514, f_q))
{
            let prod := mload(0xc80)

                prod := mulmod(mload(0xcc0), prod, f_q)
                mstore(0xea0, prod)
            
                prod := mulmod(mload(0xd00), prod, f_q)
                mstore(0xec0, prod)
            
                prod := mulmod(mload(0xd40), prod, f_q)
                mstore(0xee0, prod)
            
                prod := mulmod(mload(0xd80), prod, f_q)
                mstore(0xf00, prod)
            
                prod := mulmod(mload(0xdc0), prod, f_q)
                mstore(0xf20, prod)
            
                prod := mulmod(mload(0xe00), prod, f_q)
                mstore(0xf40, prod)
            
                prod := mulmod(mload(0xe40), prod, f_q)
                mstore(0xf60, prod)
            
                prod := mulmod(mload(0xe80), prod, f_q)
                mstore(0xf80, prod)
            
                prod := mulmod(mload(0xc20), prod, f_q)
                mstore(0xfa0, prod)
            
        }
mstore(0xfe0, 32)
mstore(0x1000, 32)
mstore(0x1020, 32)
mstore(0x1040, mload(0xfa0))
mstore(0x1060, 21888242871839275222246405745257275088548364400416034343698204186575808495615)
mstore(0x1080, 21888242871839275222246405745257275088548364400416034343698204186575808495617)
success := and(eq(staticcall(gas(), 0x5, 0xfe0, 0xc0, 0xfc0, 0x20), 1), success)
{
            
            let inv := mload(0xfc0)
            let v
        
                    v := mload(0xc20)
                    mstore(3104, mulmod(mload(0xf80), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xe80)
                    mstore(3712, mulmod(mload(0xf60), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xe40)
                    mstore(3648, mulmod(mload(0xf40), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xe00)
                    mstore(3584, mulmod(mload(0xf20), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xdc0)
                    mstore(3520, mulmod(mload(0xf00), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xd80)
                    mstore(3456, mulmod(mload(0xee0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xd40)
                    mstore(3392, mulmod(mload(0xec0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xd00)
                    mstore(3328, mulmod(mload(0xea0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0xcc0)
                    mstore(3264, mulmod(mload(0xc80), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                mstore(0xc80, inv)

        }
mstore(0x10a0, mulmod(mload(0xc60), mload(0xc80), f_q))
mstore(0x10c0, mulmod(mload(0xca0), mload(0xcc0), f_q))
mstore(0x10e0, mulmod(mload(0xce0), mload(0xd00), f_q))
mstore(0x1100, mulmod(mload(0xd20), mload(0xd40), f_q))
mstore(0x1120, mulmod(mload(0xd60), mload(0xd80), f_q))
mstore(0x1140, mulmod(mload(0xda0), mload(0xdc0), f_q))
mstore(0x1160, mulmod(mload(0xde0), mload(0xe00), f_q))
mstore(0x1180, mulmod(mload(0xe20), mload(0xe40), f_q))
mstore(0x11a0, mulmod(mload(0xe60), mload(0xe80), f_q))
{
            let result := mulmod(mload(0x1160), mload(0xa0), f_q)
result := addmod(mulmod(mload(0x1180), mload(0xc0), f_q), result, f_q)
result := addmod(mulmod(mload(0x11a0), mload(0xe0), f_q), result, f_q)
mstore(4544, result)
        }
mstore(0x11e0, addmod(mload(0x600), 21888242871839275222246405745257275088548364400416034343698204186575808495616, f_q))
mstore(0x1200, mulmod(mload(0x11e0), mload(0x660), f_q))
mstore(0x1220, mulmod(mload(0x4c0), mload(0x1200), f_q))
mstore(0x1240, addmod(mload(0x5e0), mload(0x600), f_q))
mstore(0x1260, addmod(mload(0x1240), mload(0x620), f_q))
mstore(0x1280, addmod(mload(0x1260), sub(f_q, mload(0x640)), f_q))
mstore(0x12a0, mulmod(mload(0x1280), mload(0x660), f_q))
mstore(0x12c0, addmod(mload(0x1220), mload(0x12a0), f_q))
mstore(0x12e0, mulmod(mload(0x4c0), mload(0x12c0), f_q))
mstore(0x1300, addmod(1, sub(f_q, mload(0x740)), f_q))
mstore(0x1320, mulmod(mload(0x1300), mload(0x1160), f_q))
mstore(0x1340, addmod(mload(0x12e0), mload(0x1320), f_q))
mstore(0x1360, mulmod(mload(0x4c0), mload(0x1340), f_q))
mstore(0x1380, mulmod(mload(0x8c0), mload(0x8c0), f_q))
mstore(0x13a0, addmod(mload(0x1380), sub(f_q, mload(0x8c0)), f_q))
mstore(0x13c0, mulmod(mload(0x13a0), mload(0x10a0), f_q))
mstore(0x13e0, addmod(mload(0x1360), mload(0x13c0), f_q))
mstore(0x1400, mulmod(mload(0x4c0), mload(0x13e0), f_q))
mstore(0x1420, addmod(mload(0x7a0), sub(f_q, mload(0x780)), f_q))
mstore(0x1440, mulmod(mload(0x1420), mload(0x1160), f_q))
mstore(0x1460, addmod(mload(0x1400), mload(0x1440), f_q))
mstore(0x1480, mulmod(mload(0x4c0), mload(0x1460), f_q))
mstore(0x14a0, addmod(mload(0x800), sub(f_q, mload(0x7e0)), f_q))
mstore(0x14c0, mulmod(mload(0x14a0), mload(0x1160), f_q))
mstore(0x14e0, addmod(mload(0x1480), mload(0x14c0), f_q))
mstore(0x1500, mulmod(mload(0x4c0), mload(0x14e0), f_q))
mstore(0x1520, addmod(mload(0x860), sub(f_q, mload(0x840)), f_q))
mstore(0x1540, mulmod(mload(0x1520), mload(0x1160), f_q))
mstore(0x1560, addmod(mload(0x1500), mload(0x1540), f_q))
mstore(0x1580, mulmod(mload(0x4c0), mload(0x1560), f_q))
mstore(0x15a0, addmod(mload(0x8c0), sub(f_q, mload(0x8a0)), f_q))
mstore(0x15c0, mulmod(mload(0x15a0), mload(0x1160), f_q))
mstore(0x15e0, addmod(mload(0x1580), mload(0x15c0), f_q))
mstore(0x1600, mulmod(mload(0x4c0), mload(0x15e0), f_q))
mstore(0x1620, addmod(1, sub(f_q, mload(0x10a0)), f_q))
mstore(0x1640, addmod(mload(0x10c0), mload(0x10e0), f_q))
mstore(0x1660, addmod(mload(0x1640), mload(0x1100), f_q))
mstore(0x1680, addmod(mload(0x1660), mload(0x1120), f_q))
mstore(0x16a0, addmod(mload(0x1680), mload(0x1140), f_q))
mstore(0x16c0, addmod(mload(0x1620), sub(f_q, mload(0x16a0)), f_q))
mstore(0x16e0, mulmod(mload(0x6a0), mload(0x280), f_q))
mstore(0x1700, addmod(mload(0x5e0), mload(0x16e0), f_q))
mstore(0x1720, addmod(mload(0x1700), mload(0x2e0), f_q))
mstore(0x1740, mulmod(mload(0x1720), mload(0x760), f_q))
mstore(0x1760, mulmod(1, mload(0x280), f_q))
mstore(0x1780, mulmod(mload(0x5a0), mload(0x1760), f_q))
mstore(0x17a0, addmod(mload(0x5e0), mload(0x1780), f_q))
mstore(0x17c0, addmod(mload(0x17a0), mload(0x2e0), f_q))
mstore(0x17e0, mulmod(mload(0x17c0), mload(0x740), f_q))
mstore(0x1800, addmod(mload(0x1740), sub(f_q, mload(0x17e0)), f_q))
mstore(0x1820, mulmod(mload(0x1800), mload(0x16c0), f_q))
mstore(0x1840, addmod(mload(0x1600), mload(0x1820), f_q))
mstore(0x1860, mulmod(mload(0x4c0), mload(0x1840), f_q))
mstore(0x1880, mulmod(mload(0x6c0), mload(0x280), f_q))
mstore(0x18a0, addmod(mload(0x600), mload(0x1880), f_q))
mstore(0x18c0, addmod(mload(0x18a0), mload(0x2e0), f_q))
mstore(0x18e0, mulmod(mload(0x18c0), mload(0x7c0), f_q))
mstore(0x1900, mulmod(4131629893567559867359510883348571134090853742863529169391034518566172092834, mload(0x280), f_q))
mstore(0x1920, mulmod(mload(0x5a0), mload(0x1900), f_q))
mstore(0x1940, addmod(mload(0x600), mload(0x1920), f_q))
mstore(0x1960, addmod(mload(0x1940), mload(0x2e0), f_q))
mstore(0x1980, mulmod(mload(0x1960), mload(0x7a0), f_q))
mstore(0x19a0, addmod(mload(0x18e0), sub(f_q, mload(0x1980)), f_q))
mstore(0x19c0, mulmod(mload(0x19a0), mload(0x16c0), f_q))
mstore(0x19e0, addmod(mload(0x1860), mload(0x19c0), f_q))
mstore(0x1a00, mulmod(mload(0x4c0), mload(0x19e0), f_q))
mstore(0x1a20, mulmod(mload(0x6e0), mload(0x280), f_q))
mstore(0x1a40, addmod(mload(0x620), mload(0x1a20), f_q))
mstore(0x1a60, addmod(mload(0x1a40), mload(0x2e0), f_q))
mstore(0x1a80, mulmod(mload(0x1a60), mload(0x820), f_q))
mstore(0x1aa0, mulmod(8910878055287538404433155982483128285667088683464058436815641868457422632747, mload(0x280), f_q))
mstore(0x1ac0, mulmod(mload(0x5a0), mload(0x1aa0), f_q))
mstore(0x1ae0, addmod(mload(0x620), mload(0x1ac0), f_q))
mstore(0x1b00, addmod(mload(0x1ae0), mload(0x2e0), f_q))
mstore(0x1b20, mulmod(mload(0x1b00), mload(0x800), f_q))
mstore(0x1b40, addmod(mload(0x1a80), sub(f_q, mload(0x1b20)), f_q))
mstore(0x1b60, mulmod(mload(0x1b40), mload(0x16c0), f_q))
mstore(0x1b80, addmod(mload(0x1a00), mload(0x1b60), f_q))
mstore(0x1ba0, mulmod(mload(0x4c0), mload(0x1b80), f_q))
mstore(0x1bc0, mulmod(mload(0x700), mload(0x280), f_q))
mstore(0x1be0, addmod(mload(0x640), mload(0x1bc0), f_q))
mstore(0x1c00, addmod(mload(0x1be0), mload(0x2e0), f_q))
mstore(0x1c20, mulmod(mload(0x1c00), mload(0x880), f_q))
mstore(0x1c40, mulmod(11166246659983828508719468090013646171463329086121580628794302409516816350802, mload(0x280), f_q))
mstore(0x1c60, mulmod(mload(0x5a0), mload(0x1c40), f_q))
mstore(0x1c80, addmod(mload(0x640), mload(0x1c60), f_q))
mstore(0x1ca0, addmod(mload(0x1c80), mload(0x2e0), f_q))
mstore(0x1cc0, mulmod(mload(0x1ca0), mload(0x860), f_q))
mstore(0x1ce0, addmod(mload(0x1c20), sub(f_q, mload(0x1cc0)), f_q))
mstore(0x1d00, mulmod(mload(0x1ce0), mload(0x16c0), f_q))
mstore(0x1d20, addmod(mload(0x1ba0), mload(0x1d00), f_q))
mstore(0x1d40, mulmod(mload(0x4c0), mload(0x1d20), f_q))
mstore(0x1d60, mulmod(mload(0x720), mload(0x280), f_q))
mstore(0x1d80, addmod(mload(0x11c0), mload(0x1d60), f_q))
mstore(0x1da0, addmod(mload(0x1d80), mload(0x2e0), f_q))
mstore(0x1dc0, mulmod(mload(0x1da0), mload(0x8e0), f_q))
mstore(0x1de0, mulmod(284840088355319032285349970403338060113257071685626700086398481893096618818, mload(0x280), f_q))
mstore(0x1e00, mulmod(mload(0x5a0), mload(0x1de0), f_q))
mstore(0x1e20, addmod(mload(0x11c0), mload(0x1e00), f_q))
mstore(0x1e40, addmod(mload(0x1e20), mload(0x2e0), f_q))
mstore(0x1e60, mulmod(mload(0x1e40), mload(0x8c0), f_q))
mstore(0x1e80, addmod(mload(0x1dc0), sub(f_q, mload(0x1e60)), f_q))
mstore(0x1ea0, mulmod(mload(0x1e80), mload(0x16c0), f_q))
mstore(0x1ec0, addmod(mload(0x1d40), mload(0x1ea0), f_q))
mstore(0x1ee0, mulmod(mload(0xc00), mload(0xc00), f_q))
mstore(0x1f00, mulmod(1, mload(0xc00), f_q))
mstore(0x1f20, mulmod(mload(0x1ec0), mload(0xc20), f_q))
mstore(0x1f40, mulmod(mload(0xaa0), mload(0x5a0), f_q))
mstore(0x1f60, mulmod(mload(0x5a0), 18302882236472339419631414285403968768409802182737928837767912484847322191909, f_q))
mstore(0x1f80, addmod(mload(0xa20), sub(f_q, mload(0x1f60)), f_q))
mstore(0x1fa0, mulmod(mload(0x5a0), 1, f_q))
mstore(0x1fc0, addmod(mload(0xa20), sub(f_q, mload(0x1fa0)), f_q))
mstore(0x1fe0, mulmod(mload(0x5a0), 21430327775050057859055751320913139171897713365144575466426070809149931679462, f_q))
mstore(0x2000, addmod(mload(0xa20), sub(f_q, mload(0x1fe0)), f_q))
{
            let result := mulmod(mload(0xa20), 1, f_q)
result := addmod(mulmod(mload(0x5a0), 21888242871839275222246405745257275088548364400416034343698204186575808495616, f_q), result, f_q)
mstore(8224, result)
        }
mstore(0x2040, mulmod(1, mload(0x1fc0), f_q))
mstore(0x2060, mulmod(15580311165092190479568899438579145960513007080492260477392415491004148594534, mload(0xaa0), f_q))
mstore(0x2080, mulmod(mload(0x2060), 1, f_q))
{
            let result := mulmod(mload(0xa20), mload(0x2060), f_q)
result := addmod(mulmod(mload(0x5a0), sub(f_q, mload(0x2080)), f_q), result, f_q)
mstore(8352, result)
        }
mstore(0x20c0, mulmod(16619865102599776400004421778572927861798605074732187459862490943057606728497, mload(0xaa0), f_q))
mstore(0x20e0, mulmod(mload(0x20c0), 21430327775050057859055751320913139171897713365144575466426070809149931679462, f_q))
{
            let result := mulmod(mload(0xa20), mload(0x20c0), f_q)
result := addmod(mulmod(mload(0x5a0), sub(f_q, mload(0x20e0)), f_q), result, f_q)
mstore(8448, result)
        }
mstore(0x2120, mulmod(7289439916575765440481729555694294960381907306026873983668566448034030185301, mload(0xaa0), f_q))
mstore(0x2140, mulmod(mload(0x2120), 18302882236472339419631414285403968768409802182737928837767912484847322191909, f_q))
{
            let result := mulmod(mload(0xa20), mload(0x2120), f_q)
result := addmod(mulmod(mload(0x5a0), sub(f_q, mload(0x2140)), f_q), result, f_q)
mstore(8544, result)
        }
mstore(0x2180, mulmod(mload(0x2040), mload(0x2000), f_q))
mstore(0x21a0, mulmod(mload(0x2180), mload(0x1f80), f_q))
mstore(0x21c0, mulmod(457915096789217363190654424344135916650651035271458877272133377425876816156, mload(0x5a0), f_q))
mstore(0x21e0, mulmod(mload(0x21c0), 1, f_q))
{
            let result := mulmod(mload(0xa20), mload(0x21c0), f_q)
result := addmod(mulmod(mload(0x5a0), sub(f_q, mload(0x21e0)), f_q), result, f_q)
mstore(8704, result)
        }
mstore(0x2220, mulmod(21430327775050057859055751320913139171897713365144575466426070809149931679461, mload(0x5a0), f_q))
mstore(0x2240, mulmod(mload(0x2220), 21430327775050057859055751320913139171897713365144575466426070809149931679462, f_q))
{
            let result := mulmod(mload(0xa20), mload(0x2220), f_q)
result := addmod(mulmod(mload(0x5a0), sub(f_q, mload(0x2240)), f_q), result, f_q)
mstore(8800, result)
        }
{
            let prod := mload(0x2020)

                prod := mulmod(mload(0x20a0), prod, f_q)
                mstore(0x2280, prod)
            
                prod := mulmod(mload(0x2100), prod, f_q)
                mstore(0x22a0, prod)
            
                prod := mulmod(mload(0x2160), prod, f_q)
                mstore(0x22c0, prod)
            
                prod := mulmod(mload(0x21a0), prod, f_q)
                mstore(0x22e0, prod)
            
                prod := mulmod(mload(0x2200), prod, f_q)
                mstore(0x2300, prod)
            
                prod := mulmod(mload(0x2260), prod, f_q)
                mstore(0x2320, prod)
            
                prod := mulmod(mload(0x2180), prod, f_q)
                mstore(0x2340, prod)
            
        }
mstore(0x2380, 32)
mstore(0x23a0, 32)
mstore(0x23c0, 32)
mstore(0x23e0, mload(0x2340))
mstore(0x2400, 21888242871839275222246405745257275088548364400416034343698204186575808495615)
mstore(0x2420, 21888242871839275222246405745257275088548364400416034343698204186575808495617)
success := and(eq(staticcall(gas(), 0x5, 0x2380, 0xc0, 0x2360, 0x20), 1), success)
{
            
            let inv := mload(0x2360)
            let v
        
                    v := mload(0x2180)
                    mstore(8576, mulmod(mload(0x2320), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x2260)
                    mstore(8800, mulmod(mload(0x2300), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x2200)
                    mstore(8704, mulmod(mload(0x22e0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x21a0)
                    mstore(8608, mulmod(mload(0x22c0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x2160)
                    mstore(8544, mulmod(mload(0x22a0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x2100)
                    mstore(8448, mulmod(mload(0x2280), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x20a0)
                    mstore(8352, mulmod(mload(0x2020), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                mstore(0x2020, inv)

        }
{
            let result := mload(0x2020)
mstore(9280, result)
        }
mstore(0x2460, mulmod(mload(0x2040), mload(0x21a0), f_q))
{
            let result := mload(0x20a0)
result := addmod(mload(0x2100), result, f_q)
result := addmod(mload(0x2160), result, f_q)
mstore(9344, result)
        }
mstore(0x24a0, mulmod(mload(0x2040), mload(0x2180), f_q))
{
            let result := mload(0x2200)
result := addmod(mload(0x2260), result, f_q)
mstore(9408, result)
        }
{
            let prod := mload(0x2440)

                prod := mulmod(mload(0x2480), prod, f_q)
                mstore(0x24e0, prod)
            
                prod := mulmod(mload(0x24c0), prod, f_q)
                mstore(0x2500, prod)
            
        }
mstore(0x2540, 32)
mstore(0x2560, 32)
mstore(0x2580, 32)
mstore(0x25a0, mload(0x2500))
mstore(0x25c0, 21888242871839275222246405745257275088548364400416034343698204186575808495615)
mstore(0x25e0, 21888242871839275222246405745257275088548364400416034343698204186575808495617)
success := and(eq(staticcall(gas(), 0x5, 0x2540, 0xc0, 0x2520, 0x20), 1), success)
{
            
            let inv := mload(0x2520)
            let v
        
                    v := mload(0x24c0)
                    mstore(9408, mulmod(mload(0x24e0), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                
                    v := mload(0x2480)
                    mstore(9344, mulmod(mload(0x2440), inv, f_q))
                    inv := mulmod(v, inv, f_q)
                mstore(0x2440, inv)

        }
mstore(0x2600, mulmod(mload(0x2460), mload(0x2480), f_q))
mstore(0x2620, mulmod(mload(0x24a0), mload(0x24c0), f_q))
mstore(0x2640, mulmod(mload(0x920), mload(0x920), f_q))
mstore(0x2660, mulmod(mload(0x2640), mload(0x920), f_q))
mstore(0x2680, mulmod(mload(0x2660), mload(0x920), f_q))
mstore(0x26a0, mulmod(mload(0x2680), mload(0x920), f_q))
mstore(0x26c0, mulmod(mload(0x26a0), mload(0x920), f_q))
mstore(0x26e0, mulmod(mload(0x26c0), mload(0x920), f_q))
mstore(0x2700, mulmod(mload(0x26e0), mload(0x920), f_q))
mstore(0x2720, mulmod(mload(0x2700), mload(0x920), f_q))
mstore(0x2740, mulmod(mload(0x2720), mload(0x920), f_q))
mstore(0x2760, mulmod(mload(0x2740), mload(0x920), f_q))
mstore(0x2780, mulmod(mload(0x2760), mload(0x920), f_q))
mstore(0x27a0, mulmod(mload(0x980), mload(0x980), f_q))
mstore(0x27c0, mulmod(mload(0x27a0), mload(0x980), f_q))
{
            let result := mulmod(mload(0x5e0), mload(0x2020), f_q)
mstore(10208, result)
        }
mstore(0x2800, mulmod(mload(0x27e0), mload(0x2440), f_q))
mstore(0x2820, mulmod(sub(f_q, mload(0x2800)), 1, f_q))
{
            let result := mulmod(mload(0x600), mload(0x2020), f_q)
mstore(10304, result)
        }
mstore(0x2860, mulmod(mload(0x2840), mload(0x2440), f_q))
mstore(0x2880, mulmod(sub(f_q, mload(0x2860)), mload(0x920), f_q))
mstore(0x28a0, mulmod(1, mload(0x920), f_q))
mstore(0x28c0, addmod(mload(0x2820), mload(0x2880), f_q))
{
            let result := mulmod(mload(0x620), mload(0x2020), f_q)
mstore(10464, result)
        }
mstore(0x2900, mulmod(mload(0x28e0), mload(0x2440), f_q))
mstore(0x2920, mulmod(sub(f_q, mload(0x2900)), mload(0x2640), f_q))
mstore(0x2940, mulmod(1, mload(0x2640), f_q))
mstore(0x2960, addmod(mload(0x28c0), mload(0x2920), f_q))
{
            let result := mulmod(mload(0x640), mload(0x2020), f_q)
mstore(10624, result)
        }
mstore(0x29a0, mulmod(mload(0x2980), mload(0x2440), f_q))
mstore(0x29c0, mulmod(sub(f_q, mload(0x29a0)), mload(0x2660), f_q))
mstore(0x29e0, mulmod(1, mload(0x2660), f_q))
mstore(0x2a00, addmod(mload(0x2960), mload(0x29c0), f_q))
{
            let result := mulmod(mload(0x660), mload(0x2020), f_q)
mstore(10784, result)
        }
mstore(0x2a40, mulmod(mload(0x2a20), mload(0x2440), f_q))
mstore(0x2a60, mulmod(sub(f_q, mload(0x2a40)), mload(0x2680), f_q))
mstore(0x2a80, mulmod(1, mload(0x2680), f_q))
mstore(0x2aa0, addmod(mload(0x2a00), mload(0x2a60), f_q))
{
            let result := mulmod(mload(0x6a0), mload(0x2020), f_q)
mstore(10944, result)
        }
mstore(0x2ae0, mulmod(mload(0x2ac0), mload(0x2440), f_q))
mstore(0x2b00, mulmod(sub(f_q, mload(0x2ae0)), mload(0x26a0), f_q))
mstore(0x2b20, mulmod(1, mload(0x26a0), f_q))
mstore(0x2b40, addmod(mload(0x2aa0), mload(0x2b00), f_q))
{
            let result := mulmod(mload(0x6c0), mload(0x2020), f_q)
mstore(11104, result)
        }
mstore(0x2b80, mulmod(mload(0x2b60), mload(0x2440), f_q))
mstore(0x2ba0, mulmod(sub(f_q, mload(0x2b80)), mload(0x26c0), f_q))
mstore(0x2bc0, mulmod(1, mload(0x26c0), f_q))
mstore(0x2be0, addmod(mload(0x2b40), mload(0x2ba0), f_q))
{
            let result := mulmod(mload(0x6e0), mload(0x2020), f_q)
mstore(11264, result)
        }
mstore(0x2c20, mulmod(mload(0x2c00), mload(0x2440), f_q))
mstore(0x2c40, mulmod(sub(f_q, mload(0x2c20)), mload(0x26e0), f_q))
mstore(0x2c60, mulmod(1, mload(0x26e0), f_q))
mstore(0x2c80, addmod(mload(0x2be0), mload(0x2c40), f_q))
{
            let result := mulmod(mload(0x700), mload(0x2020), f_q)
mstore(11424, result)
        }
mstore(0x2cc0, mulmod(mload(0x2ca0), mload(0x2440), f_q))
mstore(0x2ce0, mulmod(sub(f_q, mload(0x2cc0)), mload(0x2700), f_q))
mstore(0x2d00, mulmod(1, mload(0x2700), f_q))
mstore(0x2d20, addmod(mload(0x2c80), mload(0x2ce0), f_q))
{
            let result := mulmod(mload(0x720), mload(0x2020), f_q)
mstore(11584, result)
        }
mstore(0x2d60, mulmod(mload(0x2d40), mload(0x2440), f_q))
mstore(0x2d80, mulmod(sub(f_q, mload(0x2d60)), mload(0x2720), f_q))
mstore(0x2da0, mulmod(1, mload(0x2720), f_q))
mstore(0x2dc0, addmod(mload(0x2d20), mload(0x2d80), f_q))
{
            let result := mulmod(mload(0x1f20), mload(0x2020), f_q)
mstore(11744, result)
        }
mstore(0x2e00, mulmod(mload(0x2de0), mload(0x2440), f_q))
mstore(0x2e20, mulmod(sub(f_q, mload(0x2e00)), mload(0x2740), f_q))
mstore(0x2e40, mulmod(1, mload(0x2740), f_q))
mstore(0x2e60, mulmod(mload(0x1f00), mload(0x2740), f_q))
mstore(0x2e80, addmod(mload(0x2dc0), mload(0x2e20), f_q))
{
            let result := mulmod(mload(0x680), mload(0x2020), f_q)
mstore(11936, result)
        }
mstore(0x2ec0, mulmod(mload(0x2ea0), mload(0x2440), f_q))
mstore(0x2ee0, mulmod(sub(f_q, mload(0x2ec0)), mload(0x2760), f_q))
mstore(0x2f00, mulmod(1, mload(0x2760), f_q))
mstore(0x2f20, addmod(mload(0x2e80), mload(0x2ee0), f_q))
mstore(0x2f40, mulmod(mload(0x2f20), 1, f_q))
mstore(0x2f60, mulmod(mload(0x28a0), 1, f_q))
mstore(0x2f80, mulmod(mload(0x2940), 1, f_q))
mstore(0x2fa0, mulmod(mload(0x29e0), 1, f_q))
mstore(0x2fc0, mulmod(mload(0x2a80), 1, f_q))
mstore(0x2fe0, mulmod(mload(0x2b20), 1, f_q))
mstore(0x3000, mulmod(mload(0x2bc0), 1, f_q))
mstore(0x3020, mulmod(mload(0x2c60), 1, f_q))
mstore(0x3040, mulmod(mload(0x2d00), 1, f_q))
mstore(0x3060, mulmod(mload(0x2da0), 1, f_q))
mstore(0x3080, mulmod(mload(0x2e40), 1, f_q))
mstore(0x30a0, mulmod(mload(0x2e60), 1, f_q))
mstore(0x30c0, mulmod(mload(0x2f00), 1, f_q))
mstore(0x30e0, mulmod(1, mload(0x2460), f_q))
{
            let result := mulmod(mload(0x740), mload(0x20a0), f_q)
result := addmod(mulmod(mload(0x760), mload(0x2100), f_q), result, f_q)
result := addmod(mulmod(mload(0x780), mload(0x2160), f_q), result, f_q)
mstore(12544, result)
        }
mstore(0x3120, mulmod(mload(0x3100), mload(0x2600), f_q))
mstore(0x3140, mulmod(sub(f_q, mload(0x3120)), 1, f_q))
mstore(0x3160, mulmod(mload(0x30e0), 1, f_q))
{
            let result := mulmod(mload(0x7a0), mload(0x20a0), f_q)
result := addmod(mulmod(mload(0x7c0), mload(0x2100), f_q), result, f_q)
result := addmod(mulmod(mload(0x7e0), mload(0x2160), f_q), result, f_q)
mstore(12672, result)
        }
mstore(0x31a0, mulmod(mload(0x3180), mload(0x2600), f_q))
mstore(0x31c0, mulmod(sub(f_q, mload(0x31a0)), mload(0x920), f_q))
mstore(0x31e0, mulmod(mload(0x30e0), mload(0x920), f_q))
mstore(0x3200, addmod(mload(0x3140), mload(0x31c0), f_q))
{
            let result := mulmod(mload(0x800), mload(0x20a0), f_q)
result := addmod(mulmod(mload(0x820), mload(0x2100), f_q), result, f_q)
result := addmod(mulmod(mload(0x840), mload(0x2160), f_q), result, f_q)
mstore(12832, result)
        }
mstore(0x3240, mulmod(mload(0x3220), mload(0x2600), f_q))
mstore(0x3260, mulmod(sub(f_q, mload(0x3240)), mload(0x2640), f_q))
mstore(0x3280, mulmod(mload(0x30e0), mload(0x2640), f_q))
mstore(0x32a0, addmod(mload(0x3200), mload(0x3260), f_q))
{
            let result := mulmod(mload(0x860), mload(0x20a0), f_q)
result := addmod(mulmod(mload(0x880), mload(0x2100), f_q), result, f_q)
result := addmod(mulmod(mload(0x8a0), mload(0x2160), f_q), result, f_q)
mstore(12992, result)
        }
mstore(0x32e0, mulmod(mload(0x32c0), mload(0x2600), f_q))
mstore(0x3300, mulmod(sub(f_q, mload(0x32e0)), mload(0x2660), f_q))
mstore(0x3320, mulmod(mload(0x30e0), mload(0x2660), f_q))
mstore(0x3340, addmod(mload(0x32a0), mload(0x3300), f_q))
mstore(0x3360, mulmod(mload(0x3340), mload(0x980), f_q))
mstore(0x3380, mulmod(mload(0x3160), mload(0x980), f_q))
mstore(0x33a0, mulmod(mload(0x31e0), mload(0x980), f_q))
mstore(0x33c0, mulmod(mload(0x3280), mload(0x980), f_q))
mstore(0x33e0, mulmod(mload(0x3320), mload(0x980), f_q))
mstore(0x3400, addmod(mload(0x2f40), mload(0x3360), f_q))
mstore(0x3420, mulmod(1, mload(0x24a0), f_q))
{
            let result := mulmod(mload(0x8c0), mload(0x2200), f_q)
result := addmod(mulmod(mload(0x8e0), mload(0x2260), f_q), result, f_q)
mstore(13376, result)
        }
mstore(0x3460, mulmod(mload(0x3440), mload(0x2620), f_q))
mstore(0x3480, mulmod(sub(f_q, mload(0x3460)), 1, f_q))
mstore(0x34a0, mulmod(mload(0x3420), 1, f_q))
mstore(0x34c0, mulmod(mload(0x3480), mload(0x27a0), f_q))
mstore(0x34e0, mulmod(mload(0x34a0), mload(0x27a0), f_q))
mstore(0x3500, addmod(mload(0x3400), mload(0x34c0), f_q))
mstore(0x3520, mulmod(1, mload(0x2040), f_q))
mstore(0x3540, mulmod(1, mload(0xa20), f_q))
mstore(0x3560, 0x0000000000000000000000000000000000000000000000000000000000000001)
                    mstore(0x3580, 0x0000000000000000000000000000000000000000000000000000000000000002)
mstore(0x35a0, mload(0x3500))
success := and(eq(staticcall(gas(), 0x7, 0x3560, 0x60, 0x3560, 0x40), 1), success)
mstore(0x35c0, mload(0x3560))
                    mstore(0x35e0, mload(0x3580))
mstore(0x3600, mload(0x100))
                    mstore(0x3620, mload(0x120))
success := and(eq(staticcall(gas(), 0x6, 0x35c0, 0x80, 0x35c0, 0x40), 1), success)
mstore(0x3640, mload(0x140))
                    mstore(0x3660, mload(0x160))
mstore(0x3680, mload(0x2f60))
success := and(eq(staticcall(gas(), 0x7, 0x3640, 0x60, 0x3640, 0x40), 1), success)
mstore(0x36a0, mload(0x35c0))
                    mstore(0x36c0, mload(0x35e0))
mstore(0x36e0, mload(0x3640))
                    mstore(0x3700, mload(0x3660))
success := and(eq(staticcall(gas(), 0x6, 0x36a0, 0x80, 0x36a0, 0x40), 1), success)
mstore(0x3720, mload(0x180))
                    mstore(0x3740, mload(0x1a0))
mstore(0x3760, mload(0x2f80))
success := and(eq(staticcall(gas(), 0x7, 0x3720, 0x60, 0x3720, 0x40), 1), success)
mstore(0x3780, mload(0x36a0))
                    mstore(0x37a0, mload(0x36c0))
mstore(0x37c0, mload(0x3720))
                    mstore(0x37e0, mload(0x3740))
success := and(eq(staticcall(gas(), 0x6, 0x3780, 0x80, 0x3780, 0x40), 1), success)
mstore(0x3800, mload(0x1c0))
                    mstore(0x3820, mload(0x1e0))
mstore(0x3840, mload(0x2fa0))
success := and(eq(staticcall(gas(), 0x7, 0x3800, 0x60, 0x3800, 0x40), 1), success)
mstore(0x3860, mload(0x3780))
                    mstore(0x3880, mload(0x37a0))
mstore(0x38a0, mload(0x3800))
                    mstore(0x38c0, mload(0x3820))
success := and(eq(staticcall(gas(), 0x6, 0x3860, 0x80, 0x3860, 0x40), 1), success)
mstore(0x38e0, 0x2385876fbd466f315dcbeb7f845f235845912e47fc71ef33538152df0519f0f0)
                    mstore(0x3900, 0x1d2551d7146df9b3929e390dccf3d0ba68e9cd0371f35a8bba0d77e6bdce4c5c)
mstore(0x3920, mload(0x2fc0))
success := and(eq(staticcall(gas(), 0x7, 0x38e0, 0x60, 0x38e0, 0x40), 1), success)
mstore(0x3940, mload(0x3860))
                    mstore(0x3960, mload(0x3880))
mstore(0x3980, mload(0x38e0))
                    mstore(0x39a0, mload(0x3900))
success := and(eq(staticcall(gas(), 0x6, 0x3940, 0x80, 0x3940, 0x40), 1), success)
mstore(0x39c0, 0x0d6f55ad45e9420d5a88658efc83a266ea4b153fddb3cc822a41a903e6e59c87)
                    mstore(0x39e0, 0x19d64086197f89fd6223320026057b53582a6b7b63789fba8575e2d7000043c4)
mstore(0x3a00, mload(0x2fe0))
success := and(eq(staticcall(gas(), 0x7, 0x39c0, 0x60, 0x39c0, 0x40), 1), success)
mstore(0x3a20, mload(0x3940))
                    mstore(0x3a40, mload(0x3960))
mstore(0x3a60, mload(0x39c0))
                    mstore(0x3a80, mload(0x39e0))
success := and(eq(staticcall(gas(), 0x6, 0x3a20, 0x80, 0x3a20, 0x40), 1), success)
mstore(0x3aa0, 0x00ffc4ddba79d94b3f95b39bf12a8a0971a61f7615982acabd2c1df23d46e3e2)
                    mstore(0x3ac0, 0x228aa372c6d253816d56dc8d49bb71a4f9819ba9e940eb959bd3676840a451de)
mstore(0x3ae0, mload(0x3000))
success := and(eq(staticcall(gas(), 0x7, 0x3aa0, 0x60, 0x3aa0, 0x40), 1), success)
mstore(0x3b00, mload(0x3a20))
                    mstore(0x3b20, mload(0x3a40))
mstore(0x3b40, mload(0x3aa0))
                    mstore(0x3b60, mload(0x3ac0))
success := and(eq(staticcall(gas(), 0x6, 0x3b00, 0x80, 0x3b00, 0x40), 1), success)
mstore(0x3b80, 0x016794381ba76f36a1253e98211babe09570410f94409a47dcf614fb754f4d52)
                    mstore(0x3ba0, 0x1af6182b5d55ff2bc6a5b06aaf4dc17487b06ef3b5c35132b9c6f8af5125b82e)
mstore(0x3bc0, mload(0x3020))
success := and(eq(staticcall(gas(), 0x7, 0x3b80, 0x60, 0x3b80, 0x40), 1), success)
mstore(0x3be0, mload(0x3b00))
                    mstore(0x3c00, mload(0x3b20))
mstore(0x3c20, mload(0x3b80))
                    mstore(0x3c40, mload(0x3ba0))
success := and(eq(staticcall(gas(), 0x6, 0x3be0, 0x80, 0x3be0, 0x40), 1), success)
mstore(0x3c60, 0x0ba05656f1acc27560e8f655f46f614a21ee76e3cfb3443262fcf9f729db691f)
                    mstore(0x3c80, 0x0f1e7b5b1ca973ffdd8375cbad06291f866177fdefe9eeea1b7e11fed88d9cab)
mstore(0x3ca0, mload(0x3040))
success := and(eq(staticcall(gas(), 0x7, 0x3c60, 0x60, 0x3c60, 0x40), 1), success)
mstore(0x3cc0, mload(0x3be0))
                    mstore(0x3ce0, mload(0x3c00))
mstore(0x3d00, mload(0x3c60))
                    mstore(0x3d20, mload(0x3c80))
success := and(eq(staticcall(gas(), 0x6, 0x3cc0, 0x80, 0x3cc0, 0x40), 1), success)
mstore(0x3d40, 0x2ab78ca58d826dd62e291b13cb39307685132d5b233478c1de41646f14c74e34)
                    mstore(0x3d60, 0x1c1328c94de19c6f74b6010b9f732677a9c2b8f36034234066d27314f6473408)
mstore(0x3d80, mload(0x3060))
success := and(eq(staticcall(gas(), 0x7, 0x3d40, 0x60, 0x3d40, 0x40), 1), success)
mstore(0x3da0, mload(0x3cc0))
                    mstore(0x3dc0, mload(0x3ce0))
mstore(0x3de0, mload(0x3d40))
                    mstore(0x3e00, mload(0x3d60))
success := and(eq(staticcall(gas(), 0x6, 0x3da0, 0x80, 0x3da0, 0x40), 1), success)
mstore(0x3e20, mload(0x500))
                    mstore(0x3e40, mload(0x520))
mstore(0x3e60, mload(0x3080))
success := and(eq(staticcall(gas(), 0x7, 0x3e20, 0x60, 0x3e20, 0x40), 1), success)
mstore(0x3e80, mload(0x3da0))
                    mstore(0x3ea0, mload(0x3dc0))
mstore(0x3ec0, mload(0x3e20))
                    mstore(0x3ee0, mload(0x3e40))
success := and(eq(staticcall(gas(), 0x6, 0x3e80, 0x80, 0x3e80, 0x40), 1), success)
mstore(0x3f00, mload(0x540))
                    mstore(0x3f20, mload(0x560))
mstore(0x3f40, mload(0x30a0))
success := and(eq(staticcall(gas(), 0x7, 0x3f00, 0x60, 0x3f00, 0x40), 1), success)
mstore(0x3f60, mload(0x3e80))
                    mstore(0x3f80, mload(0x3ea0))
mstore(0x3fa0, mload(0x3f00))
                    mstore(0x3fc0, mload(0x3f20))
success := and(eq(staticcall(gas(), 0x6, 0x3f60, 0x80, 0x3f60, 0x40), 1), success)
mstore(0x3fe0, mload(0x460))
                    mstore(0x4000, mload(0x480))
mstore(0x4020, mload(0x30c0))
success := and(eq(staticcall(gas(), 0x7, 0x3fe0, 0x60, 0x3fe0, 0x40), 1), success)
mstore(0x4040, mload(0x3f60))
                    mstore(0x4060, mload(0x3f80))
mstore(0x4080, mload(0x3fe0))
                    mstore(0x40a0, mload(0x4000))
success := and(eq(staticcall(gas(), 0x6, 0x4040, 0x80, 0x4040, 0x40), 1), success)
mstore(0x40c0, mload(0x320))
                    mstore(0x40e0, mload(0x340))
mstore(0x4100, mload(0x3380))
success := and(eq(staticcall(gas(), 0x7, 0x40c0, 0x60, 0x40c0, 0x40), 1), success)
mstore(0x4120, mload(0x4040))
                    mstore(0x4140, mload(0x4060))
mstore(0x4160, mload(0x40c0))
                    mstore(0x4180, mload(0x40e0))
success := and(eq(staticcall(gas(), 0x6, 0x4120, 0x80, 0x4120, 0x40), 1), success)
mstore(0x41a0, mload(0x360))
                    mstore(0x41c0, mload(0x380))
mstore(0x41e0, mload(0x33a0))
success := and(eq(staticcall(gas(), 0x7, 0x41a0, 0x60, 0x41a0, 0x40), 1), success)
mstore(0x4200, mload(0x4120))
                    mstore(0x4220, mload(0x4140))
mstore(0x4240, mload(0x41a0))
                    mstore(0x4260, mload(0x41c0))
success := and(eq(staticcall(gas(), 0x6, 0x4200, 0x80, 0x4200, 0x40), 1), success)
mstore(0x4280, mload(0x3a0))
                    mstore(0x42a0, mload(0x3c0))
mstore(0x42c0, mload(0x33c0))
success := and(eq(staticcall(gas(), 0x7, 0x4280, 0x60, 0x4280, 0x40), 1), success)
mstore(0x42e0, mload(0x4200))
                    mstore(0x4300, mload(0x4220))
mstore(0x4320, mload(0x4280))
                    mstore(0x4340, mload(0x42a0))
success := and(eq(staticcall(gas(), 0x6, 0x42e0, 0x80, 0x42e0, 0x40), 1), success)
mstore(0x4360, mload(0x3e0))
                    mstore(0x4380, mload(0x400))
mstore(0x43a0, mload(0x33e0))
success := and(eq(staticcall(gas(), 0x7, 0x4360, 0x60, 0x4360, 0x40), 1), success)
mstore(0x43c0, mload(0x42e0))
                    mstore(0x43e0, mload(0x4300))
mstore(0x4400, mload(0x4360))
                    mstore(0x4420, mload(0x4380))
success := and(eq(staticcall(gas(), 0x6, 0x43c0, 0x80, 0x43c0, 0x40), 1), success)
mstore(0x4440, mload(0x420))
                    mstore(0x4460, mload(0x440))
mstore(0x4480, mload(0x34e0))
success := and(eq(staticcall(gas(), 0x7, 0x4440, 0x60, 0x4440, 0x40), 1), success)
mstore(0x44a0, mload(0x43c0))
                    mstore(0x44c0, mload(0x43e0))
mstore(0x44e0, mload(0x4440))
                    mstore(0x4500, mload(0x4460))
success := and(eq(staticcall(gas(), 0x6, 0x44a0, 0x80, 0x44a0, 0x40), 1), success)
mstore(0x4520, mload(0x9c0))
                    mstore(0x4540, mload(0x9e0))
mstore(0x4560, sub(f_q, mload(0x3520)))
success := and(eq(staticcall(gas(), 0x7, 0x4520, 0x60, 0x4520, 0x40), 1), success)
mstore(0x4580, mload(0x44a0))
                    mstore(0x45a0, mload(0x44c0))
mstore(0x45c0, mload(0x4520))
                    mstore(0x45e0, mload(0x4540))
success := and(eq(staticcall(gas(), 0x6, 0x4580, 0x80, 0x4580, 0x40), 1), success)
mstore(0x4600, mload(0xa60))
                    mstore(0x4620, mload(0xa80))
mstore(0x4640, mload(0x3540))
success := and(eq(staticcall(gas(), 0x7, 0x4600, 0x60, 0x4600, 0x40), 1), success)
mstore(0x4660, mload(0x4580))
                    mstore(0x4680, mload(0x45a0))
mstore(0x46a0, mload(0x4600))
                    mstore(0x46c0, mload(0x4620))
success := and(eq(staticcall(gas(), 0x6, 0x4660, 0x80, 0x4660, 0x40), 1), success)
mstore(0x46e0, mload(0x4660))
                    mstore(0x4700, mload(0x4680))
mstore(0x4720, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2)
            mstore(0x4740, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)
            mstore(0x4760, 0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b)
            mstore(0x4780, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)
mstore(0x47a0, mload(0xa60))
                    mstore(0x47c0, mload(0xa80))
mstore(0x47e0, 0x0181624e80f3d6ae28df7e01eaeab1c0e919877a3b8a6b7fbc69a6817d596ea2)
            mstore(0x4800, 0x1783d30dcb12d259bb89098addf6280fa4b653be7a152542a28f7b926e27e648)
            mstore(0x4820, 0x00ae44489d41a0d179e2dfdc03bddd883b7109f8b6ae316a59e815c1a6b35304)
            mstore(0x4840, 0x0b2147ab62a386bd63e6de1522109b8c9588ab466f5aadfde8c41ca3749423ee)
success := and(eq(staticcall(gas(), 0x8, 0x46e0, 0x180, 0x46e0, 0x20), 1), success)
success := and(eq(mload(0x46e0), 1), success)

            // Revert if anything fails
            if iszero(success) { revert(0, 0) }

            // Return empty bytes on success
            return(0, 0)

        }
    }
}
        