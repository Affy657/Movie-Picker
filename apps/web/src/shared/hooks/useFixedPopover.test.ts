import { describe, expect, it } from 'vitest';
import { fixedPopoverPosition, fixedPopoverStyle } from './useFixedPopover';

const PHONE = { width: 375, height: 667 };

describe('fixedPopoverPosition', () => {
  it('opens below its trigger when the panel fits', () => {
    const position = fixedPopoverPosition(
      { top: 100, bottom: 124, left: 20 },
      { width: 200, height: 150 },
      PHONE
    );

    expect(position).toEqual({
      top: 130,
      left: 20,
      width: null,
      maxHeight: null,
      placement: 'bottom',
    });
  });

  it('flips above its trigger near the bottom of a small phone', () => {
    const position = fixedPopoverPosition(
      { top: 560, bottom: 584, left: 20 },
      { width: 200, height: 150 },
      PHONE
    );

    expect(position.placement).toBe('top');
    expect(position.top).toBe(560 - 6 - 150);
  });

  it('caps its height and scrolls when neither side has room', () => {
    const position = fixedPopoverPosition(
      { top: 300, bottom: 324, left: 20 },
      { width: 200, height: 900 },
      PHONE
    );

    expect(position.maxHeight).toBe(PHONE.height - 324 - 6 - 8);
    expect(fixedPopoverStyle(position)).toMatchObject({ overflowY: 'auto' });
  });

  it('keeps a width-capped panel inside a 320px screen', () => {
    const position = fixedPopoverPosition(
      { top: 100, bottom: 124, left: 290 },
      { width: 400, height: 100 },
      { width: 320, height: 568 },
      320
    );

    expect(position.width).toBe(304);
    expect(position.left).toBe(8);
  });

  it('stays hidden until it is placed', () => {
    expect(fixedPopoverStyle(null)).toEqual({ visibility: 'hidden' });
  });
});
