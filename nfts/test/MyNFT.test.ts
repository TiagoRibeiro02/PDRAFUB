import { expect } from "chai";
import { ethers } from "hardhat";
import { MyNFT } from "../typechain-types";

describe("MyNFT", function () {
  let nft: MyNFT;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    nft = await MyNFT.deploy();
    await nft.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await nft.name()).to.equal("MyNFT Collection");
      expect(await nft.symbol()).to.equal("MNFT");
    });

    it("Should start with zero supply", async function () {
      expect(await nft.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with correct tokenURI", async function () {
      const tokenURI = "ipfs://QmTest123";
      await nft.mintNFT(addr1.address, tokenURI);
      
      expect(await nft.ownerOf(0)).to.equal(addr1.address);
      expect(await nft.tokenURI(0)).to.equal(tokenURI);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("Should increment token IDs", async function () {
      await nft.mintNFT(addr1.address, "uri1");
      await nft.mintNFT(addr1.address, "uri2");
      
      expect(await nft.totalSupply()).to.equal(2);
      expect(await nft.tokenURI(0)).to.equal("uri1");
      expect(await nft.tokenURI(1)).to.equal("uri2");
    });

    it("Should only allow owner to mint", async function () {
      await expect(
        nft.connect(addr1).mintNFT(addr2.address, "uri")
      ).to.be.reverted;
    });

    it("Should emit NFTMinted event", async function () {
      await expect(nft.mintNFT(addr1.address, "uri"))
        .to.emit(nft, "NFTMinted")
        .withArgs(addr1.address, 0, "uri");
    });
  });

  describe("Token ownership", function () {
    beforeEach(async function () {
      await nft.mintNFT(addr1.address, "uri1");
      await nft.mintNFT(addr1.address, "uri2");
      await nft.mintNFT(addr2.address, "uri3");
    });

    it("Should return correct token count", async function () {
      expect(await nft.balanceOf(addr1.address)).to.equal(2);
      expect(await nft.balanceOf(addr2.address)).to.equal(1);
    });

    it("Should return all tokens owned by address", async function () {
      const tokens = await nft.tokensOfOwner(addr1.address);
      expect(tokens.length).to.equal(2);
      expect(tokens[0]).to.equal(0);
      expect(tokens[1]).to.equal(1);
    });
  });
});
