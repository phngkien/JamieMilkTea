// Chọn bố cục theo hình dạng màn hình.
import { landscapeLayout } from './landscape';
import { portraitLayout } from './portrait';
import type { ShopLayout } from './types';

export * from './types';

/** Bố cục dọc: rộng 1080, cao theo tỉ lệ màn hình (để lấp kín iPhone, không có viền thừa). */
const PORTRAIT_WIDTH = 1080;
const PORTRAIT_MIN_HEIGHT = 1440;
const PORTRAIT_MAX_HEIGHT = 2400;

export function chooseLayout(screenWidth: number, screenHeight: number): ShopLayout {
  if (screenWidth > screenHeight) return landscapeLayout();
  const ratio = screenHeight / Math.max(1, screenWidth);
  const height = Math.round(
    Math.min(PORTRAIT_MAX_HEIGHT, Math.max(PORTRAIT_MIN_HEIGHT, PORTRAIT_WIDTH * ratio)),
  );
  return portraitLayout(height);
}
