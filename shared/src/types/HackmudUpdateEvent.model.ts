import { t, type Static } from "elysia";


// Shell State
export const HackmudShellStateT = t.Object({
    head: t.Number(),
    tail: t.Number(),
    size: t.Number(),
    version: t.Number(),
    text: t.Array(t.Union([t.String(), t.Null()])),
    normalizedText: t.Array(t.String()),
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
    pid: t.Number(),
    gameState: HackmudGameStateT,
});

export const ShellUpdateT = t.Object({
    type: t.Literal("ShellUpdate"),
    pid: t.Number(),
    shellState: HackmudShellStateT,
});

export const FullClientListUpdateT = t.Object({
    type: t.Literal("FullClientListUpdate"),
    clients: t.Array(t.Object({
        pid: t.Number(),
        shellState: HackmudShellStateT,
        gameState: HackmudGameStateT,
    }))
});


export const HackmudUpdateEventT = t.Union([GameStateUpdateT, ShellUpdateT, FullClientListUpdateT]);

// t exports (optional, for when you need the TypeScript types)
export type HackmudShellState = Static<typeof HackmudShellStateT>;
export type HackmudGameState = Static<typeof HackmudGameStateT>;
export type GameStateUpdate = Static<typeof GameStateUpdateT>;
export type ShellUpdate = Static<typeof ShellUpdateT>;
export type FullClientListUpdate = Static<typeof FullClientListUpdateT>;
export type HackmudUpdateEvent = Static<typeof HackmudUpdateEventT>;



