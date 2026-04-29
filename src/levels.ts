export type BlockData = {
  id: number;
  x: number;
  y: number;
  size: number;
  dir: 'H' | 'V';
  type: 'target' | 'obstacle' | 'color';
};

export type LevelData = {
  level: number;
  blocks: BlockData[];
};

export const LEVELS: LevelData[] = [
  {
    level: 1,
    blocks: [
      { id: 1, x: 0, y: 2, size: 2, dir: "H", type: "target" },
      { id: 2, x: 2, y: 1, size: 3, dir: "V", type: "obstacle" },
      { id: 3, x: 0, y: 3, size: 2, dir: "V", type: "obstacle" },
      { id: 4, x: 1, y: 4, size: 2, dir: "H", type: "obstacle" },
      { id: 5, x: 3, y: 1, size: 2, dir: "H", type: "obstacle" },
      { id: 6, x: 4, y: 3, size: 2, dir: "V", type: "obstacle" },
      { id: 7, x: 0, y: 5, size: 3, dir: "H", type: "obstacle" }
    ]
  },
  {
    level: 2,
    blocks: [
      { id: 1, x: 0, y: 2, size: 2, dir: "H", type: "target" },
      { id: 2, x: 4, y: 0, size: 3, dir: "V", type: "obstacle" },
      { id: 3, x: 2, y: 2, size: 2, dir: "V", type: "obstacle" },
      { id: 4, x: 2, y: 4, size: 2, dir: "H", type: "obstacle" },
      { id: 5, x: 4, y: 3, size: 2, dir: "H", type: "obstacle" },
      { id: 6, x: 0, y: 0, size: 2, dir: "H", type: "obstacle" },
      { id: 7, x: 0, y: 3, size: 2, dir: "V", type: "obstacle" }
    ]
  }
];
