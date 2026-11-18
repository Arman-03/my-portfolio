/**
 * Tile index helpers. Three 12-column, 16px tilesheets are loaded into one
 * Phaser tilemap with consecutive global ids (gids):
 *   town    (Kenney Tiny Town)    → gid 1..132
 *   dungeon (Kenney Tiny Dungeon) → gid 133..264
 *   custom  (tools/make_custom_tiles.py) → gid 265..
 * Local indices below match the labelled sheets (row * 12 + col).
 */
export const TILE = 16;
export const SHEET_COLS = 12;
export const TOWN_GID = 1;
export const DUNGEON_GID = 133;
export const CUSTOM_GID = 265;

export const T = (i: number) => TOWN_GID + i;
export const D = (i: number) => DUNGEON_GID + i;
export const C = (i: number) => CUSTOM_GID + i;

export const TOWN = {
  grass: 0,
  grassTufts: 1,
  grassFlowers: 2,
  stonePath: 43,
  // 9-slice dirt patch: TL, T, TR, L, C, R, BL, B, BR
  dirt: [12, 13, 14, 24, 25, 26, 36, 37, 38],
  // inner corners: grass nub at TL, TR, BL, BR
  dirtInner: [39, 40, 41, 42],
  // single-tile trees
  treeGreen: 28,
  treeAutumn: 27,
  // two-tile trees: crown (drawn above characters) over trunk
  tallGreen: { top: 4, bottom: 16 },
  tallAutumn: { top: 3, bottom: 15 },
  bushRound: 5,
  sprout: 17,
  mushrooms: 29,
  // forest autotile pieces
  forest: { fill: 19, top: 7, topLeft: 6, topRight: 8, left: 18, right: 20, bottom: 31, bottomLeft: 30, bottomRight: 32 },
  forestAutumn: { fill: 22, top: 10, topLeft: 9, topRight: 11, left: 21, right: 23, bottom: 34, bottomLeft: 33, bottomRight: 35 },
  fence: { left: 44, mid: 45, right: 46, postTop: 47, postMid: 59, postBottom: 71, bottomLeft: 80, bottomMid: 81, bottomRight: 82 },
  sign: 83,
  well: 104,
  cart: 57,
  beehive: 94,
  target: 95,
  barrel: 107,
  coin: 93,
} as const;

export const DUNGEON = {
  void: 0,
  floor: 48,
  floorAlt: 49,
  floorRubble: 42,
  wall: {
    topLeft: 1,
    top: 2,
    topPillar: 6,
    topRight: 3,
    left: 13,
    right: 15,
    face: 40,
    pillar: 18,
    banner: 29,
    shadow: 50,
    shadowAlt: 51,
    pillarBase: 30,
    bottomLeft: 25,
    bottom: 26,
    bottomRight: 27,
    door: 45,
  },
  chest: 89,
  chestOpen: 91,
  barrel: 82,
  tombstone: 65,
  // characters
  wizard: 84,
  adventurer: 85,
  bald: 86,
  viking: 87,
  ranger: 88,
  knight: 96,
  knightVisor: 97,
  villager: 98,
  princess: 99,
  elder: 100,
  slime: 108,
  cyclops: 109,
  crab: 110,
  hoodie: 111,
  headband: 112,
  bat: 120,
  ghost: 121,
  spider: 122,
} as const;

export const CUSTOM = {
  waterA: 0, // 0..8 9-slice, 9..12 inner corners
  waterB: 13, // 13..21 9-slice, 22..25 inner corners
  lily: 26,
  lilyFlower: 27,
  dock: 28,
  terminal: 29,
  flagA: 30,
  flagB: 31,
} as const;
