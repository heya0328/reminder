import type { Channel } from "../reminders/types.ts";

export function chooseChannel(input: { pushEligible: boolean; smsEligible: boolean }): { channel: Channel | null; reason: string } {
  if (input.pushEligible) {
    return { channel: "push", reason: "push_eligible" };
  }
  if (input.smsEligible) {
    return { channel: "sms", reason: "push_unavailable_sms_eligible" };
  }
  return { channel: null, reason: "no_eligible_channel" };
}
