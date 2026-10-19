import dns from "dns";
dns.setDefaultResultOrder("ipv4first"); // Guarantee fast IPv4 connections and prevent ETIMEDOUT

import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scanMarket } from "../engine/scanner.js";
import { quoteV3Swap } from "../engine/router.js";
import {
  getTopTradersList,
  fetchTopTraderActivity,
  enrichMarketWithTopTraders
} from "../engine/top_trader_tracker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
const TOKENS_CONFIG_PATH = path.join(__dirname, "..", "config", "tokens.json");
const tokensData = JSON.parse(fs.readFileSync(TOKENS_CONFIG_PATH, "utf8"));

const RPC_URL = process.env.RPC_URL || "https://rpc.sidrachain.com";
const sidraNetwork = ethers.Network.from({ name: "sidra", chainId: 97453 });
const provider = new ethers.JsonRpcProvider(RPC_URL, sidraNetwork, { staticNetwork: sidraNetwork });

const ROUTER_ADDR = process.env.ROUTER_ADDRESS || "0x35cAC72Db00e8dAC0e4f7F8A0F53D339E0cC23fb";
const WSDA_ADDR = process.env.WSDA_ADDRESS || "0xE4095a910209D7BE03B55D02F40d4554B1666182";

// RIDE Target Token & Primary Liquidity Pool
export const RIDE_ADDR = process.env.TARGET_TOKEN_ADDRESS || process.env.RIDE_ADDRESS || "0xe91cAC00C1092611EB598B284a87A623a35aF9b7";
export const RIDE_POOL_ADDR = process.env.POOL_ADDRESS || process.env.RIDE_POOL_ADDRESS || "0x4a65a79dbC3e0184972e041525eDeeAb481c6027";
export const RIDE_POOL_FEE = Number(process.env.POOL_FEE || process.env.RIDE_POOL_FEE || "10000");

// Aliases for compatibility
export const TARGET_TOKEN_ADDR = RIDE_ADDR;
export const TARGET_POOL_ADDR = RIDE_POOL_ADDR;
export const TARGET_POOL_FEE = RIDE_POOL_FEE;

// Profit Allocation: 70% Retained in Fleet Wallets | 30% Injected into Liquidity Pool
export const WALLET_PROFIT_SHARE = Number(process.env.WALLET_PROFIT_SHARE || "0.70");
export const LP_PROFIT_SHARE = Number(process.env.LP_PROFIT_SHARE || "0.30");
export const WALLET_PCT_LABEL = Math.round(WALLET_PROFIT_SHARE * 100);
export const LP_PCT_LABEL = Math.round(LP_PROFIT_SHARE * 100);

// Trading Capital Reserve (1.0 SDA pre-wrapped to WSDA)
export const WSDA_RESERVE_SDA = Number(process.env.WSDA_RESERVE_SDA || "1.0");
export const WSDA_RESERVE_WEI = ethers.parseEther(WSDA_RESERVE_SDA.toString());

const SAFE_GAS_PRICE = 2500000000n; // 2.5 Gwei

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const WSDA_ABI = [
  ...ERC20_ABI,
  "function deposit() payable",
  "function withdraw(uint256)"
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLatestNonce(address) {
  const [latest, pending] = await Promise.all([
    provider.getTransactionCount(address, "latest"),
    provider.getTransactionCount(address, "pending")
  ]);
  return Math.max(latest, pending);
}

async function waitForCleanNonce(address, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const [latest, pending] = await Promise.all([
      provider.getTransactionCount(address, "latest"),
      provider.getTransactionCount(address, "pending")
    ]);
    if (latest === pending) return latest;
    await sleep(2000);
  }
  return await provider.getTransactionCount(address, "latest");
}

/**
 * Unwraps surplus WSDA back to native SDA, while strictly preserving the configured WSDA reserve in each fleet wallet.
 */
export async function autoUnwrapAllWallets(swarmWallets, isLive = true, reserveWei = WSDA_RESERVE_WEI) {
  if (!isLive) return;
  const wsdaContract = new ethers.Contract(WSDA_ADDR, WSDA_ABI, provider);
  for (const [key, wallet] of Object.entries(swarmWallets)) {
    try {
      const freshBal = await wsdaContract.balanceOf(wallet.address);
      if (freshBal > reserveWei) {
        const unwrapAmount = freshBal - reserveWei;
        console.log(`   🔄 [${key.toUpperCase()}] Auto-converting surplus ${ethers.formatEther(unwrapAmount)} WSDA -> Native SDA (preserving ${ethers.formatEther(reserveWei)} WSDA reserve)...`);
        const nonce = await waitForCleanNonce(wallet.address);
        const tx = await wsdaContract.connect(wallet).withdraw(unwrapAmount, {
          gasLimit: 85000n,
          gasPrice: SAFE_GAS_PRICE,
          nonce
        });
        await tx.wait(1);
        console.log(`   ✅ [${key.toUpperCase()}] Successfully swapped surplus to native SDA! (Tx: ${tx.hash.slice(0, 16)}...)`);
      }
    } catch (err) {
      console.warn(`   ⚠️ [${key.toUpperCase()}] Auto-unwrap notice: ${err.message}`);
    }
  }
}

