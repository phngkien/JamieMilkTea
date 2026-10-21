// Hướng dẫn lần đầu: thẻ xanh dương nhỏ trên đầu vật cần thao tác, cho order đầu tiên.
import { ICE_STEPS, SIZES, SUGAR_STEPS } from '../config/cup';
import { ICE_TEXT, TUTORIAL_TEXT, UI_TEXT, fill } from '../config/strings';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import type { ShopState } from '../core/types';

/** Vật mà bước hướng dẫn chỉ vào. */
export type TutorialTarget =
  | { kind: 'cupStack'; size: 'M' | 'L' }
  | { kind: 'dispenser'; tea: string }
  | { kind: 'syrup' }
  | { kind: 'ice' }
  | { kind: 'topping'; topping: string }
  | { kind: 'sealer' }
  | { kind: 'trash' }
  | { kind: 'serve' };

export interface TutorialStep {
  text: string;
  target: TutorialTarget;
}

/**
 * Tính bước hướng dẫn hiện tại từ state (hàm thuần).
 * Người chơi làm theo thứ tự nào cũng được: bước hiện tại là bước đầu tiên chưa xong.
 */
export function currentTutorialStep(state: ShopState, customerId: string): TutorialStep | null {
  const customer = state.customers[0];
  if (!customer || customer.id !== customerId) return null;
  const specIndex = customer.order.served.findIndex((s) => s === null);
  if (specIndex < 0) return null;
  const spec = customer.order.cups[specIndex];
  const cup = state.cups[0] ?? null;
  if (cup?.ruined) return { text: TUTORIAL_TEXT.ruined, target: { kind: 'trash' } };

  const steps: { done: boolean; text: string; target: TutorialTarget }[] = [];
  steps.push({
    done: cup !== null,
    text: fill(TUTORIAL_TEXT.pickCup, { size: spec.size }),
    target: { kind: 'cupStack', size: spec.size },
  });
  steps.push({
    done: cup !== null && cup.tea !== null && cup.fill >= SIZES[cup.size].greenMin,
    text: fill(TUTORIAL_TEXT.pour, { tea: getTea(spec.tea).name }),
    target: { kind: 'dispenser', tea: spec.tea },
  });
  const sugarTimes = SUGAR_STEPS.indexOf(spec.sugar);
  if (sugarTimes > 0) {
    steps.push({
      done: cup !== null && cup.sugarTaps >= sugarTimes,
      text: fill(TUTORIAL_TEXT.sugar, { times: sugarTimes, p: spec.sugar }),
      target: { kind: 'syrup' },
    });
  }
  const iceTimes = ICE_STEPS.indexOf(spec.ice);
  if (iceTimes > 0) {
    steps.push({
      done: cup !== null && cup.iceScoops >= iceTimes,
      text: fill(TUTORIAL_TEXT.ice, { times: iceTimes, ice: ICE_TEXT[spec.ice] }),
      target: { kind: 'ice' },
    });
  }
  for (const t of spec.toppings) {
    steps.push({
      done: cup !== null && (cup.toppings.find((x) => x.id === t.id)?.scoops ?? 0) >= t.scoops,
      text: fill(TUTORIAL_TEXT.topping, { name: getTopping(t.id).name, times: t.scoops }),
      target: { kind: 'topping', topping: t.id },
    });
  }
  steps.push({ done: cup?.sealed ?? false, text: TUTORIAL_TEXT.seal, target: { kind: 'sealer' } });
  steps.push({ done: false, text: TUTORIAL_TEXT.serve, target: { kind: 'serve' } });

  const index = steps.findIndex((s) => !s.done);
  const step = steps[index];
  return { text: fill(step.text, { k: index + 1 }), target: step.target };
}

/** Thẻ xanh dương (DOM). Vị trí do scene cập nhật mỗi khung hình. */
export class TutorialCard {
  private root: HTMLElement;
  private label: HTMLElement;
  private shown = false;

  constructor(root: HTMLElement, onSkip: () => void) {
    this.root = root;
    root.innerHTML = '<p class="tutorial-text"></p><button type="button" class="tutorial-skip"></button>';
    this.label = root.querySelector('.tutorial-text')!;
    const skip = root.querySelector<HTMLButtonElement>('.tutorial-skip')!;
    skip.textContent = UI_TEXT.skipTutorial;
    skip.addEventListener('click', onSkip);
    root.hidden = true;
  }

  /**
   * Hiện thẻ ở phía trên điểm (x, y) — toạ độ CSS trong lớp overlay.
   * Nếu không đủ chỗ phía trên thì đặt xuống dưới vật (yBelow).
   */
  show(message: string, x: number, y: number, yBelow: number, bounds: { width: number; top: number }): void {
    if (this.label.textContent !== message) this.label.textContent = message;
    if (!this.shown) {
      this.root.hidden = false;
      this.shown = true;
    }
    const w = this.root.offsetWidth;
    const h = this.root.offsetHeight;
    const left = Math.max(8, Math.min(bounds.width - w - 8, x - w / 2));
    const top = y - h - 10 < bounds.top ? yBelow + 10 : y - h - 10;
    this.root.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  hide(): void {
    if (!this.shown) return;
    this.root.hidden = true;
    this.shown = false;
  }
}
