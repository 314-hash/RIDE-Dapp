import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://rpc.sidrachain.com";
const CHAIN_ID = Number(process.env.CHAIN_ID || "97453");
const sidraNetwork = ethers.Network.from({ name: "sidra", chainId: CHAIN_ID });
const provider = new ethers.JsonRpcProvider(RPC_URL, sidraNetwork, { staticNetwork: sidraNetwork });

const ROUTER_ADDR = process.env.ROUTER_ADDRESS || "0x35cAC72Db00e8dAC0e4f7F8A0F53D339E0cC23fb";
const WSDA_ADDR = process.env.WSDA_ADDRESS || "0xE4095a910209D7BE03B55D02F40d4554B1666182";

// Support both RIDE (ride-worker) and SVM (sidraviralmeme) configurations
const TARGET_TOKEN_ADDR = process.env.RIDE_ADDRESS || process.env.SVM_ADDRESS || "0xe91cAC00C1092611EB598B284a87A623a35aF9b7";
const POOL_ADDR = process.env.RIDE_POOL_ADDRESS || process.env.POOL_ADDRESS || "0x4a65a79dbC3e0184972e041525eDeeAb481c6027";
const POOL_FEE = Number(process.env.RIDE_POOL_FEE || process.env.POOL_FEE || "10000");

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getSpotPriceSda() {
  const pool = new ethers.Contract(POOL_ADDR, POOL_ABI, provider);
  const [slot0, t0] = await Promise.all([pool.slot0(), pool.token0()]);
  const Q96 = 2n ** 96n;
  const sqrtP = Number(slot0.sqrtPriceX96) / Number(Q96);
  const rawRatio = sqrtP * sqrtP;
  const isWsdaToken0 = t0.toLowerCase() === WSDA_ADDR.toLowerCase();
  return isWsdaToken0 ? (1 / rawRatio) : rawRatio;
}

