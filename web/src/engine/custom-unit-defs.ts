/** Extension IDs never replace ROM unit types or read past the original ROM tables. */
export const ORIGINAL_UNIT_COUNT=27;
export const LASER_TANK=27;
export const COMBAT_DRONE=28;
export const DRONE_PAD=19;
export const DRONE_RADIUS=9*256;
export const DRONE_RETURN_BATTERY=20;
export const customScriptType=(type:number):number=>type===LASER_TANK?9:type===COMBAT_DRONE?1:type;
export const customHudFrame=(type:number):number=>0x100+type;
export const customStructureHudFrame=(type:number):number=>0x200+type;
