"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { enforceAttestation } from "./appAttest";

/**
 * Account deletion, behind optional App Attest enforcement. The public entry
 * is an action (App Attest verification needs the Node crypto runtime); it
 * verifies the device assertion when enforcement is on, then runs the actual
 * tombstone mutation. Attestation args are optional so the default
 * (enforcement-off) path works on every platform.
 */
export const deleteAccount = action({
  args: {
    keyId: v.optional(v.string()),
    assertion: v.optional(v.string()),
    challenge: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), deletedAt: v.number() }),
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; deletedAt: number }> => {
    await enforceAttestation(ctx, { ...args, operation: "deleteAccount" });
    return await ctx.runMutation(internal.users.performAccountDeletion, {});
  },
});
