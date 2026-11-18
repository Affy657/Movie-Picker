import { FOUNDATION, KEYFRAME_STEP, forEachRule, subjectClassListsOf } from './cssSyntax.mjs';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';

export function hoverAndMotionViolations(path, text) {
  const found = [];
  const underReducedMotion = (ancestors) =>
    ancestors.some((ancestor) => ancestor.includes('prefers-reduced-motion: reduce'));
  const moving = [];
  const calmed = new Set();
  let calmedWithoutClass = false;
  forEachRule(text, (selector, body, ancestors) => {
    if (selector.startsWith('@') || KEYFRAME_STEP.test(selector)) return;
    if (
      selector.includes(':hover') &&
      !underReducedMotion(ancestors) &&
      !ancestors.some((ancestor) => ancestor.includes('(hover: hover)'))
    )
      found.push(
        `${path}: ${selector} sits outside @media (hover: hover), the hover state sticks after a tap`
      );
    if (underReducedMotion(ancestors)) {
      for (const names of subjectClassListsOf(selector)) {
        if (names.length === 0) calmedWithoutClass = true;
        for (const name of names) calmed.add(name);
      }
      return;
    }
    for (const [, prop, value] of body.matchAll(
      /(?:^|[;\n])\s*(animation|animation-name|transition|transition-property)\s*:\s*([^;]+)/g
    )) {
      const shown = value.trim();
      const animates = prop.startsWith('animation') && shown !== 'none';
      const slides =
        prop.startsWith('transition') && /\b(?:transform|translate|scale|rotate|all)\b/.test(shown);
      if (animates || slides) {
        moving.push(selector);
        break;
      }
    }
  });
  if (path === FOUNDATION) return found;
  const covered = (names) =>
    names.length === 0
      ? calmedWithoutClass || calmed.size > 0
      : names.some((name) => calmed.has(name));
  for (const selector of moving)
    if (!subjectClassListsOf(selector).every(covered))
      found.push(
        `${path}: ${selector} animates or transitions a transform without its ${REDUCED_MOTION} counterpart (AGENTS.md)`
      );
  return found;
}
