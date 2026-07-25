export const keyNames = ["Return", "Escape"] as const;

export type KeyName = (typeof keyNames)[number];
