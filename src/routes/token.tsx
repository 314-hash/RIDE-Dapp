import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Coins,
  Wallet,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  Percent,
  Award,
  Layers,
  Activity,
  Car,
} from "lucide-react";
import { PageShell } from "@/components/site/Layout";
import { SectionHeading } from "@/components/site/ui";
import {
  type WalletState,
  loadSavedWalletState,
  connectInjectedWallet,
  initSimulatedWallet,
  claimFaucetTokens,
  stakeTokens,
  fetchSidraBlockHeight,
  SIDRA_CHAIN_CONFIG,
} from "@/lib/web3";

export const Route = createFileRoute("/token")({
  head: () => ({
    meta: [
      { title: "RIDE Token DApp — Utility, Rewards & Staking on Sidra Chain" },
      {
        name: "description",
        content:
          "Connect wallet, inspect the official RIDE token contract on Sidra Chain (97453), stake for driver perks, and claim testnet rewards.",
      },
      { property: "og:title", content: "RIDE Token DApp — RIDE TOKENS" },
      {
        property: "og:description",
        content: "Smart mobility meets blockchain utility on Sidra Chain.",
      },
    ],
  }),
  component: TokenPage,
});

function TokenPage() {
  const [wallet, setWallet] = useState<WalletState>(() => loadSavedWalletState());
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedPool, setCopiedPool] = useState(false);
  const [blockHeight, setBlockHeight] = useState<number>(1894200);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  // Staking simulator
  const [stakeAmount, setStakeAmount] = useState<number>(50);
  const [stakeSuccess, setStakeSuccess] = useState<string | null>(null);

  // Rewards calculation simulator
  const [simKm, setSimKm] = useState<number>(15);

  useEffect(() => {
    fetchSidraBlockHeight().then(setBlockHeight);
    const interval = setInterval(() => {
      fetchSidraBlockHeight().then(setBlockHeight);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const copyContract = async () => {
    await navigator.clipboard.writeText(SIDRA_CHAIN_CONFIG.rideTokenAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const copyPool = async () => {
    await navigator.clipboard.writeText(SIDRA_CHAIN_CONFIG.ridePoolAddress);
    setCopiedPool(true);
    setTimeout(() => setCopiedPool(false), 2000);
  };

  const handleConnect = async () => {
    const updated = await connectInjectedWallet();
    setWallet(updated);
  };

  const handleDemoWallet = () => {
    const updated = initSimulatedWallet();
    setWallet(updated);
  };

  const handleClaimFaucet = () => {
    const updated = claimFaucetTokens(wallet);
    setWallet(updated);
    setFaucetMsg("Successfully minted 250 RIDE test tokens and 2.5 SDA native gas!");
    setTimeout(() => setFaucetMsg(null), 3500);
  };

  const handleStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      handleDemoWallet();
      return;
    }
    try {
      const updated = stakeTokens(stakeAmount, wallet);
      setWallet(updated);
      setStakeSuccess(`Successfully staked ${stakeAmount} RIDE tokens! Tier status upgraded.`);
      setTimeout(() => setStakeSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || "Failed to stake tokens");
    }
  };

  return (
    <PageShell>
      {/* Hero Header */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-background py-16 sm:py-20">
        <div className="container-page relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex justify-center mb-5">
              <img
                src="/ride-token-logo.jpg"
                alt="RIDE TOKEN on Sidra Chain"
                className="h-24 w-24 rounded-3xl object-cover ring-4 ring-purple-500/50 shadow-2xl shadow-purple-500/30"
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-500 mb-4">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Sidra Chain Verified Contract • ID: 97453
            </div>
            <h1 className="text-4xl font-extrabold sm:text-6xl tracking-tight">
              RIDE Token <span className="text-primary">Ecosystem</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Powering transparent mobility, automated ride cashback, driver staking incentives, and decentralized
              coordination on Sidra Chain.
            </p>

            {/* Quick Stats Pill Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-mono">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>Sidra Block: #{blockHeight.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-mono">
                <Coins className="h-4 w-4 text-cyan-500" />
                <span>Ride Discount: 15% Active</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-mono">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Rewards: 1.5 RIDE / km</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Section */}
      <section className="py-12 sm:py-16">
        <div className="container-page space-y-12">
          {/* Top Grid: Contract Details & Live Wallet Cockpit */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Card: Official Contract Ledger */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  <h3 className="text-xl font-bold">Official Contract Ledger</h3>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                  Verified
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {/* RIDE Token Address */}
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">RIDE Token Contract Address</p>
                  <div className="flex items-center gap-2 rounded-2xl bg-secondary/70 p-3 border border-border">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs font-bold text-foreground">
                      {SIDRA_CHAIN_CONFIG.rideTokenAddress}
                    </code>
                    <button
                      onClick={copyContract}
                      className="rounded-lg p-2 hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                      title="Copy Address"
                    >
                      {copiedAddr ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* DEX WSDA / RIDE Liquidity Pool */}
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Sidra DEX Pool (WSDA / RIDE)</p>
                  <div className="flex items-center gap-2 rounded-2xl bg-secondary/70 p-3 border border-border">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">
                      {SIDRA_CHAIN_CONFIG.ridePoolAddress}
                    </code>
                    <button
                      onClick={copyPool}
                      className="rounded-lg p-2 hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                      title="Copy Pool Address"
                    >
                      {copiedPool ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Network Metadata Specs */}
                <dl className="grid gap-2 text-xs border-t border-border pt-4">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Blockchain Network</dt>
                    <dd className="font-semibold text-foreground">Sidra Chain (Mainnet)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Chain ID</dt>
                    <dd className="font-mono font-semibold">97453 (0x17cb5)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Native Gas Asset</dt>
                    <dd className="font-semibold">SDA (Sidra Digital Asset, 18 decimals)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">DEX Router</dt>
                    <dd className="font-mono truncate max-w-[200px]">{SIDRA_CHAIN_CONFIG.routerAddress}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Public RPC Endpoint</dt>
                    <dd className="font-mono text-cyan-600 font-semibold">{SIDRA_CHAIN_CONFIG.rpcUrl}</dd>
                  </div>
                </dl>

                {/* Explorer Link */}
                <div className="pt-2">
                  <a
                    href={`${SIDRA_CHAIN_CONFIG.blockExplorerUrl}/address/${SIDRA_CHAIN_CONFIG.rideTokenAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <span>View RIDE Contract on Sidra Block Explorer</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Card: Live Wallet & Balances Cockpit */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold">Wallet & Token Balance</h3>
                  </div>
                  {wallet.isConnected && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
                    </span>
                  )}
                </div>

                {wallet.isConnected ? (
                  <div className="mt-6 space-y-4">
                    {/* Address pill */}
                    <div className="rounded-2xl bg-secondary/60 p-3 text-xs font-mono">
                      <span className="text-muted-foreground">Account: </span>
                      <span className="font-bold text-foreground">{wallet.address}</span>
                    </div>

                    {/* Balances Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                        <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase">RIDE Balance</p>
                        <p className="mt-1 text-3xl font-black text-cyan-600 dark:text-cyan-400">
                          {wallet.rideBalance}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Eligible for 15% discount</p>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase">SDA Gas Balance</p>
                        <p className="mt-1 text-3xl font-black text-foreground">{wallet.sdaBalance}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Sidra Chain Native</p>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Staked RIDE</p>
                        <p className="mt-1 text-2xl font-black text-primary">{wallet.stakedRide}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tier: Silver Driver</p>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Lifetime Rewards</p>
                        <p className="mt-1 text-2xl font-black text-emerald-600">+{wallet.earnedRewards}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">From completed trips</p>
                      </div>
                    </div>

                    {faucetMsg && (
                      <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-600 animate-in fade-in">
                        {faucetMsg}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 py-6 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                      <Wallet className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">No Wallet Connected</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Connect your browser wallet or launch an instant Sidra testnet wallet to inspect balances and test token payments.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleConnect}
                        className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover shadow"
                      >
                        Connect MetaMask / Rabby
                      </button>
                      <button
                        type="button"
                        onClick={handleDemoWallet}
                        className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-2.5 text-xs font-bold text-cyan-600 hover:bg-cyan-500/20"
                      >
                        Launch Instant Demo Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Faucet Claim Button */}
              {wallet.isConnected && (
                <div className="mt-6 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={handleClaimFaucet}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-cyan-600 py-3 text-xs font-bold text-white shadow-soft hover:opacity-95 transition-opacity"
                  >
                    <Sparkles className="h-4 w-4" /> Claim 250 Free Testnet RIDE + 2.5 SDA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4 Core Utility Pillars */}
          <div>
            <SectionHeading
              eyebrow="Practical Digital Utility"
              title="Four Real-World Token Use Cases"
            >
              RIDE TOKENS combines everyday transport with digital utility designed to reward passengers,
              empower drivers, and ensure network sustainability.
            </SectionHeading>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                  <Percent className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">15% Fare Discount</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Passengers who choose RIDE token as their payment method receive an instant 15% discount on all
                  trips compared to traditional cash or card.
                </p>
                <Link to="/book" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  Try on Booking <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 mb-4">
                  <Award className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Ride-to-Earn Cashback</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Every kilometer traveled on the network earns verified RIDE token rewards minted on Sidra Chain
                  upon trip completion.
                </p>
                <div className="mt-4 rounded-xl bg-secondary/80 p-2.5 text-[11px] font-mono text-cyan-600 font-bold">
                  Rate: 1.5 RIDE / km
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Driver Tier Staking</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Drivers who stake RIDE tokens unlock reduced platform commissions (down to 2%), priority dispatch
                  matching, and peak-hour bonus multipliers.
                </p>
                <Link to="/drive" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline">
                  Driver Benefits <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft hover:shadow-lift transition-all">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 mb-4">
                  <Layers className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">DEX Pool Liquidity</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Liquidity pool on Sidra Chain (`0x4a65...6027`) pairs RIDE with Wrapped SDA (WSDA), enabling automated
                  swaps and ecosystem settlement.
                </p>
                <a
                  href={`${SIDRA_CHAIN_CONFIG.blockExplorerUrl}/address/${SIDRA_CHAIN_CONFIG.ridePoolAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  View Pool <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Interactive Staking & Cashback Simulator */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Staking Cockpit */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" /> Driver & Partner Staking Simulator
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Stake RIDE tokens to upgrade your mobility tier and reduce platform fees.
              </p>

              <form onSubmit={handleStake} className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase mb-1">
                    <span>Stake Amount (RIDE)</span>
                    <span>Available: {wallet.rideBalance} RIDE</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(Number(e.target.value))}
                      className="field text-lg font-black text-primary pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setStakeAmount(100)}
                      className="absolute right-3 top-2.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold hover:bg-accent"
                    >
                      Max 100
                    </button>
                  </div>
                </div>

                {/* Tier Reward Benefit Preview */}
                <div className="rounded-2xl border border-border bg-secondary/50 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Rate</span>
                    <span className="font-bold text-emerald-600">
                      {stakeAmount >= 250 ? "2.0% (Diamond)" : stakeAmount >= 100 ? "4.5% (Gold)" : stakeAmount >= 50 ? "6.0% (Silver)" : "8.0% (Standard)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Staking Yield</span>
                    <span className="font-bold text-primary">12.5% Annual Token Bonus</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispatch Priority</span>
                    <span className="font-bold text-foreground">High Priority Radar Rank #1</span>
                  </div>
                </div>

                {stakeSuccess && (
                  <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-600 animate-in fade-in">
                    {stakeSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-soft hover:bg-primary-hover active:scale-98 transition-all"
                >
                  {wallet.isConnected ? `Stake ${stakeAmount} RIDE Tokens` : "Connect Wallet to Stake"}
                </button>
              </form>
            </div>

            {/* Ride-to-Earn Rewards Calculator */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-soft flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" /> Ride-to-Earn Rewards Calculator
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimate how many RIDE tokens you earn by commuting with RIDE TOKENS.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase mb-1">
                      <span>Trip Distance: {simKm} km</span>
                      <span className="font-mono text-cyan-600">1.5 RIDE / km</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={simKm}
                      onChange={(e) => setSimKm(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  {/* Calculator Output Display */}
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 text-center">
                    <p className="text-xs uppercase font-bold text-muted-foreground">Estimated Trip Reward</p>
                    <p className="text-4xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                      +{(simKm * 1.5).toFixed(2)} RIDE
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minted directly to your connected wallet upon completed arrival
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• Verified against real GPS odometer distance</p>
                    <p>• Automatically usable for 15% discount on your next journey</p>
                    <p>• Fully tradeable on Sidra Chain DEX pools</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <Link
                  to="/book"
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-secondary hover:bg-accent py-3 text-xs font-bold text-foreground border border-border transition-colors"
                >
                  <Car className="h-4 w-4 text-primary" /> Book a Ride & Start Earning
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
