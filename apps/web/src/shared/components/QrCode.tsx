import { useMemo } from 'react';
import { qrSvgDataUrl } from './qrCodeShapes';

const QR_SIZE = 240;

interface QrCodeProps {
  value: string;
  title: string;
  plain?: boolean;
  className?: string;
}

export default function QrCode({ value, title, plain = false, className }: Readonly<QrCodeProps>) {
  const src = useMemo(() => qrSvgDataUrl(value, QR_SIZE, { plain }), [value, plain]);

  return (
    <img
      src={src}
      alt={title}
      width={QR_SIZE}
      height={QR_SIZE}
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}
