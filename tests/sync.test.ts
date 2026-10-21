import { describe, expect, it } from 'vitest';
import { emptyStaffDay } from '../src/core/economy';
import { LEDGER_LIMIT, buyOutfit, createProfile, creditProfile, ledgerKey, wearOutfit } from '../src/core/profile';
import { reduce } from '../src/core/reducer';
import type { StaffDay } from '../src/core/types';
import { createSave, defaultSettings, migrate, restoreShop, shopSaveOf, type ShopSave } from '../src/save/schema';
import { profileFromCloud, profileToCloud, resolveProfile, resolveShop, shopFromCloud, shopToCloud } from '../src/save/sync';
import { stateWithCustomer } from './helpers';

function shop(updatedAt: number, cloudBase: number, cash = 500_000): ShopSave {
  return shopSaveOf({ ...stateWithCustomer(), cash }, { ownerUid: 'u1', cloudBase }, updatedAt);
}

describe('đồng bộ tiệm: máy ↔ cloud', () => {
  it('chưa có trên cloud: dùng bản trên máy và đẩy lên', () => {
    const r = resolveShop(shop(100, 0), null);
    expect(r).toMatchObject({ use: 'local', push: true });
  });

  it('máy mới (chưa có gì): lấy bản cloud', () => {
    const cloud = shop(100, 100);
    expect(resolveShop(null, cloud)).toEqual({ use: 'cloud', data: cloud, push: false });
  });

  it('chơi offline, cloud không ai sửa: tiến độ trên máy được đẩy lên', () => {
    const local = shop(300, 100, 900_000);
    const cloud = shop(100, 100);
    const r = resolveShop(local, cloud);
    expect(r.use).toBe('local');
    expect(r.push).toBe(true);
    expect(r.data?.cash).toBe(900_000);
  });

  it('cloud đã bị sửa ở máy khác: cloud thắng, dù bản trên máy mới hơn', () => {
    const local = shop(500, 100, 900_000);
    const cloud = shop(400, 400, 700_000);
    const r = resolveShop(local, cloud);
    expect(r.use).toBe('cloud');
    expect(r.push).toBe(false);
    expect(r.data?.cash).toBe(700_000);
  });

  it('máy chưa từng đồng bộ mà cloud đã có tiệm: tin cloud', () => {
    expect(resolveShop(shop(999, 0), shop(100, 100)).use).toBe('cloud');
  });

  it('đã đồng bộ, không ai chơi thêm: không cần đẩy', () => {
    expect(resolveShop(shop(100, 100), shop(100, 100))).toMatchObject({ use: 'local', push: false });
  });

  it('ghi lên cloud rồi đọc lại giữ nguyên tiệm, lịch sử thành object theo ngày', () => {
    let state = { ...stateWithCustomer(), shopName: 'Tiệm Mây', upgrades: ['bench'], decor: ['plant'] };
    state = reduce(state, { type: 'END_DAY' }).state;
    const local = shopSaveOf(state, { ownerUid: 'u1', cloudBase: 0 }, 777);
    const cloud = JSON.parse(JSON.stringify(shopToCloud(local, 'ABC234')));
    expect(cloud.history).toHaveProperty('d1');
    expect(cloud.room).toBe('ABC234');
    expect(cloud.cloudBase).toBeUndefined();
    const back = shopFromCloud(cloud);
    expect(back?.shopName).toBe('Tiệm Mây');
    expect(back?.upgrades).toEqual(['bench']);
    expect(back?.decor).toEqual(['plant']);
    expect(back?.history).toHaveLength(1);
    expect(back?.cash).toBe(state.cash);
    expect(back?.cloudBase).toBe(777);
    expect(restoreShop({ shop: back! }).day).toBe(2);
  });
});

describe('đồng bộ profile: bản mới hơn thắng', () => {
  const p = (updatedAt: number, tipCoins: number) => ({ ...createProfile('u1', 'Na'), updatedAt, tipCoins });

  it('bản trên máy mới hơn: dùng và đẩy lên', () => {
    expect(resolveProfile(p(200, 5000), p(100, 1000))).toMatchObject({ use: 'local', push: true });
  });

  it('bản cloud mới hơn (đã mua outfit trên iPad): dùng cloud', () => {
    const r = resolveProfile(p(100, 5000), p(200, 1000));
    expect(r.use).toBe('cloud');
    expect(r.data?.tipCoins).toBe(1000);
  });

  it('thiếu một bên', () => {
    expect(resolveProfile(null, p(1, 1)).use).toBe('cloud');
    expect(resolveProfile(p(1, 1), null)).toMatchObject({ use: 'local', push: true });
  });

  it('ghi lên cloud rồi đọc lại; outfit lạ bị bỏ, tiền âm về 0', () => {
    const back = profileFromCloud(JSON.parse(JSON.stringify(profileToCloud(p(5, 3000)))));
    expect(back?.tipCoins).toBe(3000);
    const bad = profileFromCloud({ tipCoins: -50, outfit: 'áo-lạ', ownedOutfits: ['áo-lạ', 'matcha'] });
    expect(bad?.tipCoins).toBe(0);
    expect(bad?.outfit).toBe('strawberry');
    expect(bad?.ownedOutfits).toEqual(['strawberry', 'matcha']);
  });
});

