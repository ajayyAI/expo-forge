/**
 * Expo Push fan-out.
 *
 * Sends a notification to every active device of a user via the Expo Push
 * Service and reconciles the response: devices that return a permanent error
 * are tombstoned (`pushTokens.markRevoked`) so future sends skip them.
 *
 * Best-effort by design — a push failure must never surface as an error to the
 * caller. Network/HTTP failures are logged and reported as zero sends.
 */

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Permanent Expo Push error codes: the token will never deliver again, so the
// device should be revoked. Everything else (e.g. `MessageRateExceeded`,
// `MessageTooBig`) is transient and only logged.
const PERMANENT_ERROR_CODES = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
  "MismatchSenderId",
]);

interface ExpoMessage {
  to: string;
  priority: "high";
  data?: Record<string, unknown>;
  _contentAvailable?: boolean;
  title?: string;
  body?: string;
  sound?: "default";
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Walk the aligned tickets, counting successes and grouping the tokens whose
// permanent errors warrant revocation by error code. Transient errors are
// logged and otherwise ignored. Callers must ensure tickets[i] ↔ tokenIds[i].
function reconcileTickets(
  tickets: ExpoTicket[],
  tokenIds: Id<"pushTokens">[]
): { sent: number; revokeByCode: Map<string, Id<"pushTokens">[]> } {
  const revokeByCode = new Map<string, Id<"pushTokens">[]>();
  let sent = 0;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === "ok") {
      sent++;
      continue;
    }
    const code = ticket.details?.error;
    if (code && PERMANENT_ERROR_CODES.has(code)) {
      const list = revokeByCode.get(code) ?? [];
      list.push(tokenIds[i]);
      revokeByCode.set(code, list);
    } else {
      console.warn(
        `Expo push ticket error (transient): ${code ?? "unknown"} — ${ticket.message ?? ""}`
      );
    }
  }
  return { sent, revokeByCode };
}

export const sendToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    // v.record(string, any) is the idiomatic validator for an arbitrary push
    // data payload; handled as Record<string, unknown> below.
    data: v.optional(v.record(v.string(), v.any())),
    silent: v.optional(v.boolean()),
  },
  returns: v.object({ sent: v.number(), revoked: v.number() }),
  handler: async (ctx, args) => {
    const tokens = await ctx.runQuery(internal.pushTokens.listActiveByUser, {
      userId: args.userId,
    });
    if (tokens.length === 0) {
      return { sent: 0, revoked: 0 };
    }

    const data = args.data as Record<string, unknown> | undefined;
    const messages: ExpoMessage[] = tokens.map(({ token }) =>
      args.silent
        ? { to: token, priority: "high", _contentAvailable: true, data }
        : {
            to: token,
            priority: "high",
            title: args.title,
            body: args.body,
            data,
            sound: "default",
          }
    );

    let tickets: ExpoTicket[];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        console.warn(`Expo push send failed: HTTP ${res.status}`);
        return { sent: 0, revoked: 0 };
      }
      const json = (await res.json()) as { data?: ExpoTicket[] };
      tickets = json.data ?? [];
    } catch (error) {
      console.warn("Expo push send error:", error);
      return { sent: 0, revoked: 0 };
    }

    // Ticket↔token reconciliation relies on positional alignment
    // (tickets[i] ↔ messages[i] ↔ tokens[i]). A partial/malformed response
    // where the counts differ would mis-align that mapping, so treat it
    // conservatively: count successes but skip revocation rather than risk
    // tombstoning the wrong token.
    if (tickets.length !== messages.length) {
      console.warn(
        `Expo push response length mismatch: ${tickets.length} tickets for ${messages.length} messages; skipping revocation`
      );
      const okCount = tickets.filter((t) => t.status === "ok").length;
      return { sent: okCount, revoked: 0 };
    }

    // Expo preserves order: tickets[i] ↔ messages[i] ↔ tokens[i].
    const { sent, revokeByCode } = reconcileTickets(
      tickets,
      tokens.map((token) => token._id)
    );

    let revoked = 0;
    for (const [errorCode, tokenIds] of revokeByCode) {
      revoked += await ctx.runMutation(internal.pushTokens.markRevoked, {
        tokenIds,
        errorCode,
      });
    }

    return { sent, revoked };
  },
});
