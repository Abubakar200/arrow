import {
  shCircle,
  shPoly,
  shStarPts,
  shSub,
  shUnion,
  shRect,
  shEllipse,
  SHAPE_N,
  shGrid,
} from "./shape-geometry.js";

export const BASE_SHAPE_DEFS = [
  {
    name: "Sun",
    icon: "./assets/svg/sun.svg",
    color: "#f2a30f",
    build: () => {
      let grid = shCircle(7, 7, 4);
      const rays = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x1 = 7 + Math.cos(angle) * 4.3;
        const y1 = 7 + Math.sin(angle) * 4.3;
        const x2 = 7 + Math.cos(angle) * 6.4;
        const y2 = 7 + Math.sin(angle) * 6.4;
        const px = -Math.sin(angle) * 0.55;
        const py = Math.cos(angle) * 0.55;
        rays.push(
          shPoly([
            [x1 + px, y1 + py],
            [x2 + px, y2 + py],
            [x2 - px, y2 - py],
            [x1 - px, y1 - py],
          ]),
        );
      }
      return shUnion(grid, ...rays);
    },
  },
  {
    name: "Moon",
    icon: "./assets/svg/moon.svg",
    color: "#6b7fd7",
    build: () => shSub(shCircle(6, 7, 5.3), shCircle(9.2, 5.8, 4.8)),
  },
  {
    name: "Star",
    icon: "./assets/svg/star.svg",
    color: "#e5a51a",
    build: () => shPoly(shStarPts(7, 7.3, 6.3, 3, 5)),
  },
  {
    name: "Heart",
    icon: "./assets/svg/heart.svg",
    color: "#d1495b",
    build: () =>
      shUnion(
        shCircle(4.8, 5.3, 3.1),
        shCircle(9.2, 5.3, 3.1),
        shPoly([
          [1.9, 6.1],
          [12.1, 6.1],
          [7, 13.2],
        ]),
      ),
  },
  {
    name: "Diamond",
    icon: "./assets/svg/diamond.svg",
    color: "#4fc1e9",
    build: () =>
      shPoly([
        [7, 1],
        [12.5, 6],
        [7, 13],
        [1.5, 6],
      ]),
  },
  {
    name: "Raindrop",
    icon: "./assets/svg/raindrop.svg",
    color: "#2b7fe0",
    build: () =>
      shUnion(
        shCircle(7, 9, 4),
        shPoly([
          [7, 1],
          [3.2, 7.4],
          [10.8, 7.4],
        ]),
      ),
  },
  {
    name: "Donut",
    icon: "./assets/svg/donut.svg",
    color: "#c9708b",
    build: () => shSub(shCircle(7, 7, 6.2), shCircle(7, 7, 3)),
  },
  {
    name: "Cloud",
    icon: "./assets/svg/cloud.svg",
    color: "#8fa6c9",
    build: () =>
      shUnion(
        shCircle(4.5, 8.3, 2.7),
        shCircle(7.3, 6.1, 3.4),
        shCircle(10.3, 7.6, 2.9),
        shCircle(12, 9, 2.1),
        shRect(3, 8.3, 12.5, 10.6),
      ),
  },
  {
    name: "Umbrella",
    icon: "./assets/svg/umbrella.svg",
    color: "#c2334d",
    build: () =>
      shUnion(
        shSub(shEllipse(7, 6, 6.2, 5, 0), shRect(0, 7, 15, 15)),
        shRect(6.4, 6, 7.6, 13.5),
      ),
  },
  {
    name: "Balloon",
    icon: "./assets/svg/balloon.svg",
    color: "#e0607e",
    build: () =>
      shUnion(
        shEllipse(7, 5.2, 4, 5.1, 0),
        shPoly([
          [6.1, 9.9],
          [7.9, 9.9],
          [7, 11.4],
        ]),
      ),
  },
  {
    name: "Flower",
    icon: "./assets/svg/flower.svg",
    color: "#e5779a",
    build: () => {
      let g = shCircle(7, 7, 2.1);
      for (let a = 0; a < 5; a++) {
        const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5;
        g = shUnion(
          g,
          shCircle(7 + Math.cos(ang) * 3.5, 7 + Math.sin(ang) * 3.5, 2.5),
        );
      }
      return g;
    },
  },
  {
    name: "Leaf",
    icon: "./assets/svg/leaf.svg",
    color: "#2a9d8f",
    build: () => shEllipse(7, 7, 2.9, 6.2, 0.7),
  },
  {
    name: "Mushroom",
    icon: "./assets/svg/mushroom.svg",
    color: "#c0392b",
    build: () =>
      shUnion(
        shSub(shEllipse(7, 5, 5.2, 3.4, 0), shRect(0, 5, 15, 15)),
        shRect(5.7, 5, 8.3, 12.5),
      ),
  },
  {
    name: "Cactus",
    icon: "./assets/svg/cactus.svg",
    color: "#2f9e44",
    build: () =>
      shUnion(
        shRect(5.5, 3, 8.5, 13),
        shRect(2.3, 6, 5.5, 8),
        shRect(2.3, 3, 3.5, 6.2),
        shRect(8.5, 8.6, 11.7, 10.6),
        shRect(10.5, 5.5, 11.7, 8.6),
      ),
  },
  {
    name: "Pineapple",
    icon: "./assets/svg/pineapple.svg",
    color: "#e0b400",
    build: () =>
      shUnion(
        shEllipse(7, 8.5, 4.3, 4.8, 0),
        shPoly([
          [4.3, 4],
          [7, 0.5],
          [6.4, 4],
        ]),
        shPoly([
          [7, 4],
          [9.7, 0.5],
          [7.6, 4],
        ]),
        shPoly([
          [5.6, 4],
          [7, 1],
          [8.4, 4],
        ]),
      ),
  },
  {
    name: "Lemon",
    icon: "./assets/svg/lemon.svg",
    color: "#e8d000",
    build: () => {
      const A = shCircle(4.6, 7, 5),
        B = shCircle(9.4, 7, 5),
        g = shGrid();
      for (let y = 0; y < SHAPE_N; y++)
        for (let x = 0; x < SHAPE_N; x++)
          if (A[y][x] && B[y][x]) g[y][x] = true;
      return g;
    },
  },
  {
    name: "Grapes",
    icon: "./assets/svg/grapes.svg",
    color: "#7d4fae",
    build: () => {
      let g = shGrid();
      [
        [5.5, 3],
        [7, 3],
        [8.5, 3],
        [4.7, 5.2],
        [6.2, 5.2],
        [7.8, 5.2],
        [9.3, 5.2],
        [5.5, 7.4],
        [7, 7.4],
        [8.5, 7.4],
        [6.2, 9.6],
        [7.8, 9.6],
        [7, 11.6],
      ].forEach(([x, y]) => (g = shUnion(g, shCircle(x, y, 1.5))));
      return g;
    },
  },
  {
    name: "Cherries",
    icon: "./assets/svg/cherries.svg",
    color: "#c2334d",
    build: () =>
      shUnion(
        shCircle(5, 10, 2.7),
        shCircle(9.3, 9.3, 2.7),
        shRect(6.5, 1, 7.3, 9),
        shRect(8.5, 1, 9.3, 7.5),
      ),
  },
  {
    name: "Key",
    icon: "./assets/svg/key.svg",
    color: "#b8860b",
    build: () =>
      shUnion(
        shSub(shCircle(4, 7, 3.2), shCircle(4, 7, 1.4)),
        shRect(6.5, 6.3, 13, 7.7),
        shRect(10.5, 7.7, 12, 9.6),
        shRect(12, 7.7, 13.2, 9),
      ),
  },
  {
    name: "Bell",
    icon: "./assets/svg/bell.svg",
    color: "#d4a017",
    build: () =>
      shUnion(
        shSub(shEllipse(7, 6, 4.5, 4, 0), shRect(0, 6, 15, 15)),
        shPoly([
          [3, 6],
          [11, 6],
          [12.6, 11],
          [1.4, 11],
        ]),
        shRect(2, 11, 12, 12.3),
        shCircle(7, 1.6, 1.1),
      ),
  },
  {
    name: "Crown",
    icon: "./assets/svg/crown.svg",
    color: "#e5a51a",
    build: () =>
      shUnion(
        shPoly([
          [2, 9],
          [4, 3],
          [6, 7.5],
          [7.5, 2],
          [9, 7.5],
          [11, 3],
          [13, 9],
        ]),
        shRect(2, 9, 13, 12.5),
      ),
  },
  {
    name: "Lightning",
    icon: "./assets/svg/lightning.svg",
    color: "#f0c419",
    build: () =>
      shPoly([
        [8.3, 0.5],
        [3, 7.5],
        [6.3, 7.5],
        [2.2, 14.5],
        [11.5, 5.5],
        [7.7, 5.5],
        [11.5, 0.5],
      ]),
  },
  {
    name: "House",
    icon: "./assets/svg/house.svg",
    color: "#b5651d",
    build: () =>
      shUnion(
        shRect(3, 6.3, 11, 13),
        shPoly([
          [1.2, 6.3],
          [7, 1],
          [12.8, 6.3],
        ]),
      ),
  },
  {
    name: "Tree",
    icon: "./assets/svg/tree.svg",
    color: "#2f7d3c",
    build: () =>
      shUnion(
        shPoly([
          [7, 1],
          [2, 7.3],
          [12, 7.3],
        ]),
        shPoly([
          [7, 4.3],
          [1.3, 10.6],
          [12.7, 10.6],
        ]),
        shRect(6, 10.6, 8, 14),
      ),
  },
  {
    name: "Fish",
    icon: "./assets/svg/fish.svg",
    color: "#2b7fe0",
    build: () =>
      shUnion(
        shEllipse(6, 7, 5, 3.4, 0),
        shPoly([
          [10.7, 7],
          [14.3, 3.2],
          [14.3, 10.8],
        ]),
      ),
  },
  {
    name: "Cat",
    icon: "./assets/svg/cat.svg",
    color: "#8e5cc7",
    build: () =>
      shSub(
        shUnion(
          shCircle(7, 8.3, 5),
          shPoly([
            [2, 6.3],
            [4.6, 1],
            [6.3, 6.3],
          ]),
          shPoly([
            [7.7, 6.3],
            [9.4, 1],
            [12, 6.3],
          ]),
        ),
        shUnion(shCircle(5, 7.8, 0.9), shCircle(9, 7.8, 0.9)),
      ),
  },
  {
    name: "Paw Print",
    icon: "./assets/svg/paw-print.svg",
    color: "#a1662f",
    build: () =>
      shUnion(
        shCircle(3.6, 5.7, 1.8),
        shCircle(6.3, 3.6, 1.8),
        shCircle(7.8, 3.6, 1.8),
        shCircle(10.5, 5.7, 1.8),
        shEllipse(7, 10.2, 3.7, 3.1, 0),
      ),
  },
  {
    name: "Ice Cream",
    icon: "./assets/svg/ice-cream.svg",
    color: "#f2a6c1",
    build: () =>
      shUnion(
        shPoly([
          [4.6, 14],
          [9.4, 14],
          [7, 6.8],
        ]),
        shCircle(7, 5.3, 4.3),
      ),
  },
  {
    name: "Cupcake",
    icon: "./assets/svg/cupcake.svg",
    color: "#e86a92",
    build: () =>
      shUnion(
        shPoly([
          [3, 14],
          [11, 14],
          [9.6, 8.7],
          [4.4, 8.7],
        ]),
        shCircle(4.6, 6.3, 2.3),
        shCircle(7, 4.6, 2.6),
        shCircle(9.4, 6.3, 2.3),
        shCircle(7, 1.7, 1),
      ),
  },
  {
    name: "Anchor",
    icon: "./assets/svg/anchor.svg",
    color: "#35506b",
    build: () =>
      shUnion(
        shRect(6.3, 1.6, 7.7, 13),
        shSub(shCircle(7, 2, 1.9), shCircle(7, 2, 0.9)),
        shRect(3, 5, 11, 6),
        shSub(shEllipse(7, 12, 5.1, 2.4, 0), shEllipse(7, 12, 3.6, 1.1, 0)),
      ),
  },
];