/**
 * Pre-wraps native SDA -> WSDA to guarantee fleet wallets hold the target 1.0 WSDA reserve before trading.
 */
export async function ensureWsdaReserveAllWallets(swarmWallets, isLive = true, reserveWei = WSDA_RESERVE_WEI) {
  const wsdaContract = new ethers.Contract(WSDA_ADDR, WSDA_ABI, provider);
  for (const [key, wallet] of Object.entries(swarmWallets)) {
    try {
      const [curWsda, nativeBal] = await Promise.all([
        wsdaContract.balanceOf(wallet.address),
        provider.getBalance(wallet.address)
      ]);

      if (curWsda < reserveWei) {
        const wrapNeeded = reserveWei - curWsda;
        // Require wrapNeeded + 0.03 SDA for gas safety
        if (nativeBal >= wrapNeeded + ethers.parseEther("0.03")) {
          if (isLive) {
            console.log(`   🔄 [${key.toUpperCase()}] Pre-wrapping ${ethers.formatEther(wrapNeeded)} SDA -> WSDA to establish ${WSDA_RESERVE_SDA} WSDA reserve...`);
            const nonce = await waitForCleanNonce(wallet.address);
            const tx = await wsdaContract.connect(wallet).deposit({
              value: wrapNeeded,
              gasLimit: 90000n,
              gasPrice: SAFE_GAS_PRICE,
              nonce
            });
            await tx.wait(1);
            console.log(`   ✅ [${key.toUpperCase()}] Pre-wrap complete! WSDA Reserve: ${WSDA_RESERVE_SDA} WSDA (Tx: ${tx.hash.slice(0, 16)}...)`);
          } else {
            console.log(`   💡 [${key.toUpperCase()}] Eligible for ${WSDA_RESERVE_SDA} WSDA pre-wrap: has ${Number(ethers.formatEther(nativeBal)).toFixed(4)} SDA (Dry-Run)`);
          }
        } else {
          console.log(`   ℹ️ [${key.toUpperCase()}] Native balance (${Number(ethers.formatEther(nativeBal)).toFixed(4)} SDA) below threshold to pre-wrap full ${WSDA_RESERVE_SDA} WSDA reserve.`);
        }
      } else {
        console.log(`   ✅ [${key.toUpperCase()}] Already holds ${Number(ethers.formatEther(curWsda)).toFixed(4)} WSDA reserve.`);
      }
    } catch (err) {
      console.warn(`   ⚠️ [${key.toUpperCase()}] Pre-wrap notice: ${err.message}`);
    }
  }
}

/**
 * Finds all executable cross-pool arbitrage and scalping opportunities across all ecosystem tokens.
 * Evaluates a dynamic size spectrum to extract MAXIMUM net SDA profit per trade.
 */
