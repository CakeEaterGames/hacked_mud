import { t, type Static } from "elysia";

export const getShellContentsRequestT = t.Object({
  pid: t.Number(),
});
export type getShellContentsRequest = typeof getShellContentsRequestT.static;

export const getShellContentsResponseT = t.Object({
  data: t.Array(t.String()),
});
export type getShellContentsResponse = typeof getShellContentsResponseT.static;

// Shell State
export const HackmudShellStateT = t.Object({
  head: t.Number(),
  tail: t.Number(),
  size: t.Number(),
  version: t.Number(),
  text: t.Array(t.String()),
});

// Game State
export const HackmudGameStateT = t.Object({
  hardlineState: t.Number(),
  hardlineStateStr: t.String(),
  gameState: t.Number(),
  instructionsText: t.String(),
  timerCurrent: t.Number(),
  isProcessing: t.Boolean(),
});

// Update Events
export const GameStateUpdateT = t.Object({
  type: t.Literal("GameStateUpdate"),
  gameState: HackmudGameStateT,
});

export const ShellUpdateT = t.Object({
  type: t.Literal("ShellUpdate"),
  shellState: HackmudShellStateT,
});

export const HackmudUpdateEventT = t.Union([GameStateUpdateT, ShellUpdateT]);

// t exports (optional, for when you need the TypeScript types)
export type HackmudShellState = Static<typeof HackmudShellStateT>;
export type HackmudGameState = Static<typeof HackmudGameStateT>;
export type GameStateUpdate = Static<typeof GameStateUpdateT>;
export type ShellUpdate = Static<typeof ShellUpdateT>;
export type HackmudUpdateEvent = Static<typeof HackmudUpdateEventT>;
