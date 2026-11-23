import { describe, expect, it, vi } from 'vitest';
import {
  CSP_REPORTS_PER_PAGE,
  describeViolation,
  reportContentSecurityPolicyViolations,
} from '@/shared/observability/cspViolations';

type Violation = Parameters<typeof describeViolation>[0];

function violation(overrides: Partial<Violation> = {}): Violation {
  return {
    effectiveDirective: 'script-src-elem',
    blockedURI: 'https://evil.example/steal.js?token=secret',
    disposition: 'enforce',
    ...overrides,
  };
}

function dispatchTo(target: EventTarget, details: Violation): void {
  target.dispatchEvent(Object.assign(new Event('securitypolicyviolation'), details));
}

describe('describeViolation', () => {
  it('names the directive and the origin it blocked, never the path or query', () => {
    expect(describeViolation(violation())).toBe('script-src-elem blocked https://evil.example');
  });

  it('keeps the keyword of an inline or eval violation', () => {
    expect(describeViolation(violation({ blockedURI: 'inline' }))).toBe(
      'script-src-elem blocked inline'
    );
  });

  it('ignores what browser extensions inject', () => {
    expect(
      describeViolation(violation({ blockedURI: 'chrome-extension://abc/content.js' }))
    ).toBeNull();
  });
});

describe('reportContentSecurityPolicyViolations', () => {
  it('reports each blocked resource once', () => {
    const target = new EventTarget();
    const report = vi.fn();
    reportContentSecurityPolicyViolations(target, report);

    dispatchTo(target, violation());
    dispatchTo(target, violation());
    dispatchTo(target, violation({ effectiveDirective: 'img-src' }));

    expect(report).toHaveBeenCalledTimes(2);
    expect(report.mock.calls[0]![0]).toMatchObject({
      name: 'ContentSecurityPolicyViolation',
      message: 'script-src-elem blocked https://evil.example',
    });
  });

  it('stops after a few reports so that one broken page cannot flood the monitoring', () => {
    const target = new EventTarget();
    const report = vi.fn();
    reportContentSecurityPolicyViolations(target, report);

    for (let index = 0; index < CSP_REPORTS_PER_PAGE + 3; index += 1) {
      dispatchTo(target, violation({ blockedURI: `https://cdn${index}.example/a.js` }));
    }

    expect(report).toHaveBeenCalledTimes(CSP_REPORTS_PER_PAGE);
  });
});
