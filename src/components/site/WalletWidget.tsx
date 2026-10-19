import { useState, useEffect } from "react";
import { Wallet, Coins, Copy, Check, ExternalLink, Power, Sparkles, X, ShieldCheck } from "lucide-react";
import {
  type WalletState,
  loadSavedWalletState,
  connectInjectedWallet,
  initSimulatedWallet,
  claimFaucetTokens,
  saveWalletState,
  defaultWalletState,
  SIDRA_CHAIN_CONFIG,
} from "@/lib/web3";

export function WalletWidget() {
  const [wallet, setWallet] = useState<WalletState>(() => loadSavedWalletState());
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<string | null>(null);

  // Sync wallet on mount
  useEffect(() => {
    const saved = loadSavedWalletState();
    setWallet(saved);
  }, []);

  const handleConnect = async () => {
    const updated = await connectInjectedWallet();
    setWallet(updated);
  };

  const handleDemoConnect = () => {
    const updated = initSimulatedWallet();
    setWallet(updated);
  };

  const handleDisconnect = () => {
    localStorage.removeItem("ride_token_wallet_state_v1");
    setWallet(defaultWalletState);
    setModalOpen(false);
  };

  const handleClaimFaucet = () => {
    const updated = claimFaucetTokens(wallet);
    setWallet(updated);
    setFaucetMsg("Successfully claimed 250 RIDE and 2.5 SDA!");
    setTimeout(() => setFaucetMsg(null), 3000);
  };

  const copyAddress = async () => {
    if (!wallet.address) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const copyTokenAddress = async () => {
    await navigator.clipboard.writeText(SIDRA_CHAIN_CONFIG.rideTokenAddress);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <>
      {/* Header Pill Button */}
      {wallet.isConnected ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold shadow-soft hover:bg-secondary transition-all"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-foreground font-bold">
              {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
            </span>
          </div>

          <div className="hidden items-center gap-2 border-l border-border pl-2 sm:flex">
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold">
              <Coins className="h-3 w-3" />
              {wallet.rideBalance} RIDE
            </span>
            <span className="text-muted-foreground font-mono">{wallet.sdaBalance} SDA</span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary-hover active:scale-95 transition-all"
        >
          <Wallet className="h-3.5 w-3.5" />
          <span>Connect Wallet</span>
        </button>
      )}

      {/* Wallet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Sidra Chain Wallet</h3>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Sidra Chain (ID: 97453)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {wallet.isConnected ? (
              <div className="mt-5 space-y-4">
                {/* Account Address Box */}
                <div className="flex items-center justify-between rounded-2xl bg-secondary/70 p-3.5 border border-border">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Connected Account</p>
                    <p className="font-mono text-xs font-bold text-foreground truncate">{wallet.address}</p>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                    title="Copy Address"
                  >
                    {copiedAddr ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {/* Balances Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      <Coins className="h-3.5 w-3.5" /> RIDE Token
                    </div>
                    <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">
                      {wallet.rideBalance}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">15% Ride Fare Discount</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                    <p className="text-xs font-semibold text-muted-foreground">SDA Native Coin</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{wallet.sdaBalance}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sidra Chain Gas</p>
                  </div>
                </div>

                {/* Faucet Notification */}
                {faucetMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-600 animate-in fade-in">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>{faucetMsg}</span>
                  </div>
                )}

                {/* Action Buttons: Faucet & Staking */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClaimFaucet}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-cyan-600 py-3 text-xs font-bold text-white shadow-soft hover:opacity-95 transition-opacity"
                  >
                    <Sparkles className="h-4 w-4" /> Claim 250 Testnet RIDE + 2.5 SDA
                  </button>

                  <a
                    href={`${SIDRA_CHAIN_CONFIG.blockExplorerUrl}/address/${wallet.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary py-2.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    <span>View on Sidra Explorer</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>

                {/* Token Contract Reference */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>RIDE Contract:</span>
                    <button
                      onClick={copyTokenAddress}
                      className="font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      {SIDRA_CHAIN_CONFIG.rideTokenAddress.slice(0, 10)}...{" "}
                      {copiedToken ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {/* Disconnect Button */}
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Power className="h-3.5 w-3.5" /> Disconnect Wallet
                </button>
              </div>
            ) : (
              /* Connect Options */
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary hover:bg-accent transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-black">
                      🦊
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Browser Wallet (MetaMask / Rabby)</p>
                      <p className="text-xs text-muted-foreground">Connect via injected EIP-1193 provider</p>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-bold group-hover:translate-x-1 transition-transform">
                    Connect →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDemoConnect}
                  className="flex w-full items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-600 font-bold">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Instant Demo Wallet (Sidra Testnet)</p>
                      <p className="text-xs text-muted-foreground">Pre-loaded with 250 RIDE & 12.5 SDA</p>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-600 font-bold group-hover:translate-x-1 transition-transform">
                    Launch →
                  </span>
                </button>

                <p className="text-center text-[11px] text-muted-foreground pt-2">
                  Sidra Chain RPC: <code className="font-mono">https://rpc.sidrachain.com</code>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
