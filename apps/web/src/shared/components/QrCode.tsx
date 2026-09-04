import QRCodeImport from 'react-qr-code';

const QR_SIZE = 240;
const QR_BG_COLOR = '#ffffff';
const QR_FG_COLOR = '#111827';

const QRCode =
  typeof QRCodeImport === 'object' &&
  QRCodeImport !== null &&
  'QRCode' in QRCodeImport &&
  !('$$typeof' in QRCodeImport)
    ? (QRCodeImport as unknown as { QRCode: typeof QRCodeImport }).QRCode
    : QRCodeImport;

interface QrCodeProps {
  value: string;
  title: string;
}

export default function QrCode({ value, title }: Readonly<QrCodeProps>) {
  return (
    <QRCode
      value={value}
      size={QR_SIZE}
      level="M"
      title={title}
      bgColor={QR_BG_COLOR}
      fgColor={QR_FG_COLOR}
    />
  );
}
