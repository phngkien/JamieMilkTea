// Tác dụng gộp của các nâng cấp tiệm đã mua. Hàm thuần, có test.
import { NO_EFFECTS, getUpgrade, type UpgradeEffects } from '../config/upgrades';

export function upgradeEffects(owned: readonly string[]): UpgradeEffects {
  const fx = { ...NO_EFFECTS };
  for (const id of owned) {
    const e = getUpgrade(id)?.effect;
    if (!e) continue;
    // Hệ số thì nhân dồn, số cộng thêm thì cộng dồn
    if (e.patienceFactor !== undefined) fx.patienceFactor *= e.patienceFactor;
    if (e.tipFactor !== undefined) fx.tipFactor *= e.tipFactor;
    if (e.extraCustomers !== undefined) fx.extraCustomers += e.extraCustomers;
    if (e.restockDiscount !== undefined) fx.restockDiscount = Math.min(0.9, fx.restockDiscount + e.restockDiscount);
  }
  return fx;
}
