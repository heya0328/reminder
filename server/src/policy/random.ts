import crypto from "node:crypto";

export function seededRandomInt(seed: string, minInclusive: number, maxExclusive: number) {
  if (maxExclusive <= minInclusive) {
    throw new Error("maxExclusive must be greater than minInclusive");
  }
  const hash = crypto.createHash("sha256").update(seed).digest();
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return Math.floor(value * (maxExclusive - minInclusive)) + minInclusive;
}
