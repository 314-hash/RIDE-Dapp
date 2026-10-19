import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
   CONFIGURATION & NETWORK INITIALIZATION
============================================================ */

const RPC_URL = process.env.RPC_URL || "https://rpc.sidrachain.com";
const CHAIN_ID = Number(process.env.CHAIN_ID || "97453");
const sidraNetwork = ethers.Network.from({ name: "sidra", chainId: CHAIN_ID });
const provider = new ethers.JsonRpcProvider(RPC_URL, sidraNetwork, { staticNetwork: sidraNetwork });

const ROUTER_ADDR = process.env.ROUTER_ADDRESS || "0x35cAC72Db00e8dAC0e4f7F8A0F53D339E0cC23fb";
const WSDA_ADDR = process.env.WSDA_ADDRESS || "0xE4095a910209D7BE03B55D02F40d4554B1666182";
const RIDE_ADDR = process.env.RIDE_ADDRESS || "0xe91cAC00C1092611EB598B284a87A623a35aF9b7";
const POOL_ADDR = process.env.RIDE_POOL_ADDRESS || "0x4a65a79dbC3e0184972e041525eDeeAb481c6027";
const POOL_FEE = Number(process.env.RIDE_POOL_FEE || "10000");

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

const WSDA_ABI = [
  ...ERC20_ABI,
  "function deposit() payable",
  "function withdraw(uint256)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

const POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() view returns (uint128)",
  "function token0() view returns (address)"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let isTerminating = false;

process.on("SIGINT", () => {
  console.log("\n\n🛑 [INTERRUPT] Received SIGINT (Ctrl+C). Completing current transaction and exiting gracefully...");
  isTerminating = true;
});

process.on("SIGTERM", () => {
  console.log("\n\n🛑 [TERMINATE] Received SIGTERM. Exiting gracefully...");
  isTerminating = true;
});

/* ============================================================
   CORE ON-CHAIN HELPERS
============================================================ */

async function getSpotPriceSda() {
  const pool = new ethers.Contract(POOL_ADDR, POOL_ABI, provider);
  const [slot0, t0] = await Promise.all([pool.slot0(), pool.token0()]);
  const Q96 = 2n ** 96n;
  const sqrtP = Number(slot0.sqrtPriceX96) / Number(Q96);
  const rawRatio = sqrtP * sqrtP;
  const isWsdaToken0 = t0.toLowerCase() === WSDA_ADDR.toLowerCase();
  return isWsdaToken0 ? 1 / rawRatio : rawRatio;
}

async function getSafeGasPrice() {
  return 2500000000n; // 2.5 Gwei hardcoded fast mine on Sidra Chain (< 0.0001 SDA per tx)
}

async function waitForPendingNonce(address) {
  let attempts = 0;
  while (attempts < 15) {
    const [latest, pending] = await Promise.all([
      provider.getTransactionCount(address, "latest"),
      provider.getTransactionCount(address, "pending")
    ]);
    if (latest === pending) return latest;
    await sleep(2000);
    attempts++;
  }
  return await provider.getTransactionCount(address, "latest");
}

async function ensureApproval(tokenAddress, signer, requiredAmountWei, isLive = false) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const allowance = await token.allowance(signer.address, ROUTER_ADDR);

  if (allowance >= requiredAmountWei) {
    return;
  }

  console.log(`   [🔐 APPROVAL] Approving router for token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`);
  if (!isLive) {
    console.log(`      [DRY-RUN] Simulated approval of MaxUint256`);
    return;
  }

  const gasPrice = await getSafeGasPrice();
  const nonce = await waitForPendingNonce(signer.address);
  const tx = await token.approve(ROUTER_ADDR, ethers.MaxUint256, {
    gasLimit: 100000n,
    gasPrice,
    nonce
  });
  await tx.wait(1);
  console.log(`      ✅ Approved successfully (Tx: ${tx.hash})`);
}

/* ============================================================
   SELL EXECUTION
============================================================ */