describe('cộng tip vào profile đúng một lần', () => {
  const day = (tips: number, cups = 1, score = 90): StaffDay => ({
    ...emptyStaffDay(),
    tips,
    cups: { tea: cups, topping: 0, cashier: 0 },
    score: { tea: score * cups, topping: 0, cashier: 0 },
  });

  it('chỉ cộng phần mới so với lần trước', () => {
    let profile = createProfile('u1');
    let ledger = {};
    const key = ledgerKey('run1', 1);
    let r = creditProfile(profile, ledger, key, day(3000), 1);
    expect(r.gained).toBe(3000);
    ({ profile, ledger } = r);
    r = creditProfile(profile, ledger, key, day(3000), 2);
    expect(r.gained).toBe(0);
    expect(r.profile).toBe(profile); // không đổi gì
    r = creditProfile(profile, ledger, key, day(7000, 2), 3);
    expect(r.gained).toBe(4000);
    expect(r.profile.tipCoins).toBe(7000);
    expect(r.profile.stats.tea).toEqual({ cups: 2, scoreSum: 180 });
  });

  it('lượt chơi khác (chơi lại cùng ngày) được cộng riêng', () => {
    const a = creditProfile(createProfile(), {}, ledgerKey('run1', 1), day(3000), 1);
    const b = creditProfile(a.profile, a.ledger, ledgerKey('run2', 1), day(2000), 2);
    expect(b.profile.tipCoins).toBe(5000);
  });

  it('state tạm lùi (chờ chủ phòng xác nhận) không làm cộng lại lần nữa', () => {
    const key = ledgerKey('r', 1);
    const a = creditProfile(createProfile(), {}, key, day(5000), 1);
    const b = creditProfile(a.profile, a.ledger, key, day(4000), 2);
    const c = creditProfile(b.profile, b.ledger, key, day(5000), 3);
    expect(c.profile.tipCoins).toBe(5000);
  });

  it('sổ ghi chỉ giữ các lượt gần nhất', () => {
    let profile = createProfile();
    let ledger = {};
    for (let i = 0; i < LEDGER_LIMIT + 5; i++) ({ profile, ledger } = creditProfile(profile, ledger, `k${i}`, day(500), i));
    expect(Object.keys(ledger)).toHaveLength(LEDGER_LIMIT);
    expect(profile.tipCoins).toBe(500 * (LEDGER_LIMIT + 5));
    expect(emptyStaffDay().cups.tea).toBe(0);
  });
});

describe('outfit', () => {
  it('mua bằng tiền tip, mua xong mặc luôn; không đủ tip thì không mua được', () => {
    const rich = { ...createProfile(), tipCoins: 30_000 };
    const r = buyOutfit(rich, 'matcha', 5);
    expect(r.ok && r.profile.tipCoins).toBe(10_000);
    expect(r.ok && r.profile.outfit).toBe('matcha');
    expect(buyOutfit(createProfile(), 'matcha', 1)).toEqual({ ok: false, reason: 'noTips' });
    expect(r.ok && buyOutfit(r.profile, 'matcha', 6)).toEqual({ ok: false, reason: 'alreadyOwned' });
  });

  it('chỉ mặc được outfit đã có', () => {
    expect(wearOutfit(createProfile(), 'sky', 1)).toEqual({ ok: false, reason: 'notOwned' });
    expect(wearOutfit(createProfile(), 'strawberry', 1).ok).toBe(true);
  });
});

describe('nâng cấp bản lưu 1 → 2', () => {
  it('bản lưu cũ: giữ tiệm, tên người chơi chuyển sang profile, trường mới có mặc định', () => {
    const v1 = {
      schemaVersion: 1,
      updatedAt: 50,
      shop: { day: 5, cash: 1_234_000, seed: 9, unlockedTeas: ['milk', 'green'] },
      settings: { muted: true, playerName: 'Jamie' },
    };
    const save = migrate(v1);
    expect(save?.schemaVersion).toBe(2);
    expect(save?.shop.day).toBe(5);
    expect(save?.shop.cash).toBe(1_234_000);
    expect(save?.shop.shopName).toBe("Jamie's Milk Tea");
    expect(save?.shop.upgrades).toEqual([]);
    expect(save?.shop.ownerUid).toBe('');
    expect(save?.shop.cloudBase).toBe(0);
    expect(save?.profile.name).toBe('Jamie');
    expect(save?.profile.tipCoins).toBe(0);
    expect(save?.settings.muted).toBe(true);
  });

  it('bản lưu v2 lưu rồi đọc lại giữ profile và sổ ghi', () => {
    const profile = { ...createProfile('u9', 'Bé'), tipCoins: 4200, updatedAt: 3 };
    const ledger = { 'r:1': { ...emptyStaffDay(), tips: 4200 } };
    const save = createSave(stateWithCustomer(), defaultSettings(), { profile, ledger, meta: { ownerUid: 'u9', cloudBase: 2 } });
    const back = migrate(JSON.parse(JSON.stringify(save)));
    expect(back?.profile).toEqual(profile);
    expect(back?.ledger['r:1'].tips).toBe(4200);
    expect(back?.shop.ownerUid).toBe('u9');
    expect(back?.shop.cloudBase).toBe(2);
  });
});
