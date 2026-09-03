const QR_EXPORT_SIZE = 240;
const QR_EXPORT_SCALE = 4;
const QR_BG_COLOR = '#ffffff';

export function downloadQrPng(container: HTMLElement | null, filename: string): void {
  const svg = container?.querySelector('svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onerror = () => URL.revokeObjectURL(svgUrl);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = QR_EXPORT_SIZE * QR_EXPORT_SCALE;
    canvas.height = QR_EXPORT_SIZE * QR_EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    URL.revokeObjectURL(svgUrl);
    if (!ctx) return;
    ctx.fillStyle = QR_BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    }, 'image/png');
  };
  img.src = svgUrl;
}