async function executeSell(walletKey, signer, tokensToSell, spotPriceSda, tokenSymbol = "RIDE", slippagePct = 5, shouldUnwrap = true, isLive = false) {
  const token = new ethers.Contract(RIDE_ADDR, ERC20_ABI, signer);
  const wsda = new ethers.Contract(WSDA_ADDR, WSDA_ABI, signer);
  const router = new ethers.Contract(ROUTER_ADDR, ROUTER_ABI, signer);

  const decimals = Number(await token.decimals().catch(() => 18));
  let tokensToSellWei = ethers.parseUnits(tokensToSell.toString(), decimals);

  const curTokenBal = await token.balanceOf(signer.address);
  if (curTokenBal < tokensToSellWei) {
    if (curTokenBal === 0n) {
      console.warn(`   ⚠️ [${walletKey}] Insufficient balance: 0 ${tokenSymbol}. Skipping sell.`);
      return { success: false, reason: "zero_balance" };
    }
    const availableNum = Number(ethers.formatUnits(curTokenBal, decimals));
    console.warn(`   ⚠️ [${walletKey}] Balance (${availableNum.toFixed(2)} ${tokenSymbol}) is less than ${tokensToSell}. Selling available balance instead.`);
    tokensToSellWei = curTokenBal;
  }

  const actualTokensNum = Number(ethers.formatUnits(tokensToSellWei, decimals));
  const estimatedSda = actualTokensNum * spotPriceSda;
  console.log(`   [🔴 SELL] [${walletKey}] Selling ${actualTokensNum.toFixed(2)} ${tokenSymbol} -> Est. ~${estimatedSda.toFixed(4)} SDA...`);

  const simParams = {
    tokenIn: RIDE_ADDR,
    tokenOut: WSDA_ADDR,
    fee: POOL_FEE,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 600,
    amountIn: tokensToSellWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0
  };

  if (!isLive) {
    let quotedSda = estimatedSda;
    try {
      const quoted = await router.exactInputSingle.staticCall(simParams);
      quotedSda = Number(ethers.formatEther(quoted));
    } catch (e) {
      // Fallback to estimated spot price if staticCall fails in dry-run
    }
    console.log(`      [DRY-RUN] Simulated Sell: ${actualTokensNum.toFixed(2)} ${tokenSymbol} (~${quotedSda.toFixed(4)} SDA)`);
    return { success: true, dryRun: true, tokensSold: actualTokensNum, sdaReceived: quotedSda, txHash: "sim_sell" };
  }

  // Ensure router approval before swapping
  await ensureApproval(RIDE_ADDR, signer, tokensToSellWei, isLive);

  // Compute minimum output with slippage protection
  let minWsdaOut = 0n;
  try {
    const simOut = await router.exactInputSingle.staticCall(simParams);
    const slipBps = BigInt(Math.max(1, Math.min(50, slippagePct)) * 100);
    minWsdaOut = (simOut * (10000n - slipBps)) / 10000n;
  } catch (e) {
    // If simulation reverts, calculate conservative minimum from spot price with slippage
    const estWei = ethers.parseEther(estimatedSda.toFixed(6));
    const slipBps = BigInt(Math.max(1, Math.min(50, slippagePct)) * 100);
    minWsdaOut = (estWei * (10000n - slipBps)) / 10000n;
  }

  let gasPrice = await getSafeGasPrice();
  let nonce = await waitForPendingNonce(signer.address);

  const tx = await router.exactInputSingle({
    ...simParams,
    amountOutMinimum: minWsdaOut
  }, { gasLimit: 280000n, gasPrice, nonce });

  const receipt = await tx.wait(1);
  console.log(`      ✅ SELL Confirmed! Block: ${receipt.blockNumber} | Tx: ${tx.hash}`);

  await sleep(2500);

  // Auto unwrap WSDA to native SDA
  let sdaReceived = 0;
  if (shouldUnwrap) {
    const wsdaBal = await wsda.balanceOf(signer.address);
    if (wsdaBal > 0n) {
      gasPrice = await getSafeGasPrice();
      nonce = await waitForPendingNonce(signer.address);
      const unwrapTx = await wsda.withdraw(wsdaBal, { gasLimit: 100000n, gasPrice, nonce });
      await unwrapTx.wait(1);
      sdaReceived = Number(ethers.formatEther(wsdaBal));
      console.log(`      💰 Unwrapped +${sdaReceived.toFixed(4)} native SDA into [${walletKey}]!`);
    }
  }

  return {
    success: true,
    tokensSold: actualTokensNum,
    sdaReceived,
    txHash: tx.hash,
    block: receipt.blockNumber
  };
}

/* ============================================================
   ARGUMENT PARSER
============================================================ */

function parseInterval(argVal, defaultMs = 300000) {
  if (!argVal) return defaultMs;
  const str = String(argVal).trim().toLowerCase();
  if (str.endsWith("m")) {
    return parseFloat(str.slice(0, -1)) * 60 * 1000;
  }
  if (str.endsWith("s")) {
    return parseFloat(str.slice(0, -1)) * 1000;
  }
  const val = Number(str);
  if (val > 0 && val <= 3600) {
    // If entered as seconds (e.g. 300)
    return val * 1000;
  }
  return val > 0 ? val : defaultMs;
}

