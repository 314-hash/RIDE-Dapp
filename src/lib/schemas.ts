import { z } from "zod";

const place = (label: string) =>
  z.string().trim().min(3, `${label} must be at least 3 characters`).max(200, `${label} is too long`);

export const bookingSchema = z
  .object({
    pickup: place("Pickup location"),
    destination: place("Destination"),
    stop: z.string().trim().max(200, "Stop is too long").optional().or(z.literal("")),
    category: z.string().min(1, "Choose a ride category"),
    passengers: z.coerce.number().int().min(1, "At least 1 passenger").max(6, "Maximum 6 passengers"),
    pickupTime: z.string().min(1, "Choose a pickup time"),
    fareOffer: z
      .union([z.literal(""), z.coerce.number().positive("Fare offer must be above 0").max(100000, "Fare offer is too high")])
      .optional(),
    payment: z.string().min(1, "Choose a payment method"),
    note: z.string().trim().max(300, "Note must be under 300 characters").optional().or(z.literal("")),
  })
  .refine((d) => d.pickup.toLowerCase() !== d.destination.toLowerCase(), {
    message: "Destination must differ from pickup",
    path: ["destination"],
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export const driverSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Enter a valid phone number"),
  city: z.string().trim().min(2, "Enter your operating city").max(100),
  vehicleType: z.string().min(1, "Choose a vehicle type"),
  vehicleModel: z.string().trim().min(2, "Enter your vehicle model").max(100),
  message: z.string().trim().max(500, "Message must be under 500 characters").optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "You must agree before submitting" }) }),
});

export type DriverInput = z.infer<typeof driverSchema>;
