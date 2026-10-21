// Bố cục NGANG (iPad, máy tính): 1920×1080, ba cột, không cuộn.
// Cột trái: khách + quầy trà · Cột giữa: pha ly · Cột phải: kệ topping.
import { grid, row, type ShopLayout } from './types';

const W = 1920;
const H = 1080;
const HUD = 105;

export function landscapeLayout(): ShopLayout {
  const bottomRow = row(740, 880, 510, 170, 4, 10);
  return {
    kind: 'landscape',
    viewWidth: W,
    viewHeight: H,
    worldHeight: H,
    hudHeight: HUD,
    navHeight: 0,
    uiScale: 0.7,
    awning: { x: 0, y: HUD, w: W, h: 55 },
    queue: { x: 20, y: 175, w: 300, h: 70 },
    customer: { x: 20, y: 255, w: 200, h: 290 },
    bubble: { x: 235, y: 255, w: 470, h: 290 },
    labels: [
      { key: 'teaCounter', x: 20, y: 570 },
      { key: 'brewArea', x: 740, y: 175 },
      { key: 'toppingShelf', x: 1285, y: 175 },
    ],
    teaShelf: { x: 15, y: 880, w: 690, h: 40 },
    dispensers: row(25, 620, 670, 250, 6, 12),
    cupStacks: {
      M: { x: 740, y: 230, w: 110, h: 200 },
      L: { x: 860, y: 230, w: 110, h: 200 },
    },
    sealer: { x: 1080, y: 230, w: 170, h: 200 },
    board: { x: 790, y: 445, w: 410, h: 340 },
    cupSpot: { x: 995, y: 755 },
    cupHeight: { M: 210, L: 250 },
    statusText: { x: 995, y: 830, width: 500 },
    trash: bottomRow[0],
    ice: bottomRow[1],
    syrup: bottomRow[2],
    serveButton: bottomRow[3],
    toppingShelf: { x: 1272, y: 222, w: 638, h: 620 },
    toppings: grid({ x: 1285, y: 235, w: 612, h: 594 }, 4, 3, 12),
    comingSoon: { x: 1285, y: 870, w: 612, h: 120 },
    floor: { x: 0, y: H - 50, w: W, h: 50 },
    zones: {
      customer: { x: 0, y: HUD + 55, w: 720, h: 560 - HUD - 55 },
      tea: { x: 0, y: 560, w: 720, h: H - 560 },
      brew: { x: 720, y: HUD + 55, w: 560, h: H - HUD - 55 },
      topping: { x: 1280, y: HUD + 55, w: W - 1280, h: H - HUD - 55 },
    },
    decor: { x: 330, y: 168, w: 260, h: 82 },
    // Chậu cây giữa chồng cốc L và máy ép; bình hoa cạnh bảng gỗ; tranh trên tường dưới quầy trà
    decorSpots: {
      plant: { x: 978, y: 300, w: 96, h: 120 },
      painting: { x: 540, y: 928, w: 130, h: 100 },
      flowers: { x: 725, y: 660, w: 60, h: 86 },
    },
    counterStrip: { x: 0, y: 545, w: 720, h: 22 },
    worker: { x: 600, y: 165, w: 110, h: 86 },
    workerSpots: {
      cashier: { x: 600, y: 165, w: 110, h: 86 },
      tea: { x: 190, y: 540, w: 110, h: 86 },
      topping: { x: 1530, y: 150, w: 110, h: 86 },
      stock: { x: 1700, y: 150, w: 110, h: 86 },
    },
    sections: { tea: 0, brew: 0, topping: 0 },
  };
}