async function getSafeGasPrice() {
  // Hardcode 2.5 Gwei (2,500,000,000 wei) - verified on-chain to mine within 3 seconds for < 0.0001 SDA
  return 2500000000n;
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

async function prepareWalletFuel(walletKey, signer, totalSdaNeeded, isLive = false) {
  const wsda = new ethers.Contract(WSDA_ADDR, WSDA_ABI, signer);
  const neededWei = ethers.parseUnits(totalSdaNeeded.toFixed(6), 18);
  const curBal = await wsda.balanceOf(signer.address);

  if (curBal < neededWei) {
    const wrapAmount = neededWei - curBal;
    console.log(`   [📦 WSDA BATCH PREPARATION] Wrapping ${ethers.formatEther(wrapAmount)} SDA into WSDA for 3-Buy batch...`);
    if (isLive) {
      const gasPrice = await getSafeGasPrice();
      const nonce = await waitForPendingNonce(signer.address);
      const wrapTx = await wsda.deposit({ value: wrapAmount, gasLimit: 120000n, gasPrice, nonce });
      await wrapTx.wait(1);
      await sleep(2000);
      console.log(`      ✅ Wrapped successfully (Tx: ${wrapTx.hash})`);
    }
  }

  // Ensure WSDA approval for router
  await ensureApproval(WSDA_ADDR, signer, neededWei, isLive);
}

async function executeBuy(walletKey, signer, buyAmountSda, tokenSymbol = "TOKEN", isLive = false) {
  const sdaAmountWei = ethers.parseUnits(buyAmountSda.toFixed(6), 18);
  const router = new ethers.Contract(ROUTER_ADDR, ROUTER_ABI, signer);

  console.log(`   [🟢 BUY] [${walletKey}] Swapping ${buyAmountSda} SDA -> ${tokenSymbol}...`);

  if (!isLive) {
    console.log(`      [DRY-RUN] Simulated Buy: ${buyAmountSda} SDA via ${signer.address}`);
    return { success: true, sdaSpent: buyAmountSda, txHash: "sim_buy" };
  }

  // Safety approval check
  await ensureApproval(WSDA_ADDR, signer, sdaAmountWei, isLive);

  const simParams = {
    tokenIn: WSDA_ADDR,
    tokenOut: TARGET_TOKEN_ADDR,
    fee: POOL_FEE,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 600,
    amountIn: sdaAmountWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0
  };

  let minTokenOut = 0n;
  try {
    const simOut = await router.exactInputSingle.staticCall(simParams);
    minTokenOut = (simOut * 95n) / 100n;
  } catch (e) {
    minTokenOut = 0n;
  }

  const gasPrice = await getSafeGasPrice();
  const nonce = await waitForPendingNonce(signer.address);

  const tx = await router.exactInputSingle({
    ...simParams,
    amountOutMinimum: minTokenOut
  }, { gasLimit: 280000n, gasPrice, nonce });

  const receipt = await tx.wait(1);
  console.log(`      ✅ BUY Confirmed! Block: ${receipt.blockNumber} | Tx: ${tx.hash}`);
  return { success: true, sdaSpent: buyAmountSda, txHash: tx.hash, block: receipt.blockNumber };
}

async function executeSell(walletKey, signer, targetRefundSda, spotPriceSda, tokenSymbol = "TOKEN", isLive = false) {
  const token = new ethers.Contract(TARGET_TOKEN_ADDR, ERC20_ABI, signer);
  const wsda = new ethers.Contract(WSDA_ADDR, WSDA_ABI, signer);
  const router = new ethers.Contract(ROUTER_ADDR, ROUTER_ABI, signer);

  const tokensToSellNum = targetRefundSda / spotPriceSda;
  let tokensToSellWei = ethers.parseUnits(tokensToSellNum.toFixed(6), 18);

  const curTokenBal = await token.balanceOf(signer.address);
  if (curTokenBal < tokensToSellWei) {
    tokensToSellWei = curTokenBal;
  }

  const displayTokens = ethers.formatUnits(tokensToSellWei, 18);
  console.log(`   [🔴 SELL] [${walletKey}] Selling ${Number(displayTokens).toFixed(2)} ${tokenSymbol} -> Refunding ~${targetRefundSda.toFixed(4)} SDA...`);

  if (!isLive) {
    console.log(`      [DRY-RUN] Simulated Sell: ${displayTokens} ${tokenSymbol} (~${targetRefundSda} SDA refund)`);
    return { success: true, sdaRefunded: targetRefundSda, txHash: "sim_sell" };
  }

  // Ensure target token is approved before swapping
  await ensureApproval(TARGET_TOKEN_ADDR, signer, tokensToSellWei, isLive);

  const simParams = {
    tokenIn: TARGET_TOKEN_ADDR,
    tokenOut: WSDA_ADDR,
    fee: POOL_FEE,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 600,
    amountIn: tokensToSellWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0
  };

  let minWsdaOut = 0n;
  try {
    const simOut = await router.exactInputSingle.staticCall(simParams);
    minWsdaOut = (simOut * 95n) / 100n;
  } catch (e) {
    minWsdaOut = 0n;
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

  // Unwrap WSDA back to Native SDA
  const wsdaBal = await wsda.balanceOf(signer.address);
  let unwrappedSda = 0;
  if (wsdaBal > 0n) {
    gasPrice = await getSafeGasPrice();
    nonce = await waitForPendingNonce(signer.address);
    const unwrapTx = await wsda.withdraw(wsdaBal, { gasLimit: 100000n, gasPrice, nonce });
    await unwrapTx.wait(1);
    unwrappedSda = Number(ethers.formatEther(wsdaBal));
    console.log(`      💰 Unwrapped +${unwrappedSda.toFixed(4)} native SDA fuel into [${walletKey}]!`);
  }

  return { success: true, sdaRefunded: unwrappedSda, txHash: tx.hash, block: receipt.blockNumber };
}

async function setServerEmergencyStop(active) {
  try {
    await fetch("http://localhost:3000/api/emergency-stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active })
    });
  } catch (e) { }
}

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes("--execute");
  const tradeSizeArg = Number(args.find(a => a.startsWith("--trade-size="))?.split("=")[1] || 0.008);
  const refundRatioArg = Number(args.find(a => a.startsWith("--refund-ratio="))?.split("=")[1] || 0.80);
  const delayArg = Number(args.find(a => a.startsWith("--delay="))?.split("=")[1] || 3000);

  const walletsArg = args.find(a => a.startsWith("--wallets="))?.split("=")[1];
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

  const tokenContract = new ethers.Contract(TARGET_TOKEN_ADDR, ERC20_ABI, provider);
  let tokenSymbol = "TOKEN";
  try {
    tokenSymbol = await tokenContract.symbol();
  } catch (e) {
    tokenSymbol = TARGET_TOKEN_ADDR.toLowerCase() === (process.env.RIDE_ADDRESS || "").toLowerCase() ? "RIDE" : "SVM";
  }

  console.log("==========================================================================");
  console.log(`⚡ 3 BUYS + 1 SELL (3:1 SWARM CADENCE) ACROSS ALL WALLETS [${tokenSymbol}]`);
  console.log("==========================================================================");
  console.log(`Execution Mode : ${isLive ? "🚨 LIVE BROADCAST ON-CHAIN" : "🛡️ DRY-RUN SIMULATION (pass --execute for live)"}`);
  console.log(`Sequence Flow  : SEQUENTIAL PER WALLET (Buy 1 -> Buy 2 -> Buy 3 -> Sell 1)`);
  console.log(`Target Token   : ${tokenSymbol} (${TARGET_TOKEN_ADDR})`);
  console.log(`Pool Address   : ${POOL_ADDR} (Fee: ${POOL_FEE})`);
  console.log(`Trade Size     : ${tradeSizeArg} SDA per buy (Total 3 buys = ${(tradeSizeArg * 3).toFixed(4)} SDA)`);
  console.log(`Refund Target  : ${(refundRatioArg * 100).toFixed(0)}% of spent SDA recovered on sell leg (~${(tradeSizeArg * 3 * refundRatioArg).toFixed(4)} SDA)`);
  console.log(`Active Wallets : ${Object.keys(wallets).join(", ")}`);
  console.log("==========================================================================");

  if (isLive) {
    // Pause background server trades to avoid mempool/nonce collisions
    await setServerEmergencyStop(true);
    console.log("⏸️ Paused background engine during live swarm run.");
  }

  const spotPrice = await getSpotPriceSda();
  console.log(`Current Spot Price: ~${spotPrice.toFixed(6)} SDA per ${tokenSymbol} (1 SDA ≈ ${(1 / spotPrice).toFixed(1)} ${tokenSymbol})\n`);

  const initialSnap = {};

  console.log("📋 Initial Wallet Balances:");
  for (const [k, signer] of Object.entries(wallets)) {
    const sdaBal = await provider.getBalance(signer.address);
    const tokenBal = await tokenContract.balanceOf(signer.address);
    initialSnap[k] = {
      sda: Number(ethers.formatEther(sdaBal)),
      tokens: Number(ethers.formatEther(tokenBal))
    };
    console.log(`   [${k}] (${signer.address.substring(0, 6)}...${signer.address.slice(-4)}): ${initialSnap[k].sda.toFixed(4)} SDA | ${initialSnap[k].tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${tokenSymbol}`);
  }
  console.log("--------------------------------------------------------------------------\n");

  const totalSpentPerWallet = tradeSizeArg * 3;
  const targetRefundPerWallet = Number((totalSpentPerWallet * refundRatioArg).toFixed(4));
  const txHistory = [];

  for (const [k, signer] of Object.entries(wallets)) {
    try {
      console.log(`\n======================================================`);
      console.log(`▶️ STARTING 3:1 SEQUENCE FOR [${k.toUpperCase()}] (${signer.address})`);
      console.log(`======================================================`);

      // Pre-wrap WSDA in one batch
      await prepareWalletFuel(k, signer, totalSpentPerWallet, isLive);

      // 3 BUYS
      for (let step = 1; step <= 3; step++) {
        console.log(`[Step ${step}/3 BUYS] Wallet: ${k}`);
        const buyRes = await executeBuy(k, signer, tradeSizeArg, tokenSymbol, isLive);
        txHistory.push({ wallet: k, type: `BUY_${step}`, ...buyRes });
        if (delayArg > 0) await sleep(delayArg);
      }

      // 1 SELL
      console.log(`[Step 4/4 SELL (SAFE HARVEST)] Wallet: ${k}`);
      const sellRes = await executeSell(k, signer, targetRefundPerWallet, spotPrice, tokenSymbol, isLive);
      txHistory.push({ wallet: k, type: "SELL_HARVEST", ...sellRes });
      if (delayArg > 0) await sleep(delayArg);
    } catch (wErr) {
      console.error(`❌ [${k}] Encountered error:`, wErr.reason || wErr.message);
      txHistory.push({ wallet: k, type: "FAILED", error: wErr.reason || wErr.message });
    }
  }

  // Ensure background engine remains safely paused
  if (isLive) {
    console.log("🔒 Background engine remains stopped to protect capital.");
  }

  // Final Reconciliation
  console.log("\n==========================================================================");
  console.log("🏁 SEQUENCE COMPLETE — FINAL BALANCE RECONCILIATION");
  console.log("==========================================================================");

  for (const [k, signer] of Object.entries(wallets)) {
    const sdaBal = await provider.getBalance(signer.address);
    const tokenBal = await tokenContract.balanceOf(signer.address);
    const finalSda = Number(ethers.formatEther(sdaBal));
    const finalTokens = Number(ethers.formatEther(tokenBal));
    const sdaDiff = finalSda - initialSnap[k].sda;
    const tokenDiff = finalTokens - initialSnap[k].tokens;

    console.log(`[${k.toUpperCase()}] (${signer.address.substring(0, 6)}...${signer.address.slice(-4)}):`);
    console.log(`   Native SDA   : ${finalSda.toFixed(4)} SDA (Net Change: ${sdaDiff >= 0 ? "+" : ""}${sdaDiff.toFixed(4)} SDA)`);
    console.log(`   ${tokenSymbol.padEnd(12)} : ${finalTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${tokenSymbol} (Net Change: ${tokenDiff >= 0 ? "+" : ""}${tokenDiff.toFixed(1)} ${tokenSymbol})`);
  }

  console.log("\n📜 On-Chain Confirmed Transactions:");
  for (const item of txHistory) {
    if (item.txHash && item.txHash !== "sim_buy" && item.txHash !== "sim_sell") {
      console.log(`   [${item.wallet}] ${item.type}: https://ledger.sidrachain.com/tx/${item.txHash}`);
    }
  }
  console.log("==========================================================================\n");
}

main().catch(async (err) => {
  console.error("[-] Execution Fatal Error:", err);
  await setServerEmergencyStop(false).catch(() => { });
  process.exit(1);
});
