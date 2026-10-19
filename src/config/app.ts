/**
 * Central app + DApp configuration.
 * Unknown network details are intentionally null. Do not fill them in until verified.
 */
export const appConfig = {
  appName: "RIDE TOKENS",
  slogan: "Every Ride Connects Us.",
  mission:
    "To make transportation more accessible, transparent, and rewarding by combining ride-hailing technology with a practical digital-token ecosystem.",
  contact: {
    email: null as string | null,
    phone: null as string | null,
    address: null as string | null,
  },
  dapp: {
    contractAddress: "0xe91cAC00C1092611EB598B284a87A623a35aF9b7",
    /** Network shown on owner branding material; NOT independently verified. */
    ownerIndicatedNetwork: "Sidra Chain",
    networkName: null as string | null,
    chainId: null as number | null,
    rpcUrl: null as string | null,
    explorerUrl: null as string | null,
    abiSource: null as string | null,
    walletIntegrationEnabled: false,
    tokenPaymentEnabled: false,
  },
  demoMode: true,
  bookingApiUrl: null as string | null,
  driverApiUrl: null as string | null,
  rideCategories: [
    { id: "standard", label: "Standard", description: "Everyday rides for up to 4 passengers." },
    { id: "comfort", label: "Comfort", description: "Newer vehicles with extra legroom." },
    { id: "xl", label: "XL", description: "Larger vehicles for groups up to 6." },
  ],
  paymentMethods: [
    { id: "cash", label: "Cash" },
    { id: "electronic", label: "Electronic payment" },
    { id: "ride_token", label: "RIDE Token" },
  ],
} as const;

export type FeatureStatus = "Live" | "Planned" | "Under Development" | "Unavailable";

export function availablePaymentMethods() {
  return appConfig.paymentMethods.filter(
    (m) => m.id !== "ride_token" || appConfig.dapp.tokenPaymentEnabled,
  );
}

export function contractStatus() {
  const d = appConfig.dapp;
  return {
    addressConfigured: /^0x[a-fA-F0-9]{40}$/.test(d.contractAddress),
    networkVerified: d.chainId !== null && d.rpcUrl !== null,
    contractCodeVerified: false,
    abiConfigured: d.abiSource !== null,
    walletConnected: false,
    contractInteractionEnabled: false,
  };
}