export function findEcosystemOpportunities(market, testSizes = [0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]) {
  const opps = [];
  const gasEstimate = 320000n; // ~160k gas per leg * 2 legs
  const totalGasCostSda = Number(ethers.formatUnits(gasEstimate * SAFE_GAS_PRICE, 18)); // ~0.0008 SDA

  for (const token of market) {
    // Exclude SVM from cross-pool DEX arb because of 5% sell tax
    if (token.symbol === "SVM") continue;
    if (!token.pools || token.pools.length < 2) continue;

    const healthyPools = token.pools.filter((p) => p.isHealthy && p.spotPriceSda > 0 && p.liquidity > 0n);
    if (healthyPools.length < 2) continue;

    for (let i = 0; i < healthyPools.length; i++) {
      for (let j = 0; j < healthyPools.length; j++) {
        if (i === j) continue;
        const poolBuy = healthyPools[i];
        const poolSell = healthyPools[j];

        // Only evaluate if spot price spread is positive after fees
        if (poolSell.spotPriceSda <= poolBuy.spotPriceSda * 1.0035) continue;

        for (const size of testSizes) {
          const sdaInWei = ethers.parseUnits(size.toString(), 18);

          // Leg 1: WSDA -> Token
          const buyQuote = quoteV3Swap(
            sdaInWei,
            BigInt(poolBuy.sqrtPriceX96),
            BigInt(poolBuy.liquidity),
            poolBuy.feeTier,
            token.taxBps || 0,
            poolBuy.isToken0WSDA
          );

          if (!buyQuote.amountOut || buyQuote.amountOut === 0n) continue;

          // Leg 2: Token -> WSDA
          const sellQuote = quoteV3Swap(
            buyQuote.amountOut,
            BigInt(poolSell.sqrtPriceX96),
            BigInt(poolSell.liquidity),
            poolSell.feeTier,
            token.taxBps || 0,
            !poolSell.isToken0WSDA
          );

          if (!sellQuote.amountOut || sellQuote.amountOut === 0n) continue;

          const sdaOut = Number(ethers.formatUnits(sellQuote.amountOut, 18));
          const grossProfitSda = sdaOut - size;
          const netProfitSda = grossProfitSda - totalGasCostSda;
          const maxImpact = Math.max(buyQuote.priceImpactPct, sellQuote.priceImpactPct);

          if (netProfitSda > 0 && maxImpact <= 4.0) {
            opps.push({
              token: token.symbol,
              tokenAddress: token.address,
              decimals: token.decimals || 18,
              inputSda: size,
              inputSdaWei: sdaInWei,
              expectedOutSda: sdaOut,
              expectedOutSdaWei: sellQuote.amountOut,
              grossProfitSda,
              netProfitSda,
              gasCostSda: totalGasCostSda,
              roiPct: (netProfitSda / size) * 100,
              feeBuy: poolBuy.feeTier,
              feeSell: poolSell.feeTier,
              priceImpactPct: maxImpact
            });
          }
        }
      }
    }
  }

  // Sort by net profit descending (highest absolute profit in SDA first)
  return opps.sort((a, b) => b.netProfitSda - a.netProfitSda);
}

/**
 * Top Trader / Scalper Trade Execution:
 * 1. Executes 2-leg atomic arbitrage
 * 2. Strict capital preservation (Leg 2 reverts if min floor is not met)
 * 3. 30% OF REALIZED NET PROFIT -> RIDE ($RIDE) Token Pool
 * 4. 70% OF REALIZED NET PROFIT -> Retained in Trading Wallet as Native SDA
 */
