type LogoProps = {
  x?: number;
  y?: number;
  size?: number;
};

const DEFAULT_SIZE = 20;

function LogoFrame({
  x,
  y,
  size = DEFAULT_SIZE,
  viewBox,
  children,
}: Readonly<LogoProps & { viewBox: string; children: React.ReactNode }>) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ReactLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="-11.5 -10.23 23 20.46">
      <circle r="2.05" fill="#61dafb" />
      <g stroke="#61dafb" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </LogoFrame>
  );
}

export function DotNetLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#512bd4" />
      <path
        d="M4.6 15.9a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Zm3.2-.1V8.2h1.5l3.3 5.2V8.2h1.4v7.6h-1.4l-3.4-5.3v5.3H7.8Zm8.4 0V8.2h4.5v1.3h-3v1.8h2.8v1.3h-2.8v1.9h3.1v1.3h-4.6Z"
        fill="#ffffff"
      />
    </LogoFrame>
  );
}

export function MongoLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M12 1.5c1.6 2.2 4.9 5.1 4.9 9.6 0 3.7-2.2 6.4-4.2 7.6l-.5 3.8h-.4l-.5-3.8c-2-1.2-4.2-3.9-4.2-7.6 0-4.5 3.3-7.4 4.9-9.6Z"
        fill="#00ed64"
      />
      <path d="M12 1.5c1.6 2.2 4.9 5.1 4.9 9.6 0 3.7-2.2 6.4-4.2 7.6l-.7.4V1.5Z" fill="#00684a" />
    </LogoFrame>
  );
}

export function TypeScriptLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="3" fill="#3178c6" />
      <path
        d="M13.4 12.9h2.9v1.6h-2.9v3.6c0 .5.2.7.7.7h2.1V20h-2.6c-1.5 0-2.2-.7-2.2-2.2v-4.9H9.6v-1.6h1.8v-2h2v2Z"
        fill="#ffffff"
      />
      <path
        d="M6.4 12.9H4.1v-1.6h6.4v1.6H8.2V20H6.4v-7.1Zm11.1 6.6v-1.9c.7.4 1.5.7 2.3.7.7 0 1.1-.3 1.1-.8 0-.4-.3-.7-1.2-1.1-1.4-.6-2.1-1.3-2.1-2.5 0-1.5 1.1-2.4 2.8-2.4.8 0 1.6.2 2.2.4v1.8a3.9 3.9 0 0 0-2-.6c-.6 0-1 .3-1 .7 0 .4.3.6 1.2 1 1.5.7 2.2 1.4 2.2 2.6 0 1.6-1.1 2.5-3 2.5a5.5 5.5 0 0 1-2.5-.5Z"
        fill="#ffffff"
      />
    </LogoFrame>
  );
}

export function ViteLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M23 4.3 12.6 22.8c-.2.4-.8.4-1 0L1.1 4.3c-.3-.4.1-.9.6-.8l10.1 1.8h.5l9.9-1.8c.5-.1.9.4.8.8Z"
        fill="#bd34fe"
      />
      <path
        d="M17.2 1.2 9.6 2.7c-.2 0-.3.2-.3.4l-.5 8c0 .3.2.5.5.4l2.1-.5c.3-.1.6.2.5.5l-.6 3.1c-.1.3.2.6.5.5l1.3-.4c.3-.1.6.2.5.5l-1 4.9c-.1.5.5.7.7.3l.2-.2 6-12c.2-.3-.1-.7-.4-.6l-2.2.4c-.3.1-.6-.2-.5-.5l1.4-4.9c.1-.3-.2-.6-.6-.6Z"
        fill="#ffd028"
      />
    </LogoFrame>
  );
}

export function GoogleCloudLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M12.6 4a6.4 6.4 0 0 0-5.9 3.9A5 5 0 0 0 7.6 18h9.6a4.7 4.7 0 0 0 1.2-9.2A6.4 6.4 0 0 0 12.6 4Z"
        fill="#4285f4"
      />
      <path
        d="M12.6 4a6.4 6.4 0 0 0-4.5 1.8l2.6 2.6a2.8 2.8 0 0 1 4.2.5l2.9-2.4A6.4 6.4 0 0 0 12.6 4Z"
        fill="#ea4335"
      />
      <path d="M17.8 6.5 14.9 9a2.8 2.8 0 0 1 .5 2.9l3.4 1.1a6.4 6.4 0 0 0-1-6.5Z" fill="#fbbc05" />
      <path d="M7.6 18h9.6a4.7 4.7 0 0 0 1.6-.3l-1.3-3.4a2.8 2.8 0 0 1-.9.2H7.6Z" fill="#34a853" />
    </LogoFrame>
  );
}

