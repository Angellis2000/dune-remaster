/** Per-player multiplayer limits; campaign pools remain as in the ROM. */
export const NETWORK_MAX_PLAYERS = 8;
export const NETWORK_UNIT_LIMIT = 204;
export const NETWORK_STRUCTURE_LIMIT = 158;
// Linked lists use 255 as the sentinel; that one slot stays reserved.
export const NETWORK_ARMY_POOL_END = NETWORK_MAX_PLAYERS * NETWORK_UNIT_LIMIT + 1;
export const NETWORK_UNIT_POOL_SIZE = NETWORK_ARMY_POOL_END + 512;
export const NETWORK_STRUCTURE_POOL_SIZE = NETWORK_MAX_PLAYERS * NETWORK_STRUCTURE_LIMIT + 1;
