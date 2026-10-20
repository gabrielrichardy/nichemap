import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleAsaasEvent, isAuthorizedWebhook } from "@/lib/billing-sync";
import { logger } from "@/lib/logger";

// Only the ids are read from the payload; billing-sync re-reads the payment from Asaas.
const eventSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  payment: z.object({ id: z.string().min(1) }).optional(),
  subscription: z.object({ id: z.string().min(1) }).optional(),
});

// Asaas webhook (configured in the Asaas panel). No login: the asaas-access-token header
// authenticates the call. A 5xx makes Asaas resend the event.
export async function POST(req: NextRequest) {
  if (!isAuthorizedWebhook(req.headers.get("asaas-access-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  const event = parsed.data;
  try {
    const outcome = await handleAsaasEvent(event);
    logger.info({ eventId: event.id, type: event.event, outcome }, "Asaas event");
    return NextResponse.json({ received: true });
  } catch (err) {
    // AsaasError messages carry only method, path and status, never the response body.
    logger.error({ eventId: event.id, type: event.event, error: (err as Error).message }, "Asaas event failed");
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
