import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { PageShell } from "@/components/site/Layout";
import { Card, DemoBanner, Field, Section, btn } from "@/components/site/ui";
import { appConfig, availablePaymentMethods } from "@/config/app";
import { bookingSchema, type BookingInput } from "@/lib/schemas";
import { bookingService } from "@/services";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Ride — RIDE TOKENS" },
      { name: "description", content: "Plan a ride with pickup, destination, ride category and payment preferences on RIDE TOKENS." },
      { property: "og:title", content: "Book a Ride — RIDE TOKENS" },
      { property: "og:description", content: "Plan your journey with RIDE TOKENS ride booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPage,
});

const steps = ["Request received", "Driver assigned", "Driver arriving", "Trip in progress", "Trip completed"];

function BookPage() {
  const [summary, setSummary] = useState<BookingInput | null>(null);
  const [msg, setMsg] = useState("");
  const payments = availablePaymentMethods();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema) as never,
    defaultValues: { category: "standard", passengers: 1, payment: "cash" },
  });

  const onSubmit = async (data: BookingInput) => {
    const res = await bookingService.requestRide(data);
    if (res.mode === "error") return setMsg(res.message);
    setSummary(res.data);
    setMsg(res.mode === "demo" ? res.message : "Ride requested.");
  };
  const err = (k: keyof BookingInput) => errors[k]?.message as string | undefined;
  const a = (k: keyof BookingInput) => ({ id: k, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <PageShell>
      <section className="bg-secondary py-14">
        <div className="container-page">
          <p className="eyebrow mb-3">Ride booking</p>
          <h1 className="text-4xl font-bold sm:text-5xl">Where are you heading?</h1>
          <div className="mt-6 max-w-2xl">
            <DemoBanner><strong>Demo mode.</strong> Live dispatch isn't connected yet. Submitting creates a summary only — no ride is requested, no driver is assigned, and no price or ETA is calculated.</DemoBanner>
          </div>
        </div>
      </section>
      <Section className="!pt-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <Field id="pickup" label="Pickup location" error={err("pickup")}><input className="field" placeholder="e.g. 12 Market Street" {...a("pickup")} {...register("pickup")} /></Field>
              <Field id="stop" label="Intermediate stop (optional)" error={err("stop")}><input className="field" {...a("stop")} {...register("stop")} /></Field>
              <Field id="destination" label="Destination" error={err("destination")}><input className="field" placeholder="e.g. Central Station" {...a("destination")} {...register("destination")} /></Field>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Ride category <span className="font-normal text-muted-foreground">(illustrative)</span></legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {appConfig.rideCategories.map((c) => (
                    <label key={c.id} className="cursor-pointer rounded-xl border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-accent">
                      <input type="radio" value={c.id} className="sr-only" {...register("category")} />
                      <span className="block font-semibold">{c.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{c.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="passengers" label="Passengers" error={err("passengers")}><input type="number" min={1} max={6} className="field" {...a("passengers")} {...register("passengers")} /></Field>
                <Field id="pickupTime" label="Pickup time" error={err("pickupTime")}><input type="datetime-local" className="field" {...a("pickupTime")} {...register("pickupTime")} /></Field>
                <Field id="fareOffer" label="Fare offer (optional)" hint="Fare negotiation is a demonstration only." error={err("fareOffer")}><input type="number" step="0.01" className="field" {...a("fareOffer")} {...register("fareOffer")} /></Field>
                <Field id="payment" label="Payment method" error={err("payment")}>
                  <select className="field" {...a("payment")} {...register("payment")}>
                    {payments.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field id="note" label="Note for driver (optional)" error={err("note")}><textarea rows={3} className="field" {...a("note")} {...register("note")} /></Field>
              <button type="submit" disabled={isSubmitting} className={cn(btn.primary, "w-full")}>Preview ride summary</button>
            </form>
          </Card>

          <div className="space-y-6">
            <Card aria-live="polite">
              <h2 className="text-xl font-bold">Ride summary</h2>
              {!summary ? (
                <p className="mt-3 text-muted-foreground">Fill in the form to see your summary here.</p>
              ) : (
                <>
                  <dl className="mt-4 space-y-3 text-sm">
                    {[
                      ["Pickup", summary.pickup],
                      ...(summary.stop ? [["Stop", summary.stop]] : []),
                      ["Destination", summary.destination],
                      ["Category", appConfig.rideCategories.find((c) => c.id === summary.category)?.label],
                      ["Passengers", String(summary.passengers)],
                      ["Pickup time", new Date(summary.pickupTime).toLocaleString()],
                      ["Payment", payments.find((p) => p.id === summary.payment)?.label],
                      ...(summary.fareOffer ? [["Your fare offer", String(summary.fareOffer)]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-border pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                    ))}
                  </dl>
                  <p className="mt-4 rounded-lg bg-warning/10 p-3 text-sm font-medium">{msg}</p>
                </>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Trip progress</h2><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">Demonstration</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Illustrates the stages of a trip. No live GPS or status updates.</p>
              <ol className="mt-5 space-y-4">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full border text-xs font-bold", i === 0 && summary ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{i + 1}</span>
                    <span className={cn(i === 0 && summary ? "font-semibold" : "text-muted-foreground")}>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </Section>
    </PageShell>
  );
}