/* ============================================================
   MAIN PERIODIC LOOP
============================================================ */

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes("--execute");
  const isOnce = args.includes("--once");

  const amountArg = Number(args.find((a) => a.startsWith("--amount="))?.split("=")[1] || 200);
  const rawIntervalArg = args.find((a) => a.startsWith("--interval="))?.split("=")[1];
  const intervalMs = parseInterval(rawIntervalArg, 300000); // default: 5 minutes = 300,000 ms

  const rawWalletDelay = args.find((a) => a.startsWith("--wallet-delay="))?.split("=")[1];
  let walletDelayMs = parseInterval(rawWalletDelay, 300000); // default: 5 minutes = 300,000 ms

  const slippageArg = Number(args.find((a) => a.startsWith("--slippage="))?.split("=")[1] || 5);
  const noUnwrap = args.includes("--no-unwrap");
  const maxRoundsArg = isOnce ? 1 : Number(args.find((a) => a.startsWith("--rounds="))?.split("=")[1] || 0);

  const walletsArg = args.find((a) => a.startsWith("--wallets="))?.split("=")[1];
  const walletsFilter = walletsArg ? walletsArg.split(",") : null;

  const rawKeys = {
    wallet1: process.env.PRIVATE_KEY_1 || process.env.PRIVATE_KEY,
    wallet2: process.env.PRIVATE_KEY_2,
    wallet3: process.env.PRIVATE_KEY_3,
    wallet4: process.env.PRIVATE_KEY_4,
    wallet5: process.env.PRIVATE_KEY_5
  };

  const wallets = {};
  for (const [k, pk] of Object.entries(rawKeys)) {
    if (pk && (!walletsFilter || walletsFilter.includes(k))) {
      const cleanPk = pk.startsWith("0x") ? pk : `0x${pk}`;
      wallets[k] = new ethers.Wallet(cleanPk, provider);
    }
  }

  const walletKeys = Object.keys(wallets);
  if (walletKeys.length === 0) {
    console.error("❌ No private keys found in .env or matching --wallets filter.");
    process.exit(1);
  }

  const tokenContract = new ethers.Contract(RIDE_ADDR, ERC20_ABI, provider);
  let tokenSymbol = "RIDE";
  try {
    tokenSymbol = await tokenContract.symbol();
  } catch (e) {
    tokenSymbol = "RIDE";
  }

  console.log("==========================================================================");
  console.log(`🔥 PERIODIC SELL BOT: SELL ${amountArg} ${tokenSymbol} ON ALL WALLETS (5m DELAY PER WALLET)`);
  console.log("==========================================================================");
  console.log(`Execution Mode : ${isLive ? "🚨 LIVE ON-CHAIN BROADCAST" : "🛡️ DRY-RUN SIMULATION (pass --execute to broadcast)"}`);
  console.log(`Sell Amount    : ${amountArg} ${tokenSymbol} per wallet each trade`);
  console.log(`Wallet Delay   : ${(walletDelayMs / 1000).toFixed(0)}s (${(walletDelayMs / 60000).toFixed(1)} minutes) between wallets`);
  console.log(`Round Interval : ${(intervalMs / 1000).toFixed(0)}s (${(intervalMs / 60000).toFixed(1)} minutes) cooldown between rounds`);
  console.log(`Slippage Limit : ${slippageArg}%`);
  console.log(`Auto Unwrap    : ${!noUnwrap ? "Enabled (WSDA -> Native SDA)" : "Disabled (Retain WSDA)"}`);
  console.log(`Target Rounds  : ${maxRoundsArg === 0 ? "Continuous Infinite Loop (Ctrl+C to stop)" : `${maxRoundsArg} round(s)`}`);
  console.log(`Active Wallets : ${walletKeys.join(", ")} (${walletKeys.length} total)`);
  console.log("==========================================================================\n");

  let currentRound = 1;
  const totalStats = {
    totalSells: 0,
    totalTokensSold: 0,
    totalSdaReceived: 0
  };

  while (!isTerminating && (maxRoundsArg === 0 || currentRound <= maxRoundsArg)) {
    const roundStartTime = Date.now();
    console.log(`\n**************************************************************************`);
    console.log(`🌀 ROUND ${currentRound}${maxRoundsArg > 0 ? ` / ${maxRoundsArg}` : ""} [${new Date().toLocaleTimeString()}]`);
    console.log(`**************************************************************************`);

    let spotPrice = 0.007;
    try {
      spotPrice = await getSpotPriceSda();
      console.log(`Current Spot Price: ~${spotPrice.toFixed(6)} SDA per ${tokenSymbol} (${amountArg} ${tokenSymbol} ≈ ${(amountArg * spotPrice).toFixed(4)} SDA)`);
    } catch (err) {
      console.warn(`⚠️ Warning: Failed to fetch spot price: ${err.message}. Using fallback.`);
    }

    const walletEntries = Object.entries(wallets);
    for (let wIdx = 0; wIdx < walletEntries.length; wIdx++) {
      if (isTerminating) break;
      const [k, signer] = walletEntries[wIdx];

      try {
        const [sdaBal, tokenBal] = await Promise.all([
          provider.getBalance(signer.address),
          tokenContract.balanceOf(signer.address)
        ]);
        const sdaNum = Number(ethers.formatEther(sdaBal));
        const tokenNum = Number(ethers.formatEther(tokenBal));

        console.log(`\n▶️ [${k.toUpperCase()}] (${signer.address.slice(0, 6)}...${signer.address.slice(-4)}) | Balance: ${sdaNum.toFixed(4)} SDA | ${tokenNum.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${tokenSymbol}`);

        // Safety check for gas
        if (sdaNum < 0.005) {
          console.warn(`   ⚠️ [${k}] Low native SDA balance (${sdaNum.toFixed(4)} SDA). Might not have enough gas. Proceeding cautiously.`);
        }

        const sellRes = await executeSell(
          k,
          signer,
          amountArg,
          spotPrice,
          tokenSymbol,
          slippageArg,
          !noUnwrap,
          isLive
        );

        if (sellRes.success) {
          totalStats.totalSells++;
          totalStats.totalTokensSold += sellRes.tokensSold || amountArg;
          totalStats.totalSdaReceived += sellRes.sdaReceived || 0;
          if (sellRes.txHash && sellRes.txHash !== "sim_sell") {
            console.log(`      🔗 Explorer: https://ledger.sidrachain.com/tx/${sellRes.txHash}`);
          }
        }
      } catch (wErr) {
        console.error(`   ❌ [${k}] Error executing sell:`, wErr.reason || wErr.message);
      }

      // Delay between wallets within the same round (default: 5 minutes / 300s)
      if (!isTerminating && wIdx < walletEntries.length - 1 && walletDelayMs > 0) {
        const nextWalletKey = walletEntries[wIdx + 1][0].toUpperCase();
        const totalDelaySec = Math.round(walletDelayMs / 1000);
        console.log(`\n⏳ [Wallet Delay] Pausing ${totalDelaySec}s (${(walletDelayMs / 60000).toFixed(1)} minutes) before next wallet (${nextWalletKey})...`);
        const delayStart = Date.now();
        while (!isTerminating && Date.now() - delayStart < walletDelayMs) {
          await sleep(1000);
          const remSec = Math.round((walletDelayMs - (Date.now() - delayStart)) / 1000);
          if (remSec > 0 && (remSec % 60 === 0 || remSec === 30 || remSec === 10)) {
            const remMin = Math.floor(remSec / 60);
            const remExtraSec = remSec % 60;
            const timeStr = remMin > 0 ? `${remMin}m ${remExtraSec > 0 ? `${remExtraSec}s` : ""}`.trim() : `${remSec}s`;
            console.log(`   ⏳ Pausing... ${timeStr} remaining until ${nextWalletKey}`);
          }
        }
      }
    }

    const elapsedSec = ((Date.now() - roundStartTime) / 1000).toFixed(1);
    console.log(`\n✅ Finished Round ${currentRound} in ${elapsedSec}s.`);
    console.log(`📊 Cumulative Progress: ${totalStats.totalSells} sells completed | Sold: ${totalStats.totalTokensSold.toFixed(2)} ${tokenSymbol} | Recovered: ~${totalStats.totalSdaReceived.toFixed(4)} SDA`);

    currentRound++;

    // Wait until next round if continuous
    if (!isTerminating && (maxRoundsArg === 0 || currentRound <= maxRoundsArg)) {
      const waitSeconds = Math.round(intervalMs / 1000);
      console.log(`\n⏳ Next round in ${waitSeconds}s (${(intervalMs / 60000).toFixed(1)} minutes)... (Press Ctrl+C to stop)`);

      const startTime = Date.now();
      while (!isTerminating && Date.now() - startTime < intervalMs) {
        await sleep(1000);
        const remSec = Math.round((intervalMs - (Date.now() - startTime)) / 1000);
        if (remSec > 0 && remSec % 60 === 0) {
          console.log(`   ⏳ Countdown: ${Math.floor(remSec / 60)}m remaining until Round ${currentRound}...`);
        }
      }
    }
  }

  console.log("\n==========================================================================");
  console.log("🏁 SELL BOT TERMINATED — FINAL SUMMARY");
  console.log("==========================================================================");
  console.log(`Completed Rounds : ${currentRound - 1}`);
  console.log(`Total Sells Exec : ${totalStats.totalSells}`);
  console.log(`Total Sold       : ${totalStats.totalTokensSold.toFixed(2)} ${tokenSymbol}`);
  console.log(`Total SDA Gained : ~${totalStats.totalSdaReceived.toFixed(4)} SDA`);
  console.log("==========================================================================\n");
}

main().catch((err) => {
  console.error("[-] Periodic Sell Fatal Error:", err);
  process.exit(1);
});