export function GoogleLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M14.7 8.3h.6l1.7-1.7.1-.7A7.7 7.7 0 0 0 4.6 5.6l1.5 2.6.7-.1a4.3 4.3 0 0 1 7.9.2Z"
        fill="#ea4335"
      />
      <path
        d="M19.6 8.7a7.7 7.7 0 0 0-2.5-3.7l-2.7 2.7c.9.7 1.5 1.9 1.5 3.1v.5a2.4 2.4 0 0 1 0 4.8h-4.8l-.5.5v2.9l.5.4h4.8a6.3 6.3 0 0 0 3.7-11.2Z"
        fill="#4285f4"
      />
      <path
        d="M6.3 19.9h4.8v-3.8H6.3a2.4 2.4 0 0 1-1-.2l-.7.2-1.7 1.7-.2.6a6.2 6.2 0 0 0 3.6 1.5Z"
        fill="#34a853"
      />
      <path
        d="M6.3 7.4A6.3 6.3 0 0 0 2.7 18.4l2.8-2.8a2.4 2.4 0 0 1 .8-4.6c.6 0 1.2.2 1.6.6l2.8-2.8a6.2 6.2 0 0 0-4.4-1.4Z"
        fill="#fbbc05"
      />
    </LogoFrame>
  );
}

export function AwsLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M7 10.4c0 .3 0 .5.1.7l.4.6v.2l-.4.3h-.2l-.3-.2-.3-.4-.2-.5c-.6.7-1.4 1.1-2.3 1.1-.7 0-1.2-.2-1.6-.6-.4-.4-.6-.9-.6-1.5s.3-1.2.8-1.6c.5-.4 1.2-.6 2.1-.6l1.4.2v-.6c0-.6-.1-1-.4-1.3-.2-.2-.7-.3-1.3-.3l-.9.1-.9.3H2.6c-.1 0-.2-.1-.2-.3v-.3c0-.1 0-.2.1-.3l.3-.2 1-.3 1.2-.1c.9 0 1.6.2 2 .6.4.4.6 1.1.6 2v2.5Zm-3.1 1.2.9-.2c.3-.1.6-.3.8-.6l.3-.5v-.7l-1.2-.1c-.6 0-1 .1-1.3.3-.3.2-.4.5-.4.9s.1.6.3.7c.2.2.4.2.7.2Zm6.2.8-.4-.1-.2-.3L8 6.1v-.4c-.1-.2 0-.3.2-.3h.7c.2 0 .3 0 .3.1l.2.3 1.1 4.2 1-4.2c0-.1.1-.2.2-.3h.9l.2.3 1 4.3 1.1-4.3c0-.1.1-.2.2-.3h.9c.2 0 .2.1.2.3v.4l-1.6 5.2-.2.3-.4.1h-.6l-.3-.4-1-4.1-1 4.1c0 .2-.1.3-.2.4h-.6Zm9.9.2-1.2-.1-.9-.3-.2-.3v-.4c0-.2 0-.3.2-.3h.2l.2.1.8.2.8.1c.4 0 .8-.1 1-.2.2-.2.3-.4.3-.7l-.2-.5-.7-.4-1-.3c-.5-.2-.9-.4-1.1-.8-.2-.3-.3-.7-.3-1.1s.1-.6.2-.9l.5-.6.7-.4 1-.1h1l.4.2.3.1.2.2v.6c0 .2 0 .3-.2.3l-.3-.1a3.4 3.4 0 0 0-2.2 0c-.2.1-.3.3-.3.6l.2.5.8.4 1 .3c.5.2.8.4 1 .7.2.3.3.7.3 1.1s-.1.7-.2 1l-.5.7-.8.4-1.2.1Z"
        fill="#ff9900"
      />
      <path
        d="M21.4 16.7a17 17 0 0 1-9.6 2.9 17.4 17.4 0 0 1-11.7-4.5c-.3-.2 0-.5.2-.4a23.6 23.6 0 0 0 20.7 1.3c.4-.2.7.2.4.7Zm1-1.2c-.3-.4-2-.2-2.7-.1-.2 0-.3-.1-.1-.3.7-.9 1.7-.6 1.9-.3.2.3-.2 1.7-.9 2.4-.1.1-.2 0-.2-.1.2-.5.6-1.2.4-1.6Z"
        fill="#ff9900"
      />
    </LogoFrame>
  );
}

export function TmdbLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 12">
      <rect width="24" height="12" rx="2" fill="#01b4e4" />
      <path
        d="M4 3.3h4.6v1.2H7v4.2H5.6V4.5H4V3.3Zm5.4 0H11l1.2 3 1.2-3h1.6v5.4h-1.3V5.3l-1.1 2.6h-.8l-1.1-2.6v3.4H9.4V3.3Zm6.7 0h2.4c1.3 0 2.1.6 2.1 1.3 0 .5-.3.9-.8 1.1.7.2 1.1.6 1.1 1.3 0 .9-.9 1.7-2.3 1.7h-2.5V3.3Zm1.4 2.1h.9c.5 0 .8-.2.8-.5s-.3-.5-.8-.5h-.9v1Zm0 2.2h1c.6 0 .9-.2.9-.6s-.3-.6-.9-.6h-1v1.2Z"
        fill="#ffffff"
      />
    </LogoFrame>
  );
}

