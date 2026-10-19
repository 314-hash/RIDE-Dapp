import { describe, expect, it } from "vitest";
import { bookingSchema, driverSchema } from "@/lib/schemas";
import { availablePaymentMethods, contractStatus, appConfig } from "@/config/app";

const booking = { pickup: "Market St", destination: "Central Station", category: "standard", passengers: 2, pickupTime: "2026-10-20T10:00", payment: "cash" };

describe("rules", () => {
  it("accepts a valid booking", () => expect(bookingSchema.safeParse(booking).success).toBe(true));
  it("rejects same pickup and destination", () => expect(bookingSchema.safeParse({ ...booking, destination: "market st" }).success).toBe(false));
  it("rejects more than 6 passengers", () => expect(bookingSchema.safeParse({ ...booking, passengers: 7 }).success).toBe(false));
  it("driver form requires consent", () =>
    expect(driverSchema.safeParse({ fullName: "Ana Cruz", email: "a@b.co", phone: "+63 912 345 6789", city: "Manila", vehicleType: "Sedan", vehicleModel: "Vios", consent: false }).success).toBe(false));
  it("keeps the owner-supplied contract address", () => expect(appConfig.dapp.contractAddress).toBe("0xe91cAC00C1092611EB598B284a87A623a35aF9b7"));
  it("hides RIDE Token payment while token payments are disabled", () => expect(availablePaymentMethods().some((m) => m.id === "ride_token")).toBe(false));
  it("never reports the network as verified without chain config", () => expect(contractStatus().networkVerified).toBe(false));
});
