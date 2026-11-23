export const CSP_REPORTS_PER_PAGE = 5;

const EXTENSION_SCHEMES = /^(?:chrome|moz|safari|safari-web|ms-browser)-extension:/;

type ViolationDetails = Pick<
  SecurityPolicyViolationEvent,
  'effectiveDirective' | 'blockedURI' | 'disposition'
>;

class ContentSecurityPolicyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentSecurityPolicyViolation';
  }
}

function blockedSource(blockedURI: string): string {
  try {
    return new URL(blockedURI).origin;
  } catch {
    return blockedURI;
  }
}

export function describeViolation(violation: ViolationDetails): string | null {
  const blocked = violation.blockedURI ?? '';
  if (EXTENSION_SCHEMES.test(blocked)) return null;
  return `${violation.effectiveDirective} blocked ${blockedSource(blocked) || 'inline'}`;
}

export function reportContentSecurityPolicyViolations(
  target: Pick<EventTarget, 'addEventListener'>,
  report: (error: Error) => void
): void {
  const reported = new Set<string>();
  target.addEventListener('securitypolicyviolation', (event) => {
    if (reported.size >= CSP_REPORTS_PER_PAGE) return;
    const message = describeViolation(event as SecurityPolicyViolationEvent);
    if (message === null || reported.has(message)) return;
    reported.add(message);
    report(new ContentSecurityPolicyViolation(message));
  });
}
