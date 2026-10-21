// Trang xem trước phong cách vẽ (Prompt 3, bước A). Mở: npm run dev → /preview.html
import { characterSvg, type Expression } from './art/characters';
import { cupSvg } from './art/cup';
import { dispenserSvg } from './art/dispenser';
import { awningSvg, cloudSvg, counterSvg, priceBoardSvg, stringLightsSvg, wallSvg, windowSvg } from './art/scenery';
import { lockSvg, toppingTraySvg } from './art/toppingTray';
import { CHARACTERS } from './config/characters';
import { PALETTE } from './config/palette';
import { getTea } from './config/teas';
import { getTopping } from './config/toppings';

const PALETTE_NAMES: Record<string, string> = {
  cream: 'Giấy kem',
  beige: 'Be đậm',
  woodLight: 'Gỗ sáng',
  woodDark: 'Gỗ đậm',
  pink: 'Hồng dâu',
  pinkLight: 'Hồng nhạt',
  matcha: 'Matcha',
  mint: 'Mint',
  gold: 'Vàng',
  danger: 'Đỏ nhạt',
  outline: 'Nâu viền',
  text: 'Chữ nâu',
  guide: 'Xanh hướng dẫn',
};

const EXPRESSIONS: [Expression, string][] = [
  ['normal', 'Bình thường'],
  ['happy', 'Vui'],
  ['sad', 'Không vui'],
];

const swatches = Object.entries(PALETTE_NAMES)
  .map(([key, label]) => {
    const color = PALETTE[key as keyof typeof PALETTE];
    return `<div class="swatch"><span style="background:${color}"></span><b>${label}</b><code>${color}</code></div>`;
  })
  .join('');

const characters = CHARACTERS.map(
  (c) => `
  <div class="card">
    <h3>${c.name}</h3>
    <div class="row">${EXPRESSIONS.map(([e, label]) => `<figure>${characterSvg(c, e)}<figcaption>${label}</figcaption></figure>`).join('')}</div>
  </div>`,
).join('');

const pearls = getTopping('pearl-black').color;
const white = getTopping('pearl-white').color;
const cups = [
  ['Ly trống', cupSvg({ tea: null, fill: 0, ice: 0, toppings: [], sealed: false })],
  ['Có trà + đá', cupSvg({ tea: getTea('milk').color, fill: 0.78, ice: 4, toppings: [], sealed: false })],
  [
    'Có topping',
    cupSvg({ tea: getTea('matcha').color, fill: 0.75, ice: 2, toppings: [{ color: white, count: 8 }], sealed: false }),
  ],
  [
    'Đã ép nắp',
    cupSvg({ tea: getTea('black').color, fill: 0.8, ice: 3, toppings: [{ color: pearls, count: 10 }], sealed: true, straw: true }),
  ],
]
  .map(([label, s]) => `<figure>${s}<figcaption>${label}</figcaption></figure>`)
  .join('');

const props = [
  ['Bình trà sữa', dispenserSvg({ tea: getTea('milk').color, level: 0.8 })],
  ['Bình matcha (vơi)', dispenserSvg({ tea: getTea('matcha').color, level: 0.3 })],
  ['Bình đang khóa', dispenserSvg({ tea: getTea('peach').color, level: 0.7, locked: true })],
  ['Hũ trân châu đen', toppingTraySvg({ color: pearls, shape: 'pearl', amount: 0.9 })],
  ['Hũ thạch dừa', toppingTraySvg({ color: getTopping('jelly').color, shape: 'cube', amount: 0.6, seed: 9 })],
  ['Ổ khóa', lockSvg()],
]
  .map(([label, s]) => `<figure>${s}<figcaption>${label}</figcaption></figure>`)
  .join('');

const scene = `
  <div class="scene">
    <div class="scene-wall">${wallSvg(1080, 520)}</div>
    <div class="scene-window">${windowSvg(300, 230)}</div>
    <div class="scene-cloud">${cloudSvg()}</div>
    <div class="scene-board">${priceBoardSvg(220, 160, ['Trà sữa ....... 25k', 'Matcha ........ 30k', 'Hồng trà ...... 25k', 'Size L .......... +8k'])}</div>
    <div class="scene-lights">${stringLightsSvg(1080, 70, 13)}</div>
    <div class="scene-awning">${awningSvg(1080, 120)}</div>
    <div class="scene-customer">${characterSvg(CHARACTERS[0], 'happy')}</div>
    <div class="scene-counter">${counterSvg(1080, 150)}</div>
  </div>`;

