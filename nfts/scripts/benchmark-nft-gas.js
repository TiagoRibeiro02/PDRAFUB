const { ethers } = require("hardhat");

async function gasOf(txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  return receipt.gasUsed;
}

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  if (!deployer) {
    throw new Error("No signer available. Check PRIVATE_KEY and network RPC configuration.");
  }

  const user1 = signers[1] || deployer;
  const user2Address = signers[2]?.address || ethers.Wallet.createRandom().address;
  const entity2Address = signers[3]?.address || ethers.Wallet.createRandom().address;

  const MyNFT = await ethers.getContractFactory("MyNFT");

  const deployTx = await MyNFT.getDeployTransaction();
  const sentDeployTx = await deployer.sendTransaction(deployTx);
  const deployReceipt = await sentDeployTx.wait();

  const nft = await MyNFT.attach(deployReceipt.contractAddress);

  const baseUri = "data:application/json;base64,eyJuYW1lIjoiR2FzIEJlbmNobWFyayBORlQifQ==";
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const gasReserve = ethers.parseEther("0.01");
  const targetPrice = ethers.parseEther("0.001");

  if (deployerBalance <= gasReserve + 1n) {
    throw new Error(
      `Insufficient Sepolia balance for benchmark. Have ${ethers.formatEther(
        deployerBalance
      )} ETH, need more than ${ethers.formatEther(gasReserve)} ETH for gas reserve.`
    );
  }

  const maxAffordablePrice = (deployerBalance - gasReserve) / 4n;
  const price = maxAffordablePrice < targetPrice ? maxAffordablePrice : targetPrice;

  const results = {
    generatedAt: new Date().toISOString(),
    network: await ethers.provider.getNetwork().then((n) => n.name),
    benchmarkPriceWei: price.toString(),
    benchmarkPriceEth: ethers.formatEther(price),
    contract: {
      name: "MyNFT",
      address: deployReceipt.contractAddress,
      deployGas: deployReceipt.gasUsed.toString(),
    },
    functions: {},
  };

  results.functions.setEntityAuthorization = (
    await gasOf(nft.setEntityAuthorization(entity2Address, true))
  ).toString();

  results.functions.mintNFT = (
    await gasOf(nft.mintNFT(baseUri, price))
  ).toString();

  const purchaseDID = "did:zeroid:buyer-1";
  results.functions.purchaseNFT = (
    await gasOf(
      nft.connect(user1).purchaseNFT(0, purchaseDID, {
        value: price,
      })
    )
  ).toString();

  const linkDID = "did:zeroid:link-1";
  results.functions.linkDIDToAddress = (
    await gasOf(nft.connect(user1).linkDIDToAddress(linkDID, user1.address))
  ).toString();

  const newDID = "did:zeroid:buyer-1-updated";
  results.functions.transferToDID = (
    await gasOf(nft.connect(user1).transferToDID(0, newDID))
  ).toString();

  await gasOf(nft.mintNFT(baseUri, price));

  const purchaseAndTransferDID = "did:zeroid:buyer-2";
  results.functions.purchaseAndTransferNFT = (
    await gasOf(
      nft.purchaseAndTransferNFT(1, purchaseAndTransferDID, user2Address, {
        value: price,
      })
    )
  ).toString();

  console.log("=== NFT FUNCTION GAS BENCHMARK ===");
  console.log(JSON.stringify(results, null, 2));
  console.log(`BENCHMARK_NFT_GAS_JSON=${JSON.stringify(results)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
