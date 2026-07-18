export function bigIntReplacer(key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString() + "n"; // or just value.toString()
  }
  return value;
}