document.getElementById('preview')!.innerHTML = `
  <style>
    body { margin: 0; background: ${PALETTE.cream}; color: ${PALETTE.text}; font-family: Nunito, sans-serif; }
    main { max-width: 1100px; margin: 0 auto; padding: 16px; }
    h1, h2, h3 { font-family: 'Baloo 2', sans-serif; margin: 8px 0; }
    h1 { font-size: 34px; color: ${PALETTE.pink}; }
    h2 { font-size: 26px; margin-top: 28px; }
    .card { background: #fff; border: 3px solid ${PALETTE.beige}; border-radius: 22px; padding: 14px; margin-bottom: 14px; }
    .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
    figure { margin: 0; text-align: center; }
    figure svg { display: block; max-width: 100%; height: auto; }
    figcaption { font-weight: 700; font-size: 14px; margin-top: 4px; }
    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .swatch { display: flex; align-items: center; gap: 8px; background: #fff; border-radius: 14px; padding: 8px; }
    .swatch span { width: 34px; height: 34px; border-radius: 10px; border: 2px solid ${PALETTE.outline}; flex: none; }
    .swatch b { font-size: 14px; } .swatch code { font-size: 12px; opacity: .7; margin-left: auto; }
    .fonts p { margin: 4px 0; }
    .baloo { font-family: 'Baloo 2'; font-weight: 700; font-size: 30px; }
    .nunito { font-size: 18px; }
    .scene { position: relative; width: 100%; aspect-ratio: 1080 / 620; overflow: hidden; border-radius: 22px; border: 3px solid ${PALETTE.outline}; }
    .scene > div { position: absolute; }
    .scene svg { width: 100%; height: auto; display: block; }
    .scene-wall { left: 0; top: 0; width: 100%; }
    .scene-window { left: 62%; top: 26%; width: 27.8%; }
    .scene-cloud { left: 66%; top: 34%; width: 10%; animation: drift 9s ease-in-out infinite alternate; }
    .scene-board { left: 5%; top: 30%; width: 20%; }
    .scene-lights { left: 0; top: 17%; width: 100%; }
    .scene-awning { left: 0; top: 0; width: 100%; }
    .scene-customer { left: 33%; top: 34%; width: 20%; }
    .scene-counter { left: 0; top: 76%; width: 100%; }
    @keyframes drift { to { transform: translateX(60%); } }
    .chars figure svg { width: 150px; }
    .cups figure svg { width: 110px; }
    .props figure svg { max-height: 220px; width: auto; }
    @media (max-width: 600px) { .chars figure svg { width: 100px; } .cups figure svg { width: 72px; } .props figure svg { max-height: 150px; } }
  </style>
  <h1>Jamie's Milk Tea — xem trước phong cách</h1>
  <p>Bước A của Prompt 3: duyệt màu, font, nhân vật và đồ vật trước khi vẽ cả tiệm.</p>

  <h2>1. Bảng màu</h2>
  <div class="swatches">${swatches}</div>

  <h2>2. Font chữ</h2>
  <div class="card fonts">
    <p class="baloo">Baloo 2 — Ngày 6 · 2.413,5k · Kho hàng</p>
    <p class="nunito">Nunito — Chị ơi, cho em 1 ly trà sữa size M, trân châu trắng, 50% đường và đá bình thường ạ!</p>
  </div>

  <h2>3. Khách mẫu (3 biểu cảm)</h2>
  <div class="chars">${characters}</div>

  <h2>4. Ly</h2>
  <div class="card row cups">${cups}</div>

  <h2>5. Bình trà, hũ topping</h2>
  <div class="card row props">${props}</div>

  <h2>6. Mảng cảnh: mái hiên + tường + quầy</h2>
  ${scene}
`;
