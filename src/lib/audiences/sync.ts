import { createHash } from "node:crypto";
import type { Retailer } from "./data";

// Builds the payload each destination expects. Consent is enforced here, in code, for every sync,
// regardless of how the audience was defined. Nothing is sent: this is a dry run.

export const SYNC_DESTINATIONS = {
  braze: { label: "Braze (lifecycle)", consent: "email_opt_in", batchSize: 75 },
  meta: { label: "Meta Custom Audience", consent: "ads_consent", batchSize: 10000 },
  google: { label: "Google Customer Match", consent: "ads_consent", batchSize: 10000 },
} as const;
export type SyncDestination = keyof typeof SYNC_DESTINATIONS;

const sha256 = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

export function buildSync(destination: SyncDestination, audienceName: string, rows: Retailer[]) {
  const def = SYNC_DESTINATIONS[destination];
  const eligible = rows.filter((r) => r[def.consent]);
  const audienceKey = audienceName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  let preview: unknown;
  if (destination === "braze") {
    preview = {
      endpoint: "POST /users/track",
      attributes: eligible.slice(0, 2).map((r) => ({
        external_id: r.id,
        [`audience_${audienceKey}`]: true,
        audience_synced_at: "<timestamp>",
      })),
    };
  } else if (destination === "meta") {
    preview = {
      endpoint: "POST /{audience_id}/users",
      payload: { schema: ["EMAIL", "COUNTRY"], data: eligible.slice(0, 2).map((r) => [sha256(r.email), sha256(r.country)]) },
    };
  } else {
    preview = {
      endpoint: "OfflineUserDataJobService.AddOfflineUserDataJobOperations",
      operations: eligible.slice(0, 2).map((r) => ({ create: { userIdentifiers: [{ hashedEmail: sha256(r.email) }] } })),
    };
  }

  return {
    destination,
    label: def.label,
    consentField: def.consent,
    matched: rows.length,
    eligible: eligible.length,
    excludedForConsent: rows.length - eligible.length,
    batches: Math.ceil(eligible.length / def.batchSize),
    preview,
  };
}
export type SyncPlan = ReturnType<typeof buildSync>;
