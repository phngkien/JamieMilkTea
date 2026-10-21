// Bố cục DỌC (iPhone): rộng 1080, cảnh cao ~3050, cuộn dọc.
// Vùng 1: khách + quầy trà · Vùng 2: pha ly · Vùng 3: kệ topping.
import { grid, row, type ShopLayout } from './types';

const W = 1080;
const HUD = 150;
const NAV = 160;

export function portraitLayout(viewHeight: number): ShopLayout {
  const toppingArea = { x: 30, y: 2110, w: W - 60, h: 500 };
  const bottomRow = row(30, 1800, W - 60, 200, 4, 20);
  const worldHeight = 2900 + NAV;
  const maxScroll = Math.max(0, worldHeight - viewHeight);
  return {
    kind: 'portrait',
    viewWidth: W,
    viewHeight,
    worldHeight,
    hudHeight: HUD,
    navHeight: NAV,
    uiScale: 1,
    awning: { x: 0, y: HUD, w: W, h: 100 },
    queue: { x: 30, y: HUD + 115, w: 360, h: 90 },
    customer: { x: 30, y: 370, w: 240, h: 330 },
    bubble: { x: 290, y: 365, w: 760, h: 330 },
    labels: [
      { key: 'teaCounter', x: 30, y: 730 },
      { key: 'brewArea', x: 30, y: 1160 },
      { key: 'toppingShelf', x: 30, y: 2050 },
    ],
    teaShelf: { x: 20, y: 1060, w: W - 40, h: 60 },
    dispensers: row(40, 790, W - 80, 300, 6, 20),
    cupStacks: {
      M: { x: 30, y: 1230, w: 135, h: 300 },
      L: { x: 175, y: 1230, w: 135, h: 300 },
    },
    sealer: { x: 790, y: 1230, w: 260, h: 300 },
    board: { x: 330, y: 1220, w: 440, h: 440 },
    cupSpot: { x: 550, y: 1600 },
    cupHeight: { M: 250, L: 300 },
    statusText: { x: 550, y: 1700, width: 700 },
    trash: bottomRow[0],
    ice: bottomRow[1],
    syrup: bottomRow[2],
    serveButton: bottomRow[3],
    toppingShelf: { x: 15, y: 2095, w: W - 30, h: 530 },
    toppings: grid(toppingArea, 4, 3, 20),
    comingSoon: { x: 30, y: 2660, w: W - 60, h: 120 },
    floor: { x: 0, y: 2810, w: W, h: worldHeight - 2810 },
    zones: {
      customer: { x: 0, y: HUD + 100, w: W, h: 720 - HUD - 100 },
      tea: { x: 0, y: 720, w: W, h: 420 },
      brew: { x: 0, y: 1140, w: W, h: 890 },
      topping: { x: 0, y: 2030, w: W, h: 780 },
    },
    decor: { x: 420, y: 262, w: 420, h: 98 },
    counterStrip: { x: 0, y: 700, w: W, h: 30 },
    worker: { x: 900, y: 252, w: 150, h: 112 },
    sections: {
      tea: 0,
      brew: Math.min(maxScroll, 1140 - HUD - 10),
      topping: maxScroll,
    },
  };
}
