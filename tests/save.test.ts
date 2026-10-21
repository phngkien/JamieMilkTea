import { describe, expect, it } from 'vitest';
import { STOCK_ICE, stockIdOfCup } from '../src/config/inventory';
import { createShopState, reduce } from '../src/core/reducer';
import type { ShopState } from '../src/core/types';
import {
  SCHEMA_VERSION,
  createSave,
  defaultSettings,
  migrate,
  newest,
  restoreShop,
  type Migration,
} from '../src/save/schema';
import { run, stateWithCustomer } from './helpers';

describe('save', () => {
  it('lưu rồi đọc lại giữ nguyên ngày, két, kho, món đã mở, đánh giá', () => {
    let state: ShopState = { ...createShopState(77, 2), phase: 'prep' };
    state = run(state, [
      { type: 'UNLOCK_ITEM', kind: 'topping', id: 'pudding' },
      { type: 'RESTOCK', item: STOCK_ICE },
    ]).state;
    state = { ...state, ratingSum: 9, ratingCount: 2 };
    const save = migrate(JSON.parse(JSON.stringify(createSave(state, defaultSettings(), { now: 123 }))));
    expect(save).not.toBeNull();
    const restored = restoreShop(save!);
    expect(restored.day).toBe(2);
    expect(restored.cash).toBe(state.cash);
    expect(restored.stock).toEqual(state.stock);
    expect(restored.lots).toEqual(state.lots);
    expect(restored.unlockedToppings).toContain('pudding');
    expect(restored.ratingSum).toBe(9);
    expect(restored.seed).toBe(77);
    // Bắt đầu lại từ lúc mở cửa, không còn khách hay ly dở
    expect(restored.time).toBe(0);
    expect(restored.phase).toBe('prep');
    expect(restored.customers).toEqual([]);
    expect(restored.cups).toEqual([]);
    expect(save!.updatedAt).toBe(123);
  });

  it('đã đóng cửa (đang xem tổng kết) thì mở lại vào ngày tiếp theo', () => {
    const closed = reduce(createShopState(1), { type: 'END_DAY' }).state;
    const restored = restoreShop(createSave(closed, defaultSettings()));
    expect(restored.day).toBe(2);
    expect(restored.history).toHaveLength(1);
    expect(restored.cash).toBe(closed.cash);
  });

  it('ly đang làm dở và khách đang chờ không được lưu', () => {
    const state = run(stateWithCustomer(), [{ type: 'PICK_CUP', size: 'M' }]).state;
    const restored = restoreShop(createSave(state, defaultSettings()));
    expect(restored.cups).toEqual([]);
    expect(restored.customers).toEqual([]);
    expect(restored.stock[stockIdOfCup('M')]).toBe(state.stock[stockIdOfCup('M')]);
  });

  it('bản lưu hỏng hoặc từ phiên bản mới hơn thì trả null', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate('abc')).toBeNull();
    expect(migrate({})).toBeNull();
    expect(migrate({ schemaVersion: SCHEMA_VERSION })).toBeNull(); // thiếu shop
    expect(migrate({ schemaVersion: SCHEMA_VERSION + 1, shop: {} })).toBeNull();
  });

  it('thiếu trường thì điền mặc định; số âm, món lạ bị loại bỏ', () => {
    const save = migrate({
      schemaVersion: SCHEMA_VERSION,
      shop: {
        day: 3,
        cash: 1000,
        stock: { [STOCK_ICE]: -5, 'cup-M': 7 },
        unlockedTeas: ['milk', 'không-tồn-tại', 42],
      },
    });
    expect(save).not.toBeNull();
    expect(save!.shop.day).toBe(3);
    expect(save!.shop.stock[STOCK_ICE]).toBe(0);
    expect(save!.shop.stock['cup-M']).toBe(7);
    expect(save!.shop.stock['cup-L']).toBe(createShopState(1).stock['cup-L']);
    expect(save!.shop.unlockedTeas).toEqual(['milk']);
    expect(save!.shop.unlockedToppings).toEqual(createShopState(1).unlockedToppings);
    expect(save!.settings).toEqual(defaultSettings());
    expect(save!.shop.dayFinished).toBe(false);
  });

  it('migrate chạy lần lượt các bước nâng cấp phiên bản', () => {
    // Giả lập: phiên bản 1 lưu tiền ở trường "money", phiên bản 2 đổi tên thành "cash".
    const migrations: Record<number, Migration> = {
      1: (old) => {
        const shop = old.shop as Record<string, unknown>;
        return { ...old, shop: { ...shop, cash: shop.money } };
      },
    };
    const save = migrate({ schemaVersion: 1, shop: { day: 4, money: 777 } }, migrations, 2);
    expect(save?.schemaVersion).toBe(2);
    expect(save?.shop.cash).toBe(777);
    // Thiếu bước nâng cấp thì không đoán
    expect(migrate({ schemaVersion: 1, shop: {} }, {}, 2)).toBeNull();
  });

  it('newest chọn bản có updatedAt mới hơn', () => {
    const a = createSave(createShopState(1), defaultSettings(), { now: 100 });
    const b = createSave(createShopState(2), defaultSettings(), { now: 200 });
    expect(newest(a, b)).toBe(b);
    expect(newest(b, a)).toBe(b);
    expect(newest(null, a)).toBe(a);
    expect(newest(null, null)).toBeNull();
  });
});
