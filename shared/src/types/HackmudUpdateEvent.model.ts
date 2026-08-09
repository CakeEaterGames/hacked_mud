import { t, type Static } from "elysia";

export const HackmudShellStateT = t.Object({
    head: t.Number(),
    tail: t.Number(),
    size: t.Number(),
    version: t.Number(),
    text: t.Array(t.Union([t.String(), t.Null()])),
    normalizedText: t.Array(t.String()),
});

export const HackmudGameStateT = t.Object({
    hardlineState: t.Number(),
    hardlineStateStr: t.String(),
    gameState: t.Number(),
    instructionsText: t.String(),
    timerCurrent: t.Number(),
    isProcessing: t.Boolean(),
});

export const HackmudStatsT = t.Record(t.String(), t.Unknown())

export const GameStateUpdateT = t.Object({
    type: t.Literal("GameStateUpdate"),
    pid: t.Number(),
    gameState: HackmudGameStateT,
});

export const StatsUpdateT = t.Object({
    type: t.Literal("StatsUpdate"),
    pid: t.Number(),
    gameStats: HackmudStatsT
});

export const ShellUpdateT = t.Object({
    type: t.Literal("ShellUpdate"),
    pid: t.Number(),
    shellState: HackmudShellStateT,
});

export const FullClientT = t.Object({
    pid: t.Number(),
    shellState: HackmudShellStateT,
    gameState: HackmudGameStateT,
    gameStats: HackmudStatsT,
})

export const FullClientListUpdateT = t.Object({
    type: t.Literal("FullClientListUpdate"),
    clients: t.Array(FullClientT)
});


export const HackmudUpdateEventT = t.Union([GameStateUpdateT, StatsUpdateT, ShellUpdateT, FullClientListUpdateT]);

export type HackmudShellState = Static<typeof HackmudShellStateT>;
export type HackmudGameState = Static<typeof HackmudGameStateT>;
export type HackmudStats = Static<typeof HackmudStatsT>;
export type GameStateUpdate = Static<typeof GameStateUpdateT>;
export type StatsUpdate = Static<typeof StatsUpdateT>;
export type ShellUpdate = Static<typeof ShellUpdateT>;
export type FullClient = Static<typeof FullClientT>;
export type FullClientListUpdate = Static<typeof FullClientListUpdateT>;
export type HackmudUpdateEvent = Static<typeof HackmudUpdateEventT>;



