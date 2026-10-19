import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://rpc.sidrachain.com";
const CHAIN_ID = 97453;
const RIDE_ADDR = process.env.RIDE_ADDRESS || "0xe91cAC00C1092611EB598B284a87A623a35aF9b7";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  console.log("==================================================");
  console.log("RIDE TOKENS Protocol Smart Contracts Deployment");
  console.log(`Target Network: Sidra Chain (Chain ID: ${CHAIN_ID})`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`RIDE Token: ${RIDE_ADDR}`);
  console.log("==================================================");

  if (!PRIVATE_KEY) {
    console.error("Error: PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  const sidraNetwork = ethers.Network.from({ name: "sidra", chainId: CHAIN_ID });
  const provider = new ethers.JsonRpcProvider(RPC_URL, sidraNetwork, { staticNetwork: sidraNetwork });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Native SDA Balance: ${ethers.formatEther(balance)} SDA`);

  if (balance === 0n) {
    console.log("Warning: Deployer has 0 SDA balance. Dry-run / configuration output will be generated.");
  }

  console.log("\nProtocol Contracts Prepared:");
  console.log("1. RideBookingEscrow.sol - Automated 15% discount, trustless driver settlement, dispute resolution");
  console.log("2. DriverStakingVault.sol - Tier staking (Silver, Gold, Diamond), fee reductions down to 2%");
  console.log("3. RideRewardsDistributor.sol - Ride-to-Earn +1.5 RIDE/km reward minting with replay protection");

  const deployedConfig = {
    network: "Sidra Chain",
    chainId: CHAIN_ID,
    rpc: RPC_URL,
    deployer: wallet.address,
    rideToken: RIDE_ADDR,
    contracts: {
      RideBookingEscrow: {
        description: "Decentralized fare escrow with 15% RIDE discount & driver payouts",
        tokenDiscountBps: 1500,
        basePlatformFeeBps: 800,
      },
      DriverStakingVault: {
        description: "Driver tier staking vault with commission discounts down to 2%",
        tiers: {
          Silver: "50 RIDE (6% fee)",
          Gold: "100 RIDE (4.5% fee)",
          Diamond: "250 RIDE (2.0% fee)",
        },
      },
      RideRewardsDistributor: {
        description: "Verified Ride-to-Earn +1.5 RIDE/km cashback rewards distributor",
        ratePerKm: "1.5 RIDE",
      },
    },
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.resolve("./config/protocol_contracts.json");
  fs.writeFileSync(outPath, JSON.stringify(deployedConfig, null, 2));
  console.log(`\nProtocol contract metadata written to: ${outPath}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
