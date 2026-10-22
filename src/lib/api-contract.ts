// The shared contract is already in src/lib/domain.ts.
// Do not invent a second shape. Import from domain.ts.
//
// Server functions live in src/lib/ as createServerFn calls
// (see luma.ts and ai.ts). There is no Next-style /api folder.

export * from "./domain";
