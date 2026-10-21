// Tủ đồ: xem tiền tip cá nhân, mua và mặc outfit.
import { characterAvatarSvg } from '../art/characters';
import { OUTFITS, staffLook } from '../config/outfits';
import { WARDROBE_TEXT, fill } from '../config/strings';
import { formatMoney } from '../core/economy';
import type { Profile } from '../core/types';
import { esc } from './modal';

export function renderWardrobe(profile: Profile): string {
  const cards = OUTFITS.map((o) => {
    const owned = profile.ownedOutfits.includes(o.id);
    const wearing = profile.outfit === o.id;
    const color = o.look.accent ?? '#F28CA8';
    // Hình đầu nhân viên mặc outfit này (vẽ bằng SVG như trong game)
    const face = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(characterAvatarSvg(staffLook(o.id)))}`;
    let button: string;
    if (wearing) button = `<em>${esc(WARDROBE_TEXT.wearing)}</em>`;
    else if (owned) button = `<button type="button" data-action="wear" data-id="${esc(o.id)}">${esc(WARDROBE_TEXT.wear)}</button>`;
    else
      button = `<button type="button" class="unlock" data-action="buy-outfit" data-id="${esc(o.id)}" ${
        profile.tipCoins >= o.price ? '' : 'disabled'
      }>${esc(fill(WARDROBE_TEXT.buy, { price: formatMoney(o.price) }))}</button>`;
    return `<li class="outfit-card ${wearing ? 'wearing' : ''}">
      <span class="outfit-swatch" style="background:${esc(color)}" aria-hidden="true"><img src="${face}" alt=""></span>
      <b>${esc(o.name)}</b>
      ${button}
    </li>`;
  }).join('');
  return `
    <header class="modal-head">
      <h2>${esc(WARDROBE_TEXT.title)}</h2>
      <div class="modal-cash">${esc(WARDROBE_TEXT.tips)}: ${esc(formatMoney(profile.tipCoins))}</div>
    </header>
    <div class="modal-body">
      <p class="hint">${esc(WARDROBE_TEXT.hint)}</p>
      <ul class="outfit-grid">${cards}</ul>
    </div>
    <footer class="modal-foot">
      <button type="button" class="primary" data-action="close">${esc(WARDROBE_TEXT.close)}</button>
    </footer>`;
}