export function GitHubLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.3.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.6 4.9.4.3.7.9.7 1.9v2.7c0 .3.2.6.7.5A10 10 0 0 0 22 12c0-5.5-4.5-10-10-10Z"
        fill="var(--color-text)"
      />
    </LogoFrame>
  );
}

export function LetterboxdLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 36 12">
      <circle cx="6" cy="6" r="6" fill="#ff8000" />
      <circle cx="30" cy="6" r="6" fill="#00e054" />
      <circle cx="18" cy="6" r="6" fill="#40bcf4" />
    </LogoFrame>
  );
}

export function SentryLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M12.4 2.6a1.6 1.6 0 0 0-2.8 0L7 7.2l1.4.8 2.6-4.5c.2-.3.6-.3.8 0l7.7 13.4c.2.3 0 .7-.4.7h-2.7l.1 1.6h2.6c1.2 0 2-1.3 1.4-2.4L12.4 2.6ZM9.2 9.5l-1.5.9 3.6 6.3-2.7 1.5-1.9-3.2-.8.5c-.4.2-.5.6-.3.9l1.4 2.4c.2.3.6.4.9.2l4.2-2.4c.3-.2.4-.6.2-.9l-3.1-6.2Zm-4.3 2.4-1 1.5c-1 1.5.1 3.6 1.9 3.6l.1-1.6c-.6 0-1-.7-.6-1.2l.9-1.4-1.3-.9Z"
        fill="var(--color-text)"
      />
    </LogoFrame>
  );
}

export function PostHogLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <rect x="1" y="13" width="9" height="9" rx="1" fill="#f9bd2b" />
      <rect x="12" y="13" width="9" height="9" rx="1" fill="#1d4aff" />
      <rect x="1" y="2" width="9" height="9" rx="1" fill="#f54e00" />
      <path d="M12 2h9v9h-9z" fill="#1d4aff" opacity="0.35" />
    </LogoFrame>
  );
}

export function ClaudeLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#d97757" />
      <path
        d="M7.4 15.8 10.9 7h2.3l3.5 8.8h-2.1l-.7-1.9h-3.8l-.7 1.9H7.4Zm3.3-3.6h2.6L12 8.9l-1.3 3.3Z"
        fill="#ffffff"
      />
    </LogoFrame>
  );
}

export function KofiLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M3 5h14.2c3.2 0 5.8 1.9 5.8 4.9 0 3.1-2.4 5.1-5.6 5.1h-.9a5 5 0 0 1-4.9 4H8a5 5 0 0 1-5-5V5Z"
        fill="#ff5e5b"
      />
      <path d="M16.6 8.2h.9c1.2 0 2 .6 2 1.6 0 1.1-.9 1.7-2 1.7h-.9V8.2Z" fill="#ffffff" />
      <path
        d="M7.3 8.1c.9-.7 2.1-.3 2.4.7.3-1 1.5-1.4 2.4-.7.8.6.8 1.8.1 2.6L9.7 13l-2.5-2.3c-.7-.8-.7-2 .1-2.6Z"
        fill="#ffffff"
      />
    </LogoFrame>
  );
}

export function WebPushLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M12 2.5a6.4 6.4 0 0 1 6.4 6.4v4l1.7 2.9a.9.9 0 0 1-.8 1.4H4.7a.9.9 0 0 1-.8-1.4l1.7-2.9v-4A6.4 6.4 0 0 1 12 2.5Z"
        fill="#7b61ff"
      />
      <path d="M9.6 19.1h4.8a2.4 2.4 0 0 1-4.8 0Z" fill="#7b61ff" />
    </LogoFrame>
  );
}

export function AnthropicLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M17.3 3.7h-3.6l6.5 16.6h3.6L17.3 3.7Zm-10.6 0L0.2 20.3h3.7l1.3-3.5h6.8l1.3 3.5h3.7L10.5 3.7H6.7Zm-0.3 10L8.6 8l2.2 5.7H6.4Z"
        fill="#d97757"
      />
    </LogoFrame>
  );
}

export function SonarLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <g fill="none" stroke="#fd3456" strokeWidth="2.1" strokeLinecap="round">
        <path d="M3 20.5A17.5 17.5 0 0 1 20.5 3" />
        <path d="M3 14.2A11.2 11.2 0 0 1 14.2 3" opacity="0.75" />
        <path d="M3 8A5 5 0 0 1 8 3" opacity="0.5" />
      </g>
    </LogoFrame>
  );
}

export function ResendLogo(props: Readonly<LogoProps>) {
  return (
    <LogoFrame {...props} viewBox="0 0 24 24">
      <path
        d="M4 3h8.1c3.3 0 5.6 1.9 5.6 4.9 0 2.2-1.2 3.8-3.2 4.5L19 21h-4.3l-3.9-7.7H8V21H4V3Zm4 3.3v4.4h3.6c1.5 0 2.4-.8 2.4-2.2s-.9-2.2-2.4-2.2H8Z"
        fill="var(--color-text)"
      />
    </LogoFrame>
  );
}