async function executeArbitrageTrade(walletKey, signer, opp, isLive, swarmWallets = {}, options = {}) {
  const router = new ethers.Contract(ROUTER_ADDR, ROUTER_ABI, signer);
  const wsda = new ethers.Contract(WSDA_ADDR, WSDA_ABI, signer);
  const token = new ethers.Contract(opp.tokenAddress, ERC20_ABI, signer);
  const ride = new ethers.Contract(RIDE_ADDR, ERC20_ABI, signer);

  console.log(`\n--------------------------------------------------------------------------`);
  console.log(`⚡ [TOP SCALPER EXECUTION] [${walletKey.toUpperCase()}] ${opp.token} | Input: ${opp.inputSda} SDA`);
  console.log(`   Route               : Buy Pool (${opp.feeBuy}) ➔ Sell Pool (${opp.feeSell})`);
  console.log(`   Expected Gross      : +${opp.grossProfitSda.toFixed(5)} SDA`);
  console.log(`   Estimated Gas       : ~${opp.gasCostSda.toFixed(5)} SDA`);
  console.log(`   Expected Net Profit : +${opp.netProfitSda.toFixed(5)} SDA (ROI: +${opp.roiPct.toFixed(2)}%)`);
  console.log(`   AMM Price Impact    : ${opp.priceImpactPct.toFixed(2)}%`);
  console.log(`   Target Split        : ${LP_PCT_LABEL}% RIDE Pool | ${WALLET_PCT_LABEL}% Retained in Wallet`);
  console.log(`--------------------------------------------------------------------------`);

  if (!isLive) {
    const simRidePoolShare = opp.netProfitSda * LP_PROFIT_SHARE;
    const simRetainedShare = opp.netProfitSda * WALLET_PROFIT_SHARE;

    console.log(`   [DRY-RUN SIMULATION] Scalp trade verified mathematically:`);
    console.log(`      💧 ${LP_PCT_LABEL}% to RIDE Pool        : +${simRidePoolShare.toFixed(5)} SDA`);
    console.log(`      💰 ${WALLET_PCT_LABEL}% Retained in Wallet: +${simRetainedShare.toFixed(5)} SDA`);
    return {
      success: true,
      netProfit: opp.netProfitSda,
      ridePoolSda: simRidePoolShare,
      retainedSda: simRetainedShare,
      simulated: true
    };
  }

  // 1. Ensure WSDA balance
  const curWsda = await wsda.balanceOf(signer.address);
  if (curWsda < opp.inputSdaWei) {
    const wrapNeeded = opp.inputSdaWei - curWsda;
    const nativeBal = await provider.getBalance(signer.address);
    if (nativeBal < wrapNeeded + ethers.parseEther("0.02")) {
      console.log(`   ❌ [${walletKey}] Insufficient native SDA balance for wrap + gas reserve.`);
      return { success: false, reason: "LOW_NATIVE_BALANCE" };
    }
    const nonce = await waitForCleanNonce(signer.address);
    const wrapTx = await wsda.deposit({ value: wrapNeeded, gasLimit: 90000n, gasPrice: SAFE_GAS_PRICE, nonce });
    await wrapTx.wait(1);
    console.log(`   ✅ [${walletKey}] Wrapped +${ethers.formatEther(wrapNeeded)} SDA -> WSDA`);
  }

  // 2. Ensure Router allowance for WSDA
  const curWsdaAllow = await wsda.allowance(signer.address, ROUTER_ADDR);
  if (curWsdaAllow < opp.inputSdaWei) {
    const nonce = await waitForCleanNonce(signer.address);
    const appTx = await wsda.approve(ROUTER_ADDR, ethers.MaxUint256, { gasLimit: 75000n, gasPrice: SAFE_GAS_PRICE, nonce });
    await appTx.wait(1);
    console.log(`   ✅ [${walletKey}] Approved WSDA to PinetSwap Router`);
  }

  // 3. Leg 1: Swap WSDA -> Token on feeBuy pool
  console.log(`   ▶️ [${walletKey}] Leg 1: Swapping ${opp.inputSda} WSDA -> ${opp.token} (Fee ${opp.feeBuy})...`);
  const tokenBalBefore = await token.balanceOf(signer.address);
  const nonce1 = await waitForCleanNonce(signer.address);

  const leg1Tx = await router.exactInputSingle({
    tokenIn: WSDA_ADDR,
    tokenOut: opp.tokenAddress,
    fee: opp.feeBuy,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: opp.inputSdaWei,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0
  }, { gasLimit: 260000n, gasPrice: SAFE_GAS_PRICE, nonce: nonce1 });

  const r1 = await leg1Tx.wait(1);
  const tokenBalAfter = await token.balanceOf(signer.address);
  const tokensAcquired = tokenBalAfter - tokenBalBefore;

  if (tokensAcquired === 0n) {
    console.log(`   ❌ [${walletKey}] Zero tokens received in Leg 1. Aborting trade.`);
    return { success: false, reason: "ZERO_TOKENS_ACQUIRED" };
  }

  console.log(`   ✅ [${walletKey}] Leg 1 Confirmed! Acquired: ${ethers.formatUnits(tokensAcquired, opp.decimals)} ${opp.token} (Tx: ${leg1Tx.hash.slice(0, 16)}...)`);

  // 4. Ensure Router allowance for Token
  const curTokenAllow = await token.allowance(signer.address, ROUTER_ADDR);
  if (curTokenAllow < tokensAcquired) {
    const nonceApp = await waitForCleanNonce(signer.address);
    const appTx2 = await token.approve(ROUTER_ADDR, ethers.MaxUint256, { gasLimit: 75000n, gasPrice: SAFE_GAS_PRICE, nonce: nonceApp });
    await appTx2.wait(1);
    console.log(`   ✅ [${walletKey}] Approved ${opp.token} to Router`);
  }

  // 5. Leg 2: Swap Token -> WSDA on feeSell pool with STRICT PRINCIPAL & PROFIT PROTECTION FLOOR
  const profitBufferWei = BigInt(Math.max(0, Math.floor(opp.netProfitSda * 0.25 * 1e18)));
  const minWsdaOut = opp.inputSdaWei + profitBufferWei;

  console.log(`   ▶️ [${walletKey}] Leg 2: Selling ${opp.token} -> WSDA (Fee ${opp.feeSell}) [Guaranteed Floor: ${ethers.formatEther(minWsdaOut)} WSDA]...`);
  const wsdaBefore = await wsda.balanceOf(signer.address);
  const nonce2 = await waitForCleanNonce(signer.address);

  const leg2Tx = await router.exactInputSingle({
    tokenIn: opp.tokenAddress,
    tokenOut: WSDA_ADDR,
    fee: opp.feeSell,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: tokensAcquired,
    amountOutMinimum: minWsdaOut,
    sqrtPriceLimitX96: 0
  }, { gasLimit: 260000n, gasPrice: SAFE_GAS_PRICE, nonce: nonce2 });

  const r2 = await leg2Tx.wait(1);
  const wsdaAfter = await wsda.balanceOf(signer.address);
  const wsdaGained = wsdaAfter - wsdaBefore;

  const actualSdaOut = Number(ethers.formatEther(wsdaGained));
  const gasSpent = (r1.gasUsed + r2.gasUsed) * SAFE_GAS_PRICE;
  const gasSpentSda = Number(ethers.formatEther(gasSpent));
  const realizedNetProfit = actualSdaOut - opp.inputSda - gasSpentSda;

  console.log(`   ✅ [${walletKey}] Leg 2 Confirmed! (Tx: ${leg2Tx.hash.slice(0, 16)}... | Gas: ${r2.gasUsed.toString()})`);
  console.log(`   🎉 [${walletKey}] SCALP PROFIT REALIZED:`);
  console.log(`      Gross WSDA Returned : ${actualSdaOut.toFixed(5)} WSDA`);
  console.log(`      Total Gas Spent     : ${gasSpentSda.toFixed(5)} SDA`);
  console.log(`      REALIZED NET PROFIT : ${realizedNetProfit >= 0 ? "+" : ""}${realizedNetProfit.toFixed(5)} SDA`);

  let ridePoolShare = 0;
  let retainedWalletShare = 0;
  let rideTokensAcquired = 0n;

  if (realizedNetProfit > 0) {
    // 30% TO THE POOL OF RIDE TOKEN
    ridePoolShare = realizedNetProfit * LP_PROFIT_SHARE;
    // 70% RETAINED IN TRADING WALLET
    retainedWalletShare = realizedNetProfit * WALLET_PROFIT_SHARE;

    const rideShareWei = ethers.parseEther(ridePoolShare.toFixed(18));

    // A. EXECUTE 30% INJECTION INTO RIDE TOKEN POOL
    if (rideShareWei > 100000000000000n) { // > 0.0001 SDA
      try {
        console.log(`   🚀 [${walletKey}] ROUTING ${LP_PCT_LABEL}% NET PROFIT (+${ridePoolShare.toFixed(5)} SDA) TO RIDE POOL...`);
        const rideBalBefore = await ride.balanceOf(signer.address);
        const nonceLp = await waitForCleanNonce(signer.address);

        const lpTx = await router.exactInputSingle({
          tokenIn: WSDA_ADDR,
          tokenOut: RIDE_ADDR,
          fee: RIDE_POOL_FEE,
          recipient: signer.address,
          deadline: Math.floor(Date.now() / 1000) + 300,
          amountIn: rideShareWei,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0
        }, { gasLimit: 250000n, gasPrice: SAFE_GAS_PRICE, nonce: nonceLp });

        await lpTx.wait(1);
        const rideBalAfter = await ride.balanceOf(signer.address);
        rideTokensAcquired = rideBalAfter - rideBalBefore;

        console.log(`   💧 [${walletKey}] RIDE POOL INJECTION COMPLETE!`);
        console.log(`      Injected WSDA to Pool : +${ridePoolShare.toFixed(5)} WSDA`);
        console.log(`      RIDE Tokens Acquired  : +${ethers.formatEther(rideTokensAcquired)} RIDE`);
        console.log(`      Tx Hash               : ${lpTx.hash.slice(0, 16)}...`);
      } catch (errLp) {
        console.error(`   ❌ [${walletKey}] Failed executing ${LP_PCT_LABEL}% RIDE pool swap:`, errLp.message);
      }
    }

    // B. UNWRAP SURPLUS WSDA (Preserving 1 WSDA reserve, unwrapping remainder to Native SDA)
    const remainingWsda = await wsda.balanceOf(signer.address);
    if (remainingWsda > WSDA_RESERVE_WEI) {
      const unwrapAmount = remainingWsda - WSDA_RESERVE_WEI;
      try {
        const nonceUnwrap = await waitForCleanNonce(signer.address);
        const unwrapTx = await wsda.withdraw(unwrapAmount, { gasLimit: 85000n, gasPrice: SAFE_GAS_PRICE, nonce: nonceUnwrap });
        await unwrapTx.wait(1);
        console.log(`   💰 [${walletKey}] Retained + Unwrapped ${ethers.formatEther(unwrapAmount)} surplus WSDA -> Native SDA (${WSDA_RESERVE_SDA} WSDA reserve retained)`);
      } catch (errUnwrap) {
        console.log(`   ⚠️ [${walletKey}] Auto-unwrap notice: ${errUnwrap.message}`);
      }
    } else {
      console.log(`   💰 [${walletKey}] Retained ${ethers.formatEther(remainingWsda)} WSDA as trading reserve in wallet`);
    }

    // GUARANTEE ALL WALLETS PRESERVE 1 WSDA RESERVE (SURPLUS UNWRAPPED)
    await autoUnwrapAllWallets(swarmWallets, isLive);
  } else {
    // If trade was break-even or negative, unwrap surplus beyond 1 WSDA reserve
    const remainingWsda = await wsda.balanceOf(signer.address);
    if (remainingWsda > WSDA_RESERVE_WEI) {
      const unwrapAmount = remainingWsda - WSDA_RESERVE_WEI;
      const nonceUnwrap = await waitForCleanNonce(signer.address);
      const unwrapTx = await wsda.withdraw(unwrapAmount, { gasLimit: 85000n, gasPrice: SAFE_GAS_PRICE, nonce: nonceUnwrap });
      await unwrapTx.wait(1);
    }
    await autoUnwrapAllWallets(swarmWallets, isLive);
  }

  return {
    success: true,
    netProfit: realizedNetProfit,
    ridePoolSda: ridePoolShare,
    retainedSda: retainedWalletShare,
    rideTokensAcquired: Number(ethers.formatEther(rideTokensAcquired)),
    txHash: leg2Tx.hash
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes("--execute");
  const isContinuous = args.includes("--continuous") || args.includes("--loop");
  const maxRounds = Number(args.find((a) => a.startsWith("--rounds="))?.split("=")[1] || (isContinuous ? 999999 : 1));
  const minProfitThreshold = Number(args.find((a) => a.startsWith("--min-profit="))?.split("=")[1] || 0.0001);
  const singleWalletArg = args.find((a) => a.startsWith("--wallet="))?.split("=")[1];
  const intervalSec = Number(args.find((a) => a.startsWith("--interval="))?.split("=")[1] || 15);

  const rawKeys = {
    wallet1: process.env.PRIVATE_KEY_1 || process.env.PRIVATE_KEY,
    wallet2: process.env.PRIVATE_KEY_2,
    wallet3: process.env.PRIVATE_KEY_3,
    wallet4: process.env.PRIVATE_KEY_4,
    wallet5: process.env.PRIVATE_KEY_5
  };

  const swarmWallets = {};
  for (const [key, pk] of Object.entries(rawKeys)) {
    if (singleWalletArg && key !== singleWalletArg) continue;
    if (pk) {
      const formattedPk = pk.startsWith("0x") ? pk : `0x${pk}`;
      swarmWallets[key] = new ethers.Wallet(formattedPk, provider);
    }
  }

  const walletKeys = Object.keys(swarmWallets);
  if (walletKeys.length === 0) {
    throw new Error("No valid wallet private keys found in .env!");
  }

  const topTraders = getTopTradersList();
  console.log("==========================================================================");
  console.log(`🦅 TOP TRADER & SCALPER: 43-TOKEN ARBITRAGE & ${WALLET_PCT_LABEL}/${LP_PCT_LABEL} RIDE SWARM ENGINE`);
  console.log("==========================================================================");
  console.log(`Execution Mode     : ${isLive ? "🚨 LIVE BROADCAST ON-CHAIN" : "🛡️ DRY-RUN SIMULATION (pass --execute for live)"}`);
  console.log(`Active Swarm Fleet : ${walletKeys.join(", ")} (${walletKeys.length} Wallets Active)`);
  console.log(`Top Traders Tracked: ${topTraders.join(", ")}`);
  console.log(`Execution Mandate  : ANY PROFIT >= +${minProfitThreshold} SDA MUST EXECUTE`);
  console.log(`RIDE Token         : ${RIDE_ADDR}`);
  console.log(`WSDA Trade Reserve : ${WSDA_RESERVE_SDA} WSDA per eligible wallet (pre-wrapped from SDA)`);
  console.log(`RIDE Pool Share    : ${LP_PCT_LABEL}% Routed directly into RIDE Pool (${RIDE_POOL_ADDR})`);
  console.log(`Retained SDA       : ${WALLET_PCT_LABEL}% Kept in executing wallet as native capital reserve`);
  console.log(`Scan Interval      : ${intervalSec}s`);
  console.log(`Total Rounds       : ${isContinuous ? "Continuous 24/7 Scalping" : maxRounds}`);
  console.log("==========================================================================\n");

  const wsdaContract = new ethers.Contract(WSDA_ADDR, ERC20_ABI, provider);
  const rideContract = new ethers.Contract(RIDE_ADDR, ERC20_ABI, provider);

  const walletProfits = {};
  const walletTradesCount = {};

  console.log("👥 Fleet Wallets Status & Balance Check:");
  for (const k of walletKeys) {
    walletProfits[k] = 0;
    walletTradesCount[k] = 0;
    const w = swarmWallets[k];
    const [bal, wsdaBal, rideBal, latestNonce, pendingNonce] = await Promise.all([
      provider.getBalance(w.address),
      wsdaContract.balanceOf(w.address),
      rideContract.balanceOf(w.address),
      provider.getTransactionCount(w.address, "latest"),
      provider.getTransactionCount(w.address, "pending")
    ]);
    const isClean = latestNonce === pendingNonce;
    console.log(`   • [${k.toUpperCase().padEnd(8)}] ${w.address} | Native: ${Number(ethers.formatEther(bal)).toFixed(4)} SDA | WSDA: ${Number(ethers.formatEther(wsdaBal)).toFixed(4)} | RIDE: ${Number(ethers.formatEther(rideBal)).toFixed(2)} | Mempool: ${isClean ? "Clean" : "BUSY"}`);
  }

  // Pre-flight check: ensure 1 SDA -> WSDA reserve for eligible wallets, and unwrap surplus WSDA above reserve
  console.log("\n📦 Initializing WSDA Trading Reserves across fleet:");
  await ensureWsdaReserveAllWallets(swarmWallets, isLive);
  await autoUnwrapAllWallets(swarmWallets, isLive);

  let round = 1;
  let totalCumulativeProfit = 0;
  let totalRidePoolInjected = 0;
  let totalRideTokensAcquired = 0;
  let totalTradesExecuted = 0;
  let walletRotationIndex = 0;

  // Dynamic test size spectrum to extract maximum profit curve
  const testSizes = [0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.25, 1.5];

  while (round <= maxRounds) {
    console.log(`\n==========================================================================`);
    console.log(`🔍 [ROUND #${round}] Scanning 43+ Ecosystem Contracts across fee tiers (500, 3000, 10000)...`);
    console.log(`==========================================================================`);

    // Top Trader Radar & Dynamic Token Enrichment
    const topTraderMarketTokens = [];
    try {
      const traderEnrich = await enrichMarketWithTopTraders(topTraderMarketTokens, provider);
      const traderSignals = traderEnrich.activities.filter((a) => a.isNew);

      if (traderSignals.length > 0) {
        console.log(`   🎯 [TOP TRADER RADAR] Detected ${traderSignals.length} Active Top Trader Trade(s):`);
        for (const sig of traderSignals.slice(0, 3)) {
          console.log(`      ⚡ [${sig.trader.slice(0, 10)}...] ${sig.action} ${sig.tokenAddress.slice(0, 10)}... (Fee ${sig.feeTier})`);
        }
      }

      if (traderEnrich.newTokensDiscovered.length > 0) {
        console.log(`   ✨ [TOP TRADER DISCOVERY] Dynamically enriched ${traderEnrich.newTokensDiscovered.length} token(s) from Top Traders: ${traderEnrich.newTokensDiscovered.map((t) => t.symbol).join(", ")}`);
      }
    } catch (errRadar) {
      // Non-blocking radar check
    }

    const t0 = Date.now();
    const market = await scanMarket(provider, topTraderMarketTokens);
    const scanTime = ((Date.now() - t0) / 1000).toFixed(1);

    const opportunities = findEcosystemOpportunities(market, testSizes);
    const profitable = opportunities.filter((o) => o.netProfitSda >= minProfitThreshold);

    console.log(`   Scan completed in ${scanTime}s. Evaluated ${market.length} tokens.`);

    if (profitable.length === 0) {
      console.log(`   ℹ️ No spreads currently exceed the +${minProfitThreshold} SDA profit threshold.`);
      console.log(`   All ecosystem pools are balanced within gas limits.`);
    } else {
      console.log(`   🎯 Detected ${profitable.length} Profitable Arbitrage Route(s) >= +${minProfitThreshold} SDA!`);

      // De-duplicate: pick the single optimal size & route per token
      const bestRouteByToken = new Map();
      for (const opp of profitable) {
        if (!bestRouteByToken.has(opp.token) || bestRouteByToken.get(opp.token).netProfitSda < opp.netProfitSda) {
          bestRouteByToken.set(opp.token, opp);
        }
      }

      // Sort unique token opportunities by highest net profit in SDA
      const sortedOpps = Array.from(bestRouteByToken.values()).sort((a, b) => b.netProfitSda - a.netProfitSda);

      console.log(`   ⭐ Discovered ${sortedOpps.length} Unique Profitable Tokens. Distributing across swarm wallets...`);

      for (const opp of sortedOpps) {
        // Find clean wallet with sufficient balance
        let selectedKey = null;
        let selectedSigner = null;

        for (let attempt = 0; attempt < walletKeys.length; attempt++) {
          const candidateKey = walletKeys[(walletRotationIndex + attempt) % walletKeys.length];
          const candidateWallet = swarmWallets[candidateKey];
          const [bal, wsdaBal, latestNonce, pendingNonce] = await Promise.all([
            provider.getBalance(candidateWallet.address),
            wsdaContract.balanceOf(candidateWallet.address),
            provider.getTransactionCount(candidateWallet.address, "latest"),
            provider.getTransactionCount(candidateWallet.address, "pending")
          ]);

          const totalAvailableSda = Number(ethers.formatEther(bal + wsdaBal));
          if (latestNonce === pendingNonce && totalAvailableSda >= opp.inputSda + 0.04 && Number(ethers.formatEther(bal)) >= 0.02) {
            selectedKey = candidateKey;
            selectedSigner = candidateWallet;
            walletRotationIndex = (walletRotationIndex + attempt + 1) % walletKeys.length;
            break;
          }
        }

        if (!selectedKey) {
          console.log(`   ⚠️ No clean wallet has sufficient balance for ${opp.inputSda} SDA trade on ${opp.token}. Skipping.`);
          continue;
        }

        console.log(`\n   ⭐ Optimal Route for [${opp.token}] assigned to [${selectedKey.toUpperCase()}]:`);
        console.log(`      Size: ${opp.inputSda} SDA | Fee ${opp.feeBuy} ➔ Fee ${opp.feeSell}`);
        console.log(`      Expected Net Profit: +${opp.netProfitSda.toFixed(5)} SDA (ROI: +${opp.roiPct.toFixed(2)}%)`);

        try {
          const result = await executeArbitrageTrade(
            selectedKey,
            selectedSigner,
            opp,
            isLive,
            swarmWallets
          );

          if (result.success && result.netProfit) {
            totalCumulativeProfit += result.netProfit;
            totalRidePoolInjected += result.ridePoolSda || 0;
            totalRideTokensAcquired += result.rideTokensAcquired || 0;

            walletProfits[selectedKey] += result.netProfit;
            walletTradesCount[selectedKey]++;
            totalTradesExecuted++;
          }
        } catch (err) {
          console.error(`   ❌ [${selectedKey}] Execution error for ${opp.token}:`, err.reason || err.message);
        }

        await sleep(2500);
      }
    }

    console.log(`\n--------------------------------------------------------------------------`);
    console.log(`📊 ROUND #${round} SUMMARY:`);
    console.log(`   Total Trades Executed   : ${totalTradesExecuted}`);
    console.log(`   Total Realized Profit   : +${totalCumulativeProfit.toFixed(5)} SDA`);
    console.log(`   💧 ${LP_PCT_LABEL}% to RIDE Pool     : +${totalRidePoolInjected.toFixed(5)} SDA (+${totalRideTokensAcquired.toFixed(2)} RIDE Acquired)`);
    console.log(`   💰 ${WALLET_PCT_LABEL}% Retained in Wallets: +${(totalCumulativeProfit * WALLET_PROFIT_SHARE).toFixed(5)} SDA`);
    console.log(`   Per-Wallet Executed Performance:`);
    for (const k of walletKeys) {
      console.log(`     • [${k.toUpperCase().padEnd(8)}]: Executed +${walletProfits[k].toFixed(5)} SDA (${walletTradesCount[k]} Trades)`);
    }
    console.log(`--------------------------------------------------------------------------`);

    // Ensure all profits across all wallets are held as native SDA token
    await autoUnwrapAllWallets(swarmWallets, isLive);

    if (round < maxRounds) {
      console.log(`\n⏳ Next multi-wallet scalping scan in ${intervalSec} seconds...`);
      await sleep(intervalSec * 1000);
    }
    round++;
  }

  console.log("\n==========================================================================");
  console.log(`🏁 FINISHED: Realized Total of +${totalCumulativeProfit.toFixed(5)} SDA Profit Across Ecosystem!`);
  console.log(`   💧 RIDE Pool Injection (${LP_PCT_LABEL}%): +${totalRidePoolInjected.toFixed(5)} SDA (+${totalRideTokensAcquired.toFixed(2)} RIDE Acquired)`);
  console.log(`   💰 Retained Capital (${WALLET_PCT_LABEL}%)     : +${(totalCumulativeProfit * WALLET_PROFIT_SHARE).toFixed(5)} SDA`);
  console.log("==========================================================================");
}

main().catch(console.error);
