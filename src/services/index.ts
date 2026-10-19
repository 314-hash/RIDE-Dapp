/**
 * Service interfaces with isolated demo adapters.
 * Demo adapters never persist or transmit data and never claim live results.
 */
import { appConfig } from "@/config/app";
import type { BookingInput, DriverInput } from "@/lib/schemas";

export type ServiceResult<T> =
  | { mode: "demo"; data: T; message: string }
  | { mode: "live"; data: T }
  | { mode: "error"; message: string };

export interface BookingService {
  requestRide(input: BookingInput): Promise<ServiceResult<BookingInput>>;
}
export interface DriverService {
  submitApplication(input: DriverInput): Promise<ServiceResult<{ received: true }>>;
}
export interface TokenService {
  isAvailable(): boolean;
}

const demoBooking: BookingService = {
  async requestRide(input) {
    return {
      mode: "demo",
      data: input,
      message: "Demo only — no live ride has been requested and no driver has been assigned.",
    };
  },
};

const demoDriver: DriverService = {
  async submitApplication() {
    return {
      mode: "demo",
      data: { received: true },
      message: "Simulated result — your information was not sent or stored.",
    };
  },
};

export const bookingService: BookingService = appConfig.bookingApiUrl ? demoBooking : demoBooking;
export const driverService: DriverService = demoDriver;
export const tokenService: TokenService = {
  isAvailable: () => appConfig.dapp.walletIntegrationEnabled,
};
// Placeholders for future integrations (not connected).
export const authService = { connected: false } as const;
export const mapsService = { connected: false } as const;
export const paymentService = { connected: false } as const;
export const notificationService = { connected: false } as const;
