import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hoverAndMotionViolations } from './cssMotion.mjs';

const MODULE = 'apps/web/src/features/events/components/Probe.module.css';
const CALM =
  '@media (prefers-reduced-motion: reduce) { .a { animation: none; transition: none; } }';

describe('hover and reduced motion', () => {
  it('refuses a hover state outside @media (hover: hover)', () => {
    assert.equal(
      hoverAndMotionViolations(MODULE, '.a:hover { color: var(--color-text); }').length,
      1
    );
  });

  it('accepts a hover state inside @media (hover: hover)', () => {
    const text = '@media (hover: hover) { .a:hover { color: var(--color-text); } }';

    assert.deepEqual(hoverAndMotionViolations(MODULE, text), []);
  });

  it('refuses an animation and a sliding transition without their reduced-motion counterpart', () => {
    const animation = '.a { animation: spin var(--duration-slow) var(--ease-out) infinite; }';
    const slide = '.a { transition: transform var(--duration-fast) var(--ease-out); }';

    assert.equal(hoverAndMotionViolations(MODULE, animation).length, 1);
    assert.equal(hoverAndMotionViolations(MODULE, slide).length, 1);
  });

  it('accepts them once the same class calms down under prefers-reduced-motion', () => {
    const text = [
      '.a { animation: spin var(--duration-slow) var(--ease-out) infinite; }',
      '.a { transition: transform var(--duration-fast) var(--ease-out); }',
      CALM,
    ].join('\n');

    assert.deepEqual(hoverAndMotionViolations(MODULE, text), []);
  });

  it('checks rule by rule, not file by file', () => {
    const text = [
      '.a { animation: spin var(--duration-slow) var(--ease-out) infinite; }',
      '.b { animation: spin var(--duration-slow) var(--ease-out) infinite; }',
      CALM,
    ].join('\n');

    assert.equal(hoverAndMotionViolations(MODULE, text).length, 1);
  });

  it('leaves a colour transition alone', () => {
    const text = '.a { transition: color var(--duration-fast) var(--ease-out); }';

    assert.deepEqual(hoverAndMotionViolations(MODULE, text), []);
  });
});
