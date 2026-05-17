import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useTheme } from '@/features/theme/ThemeContext';

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'http://localhost:5173';

function isUnreachableFromOtherDevices(url: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/.test(url);
}

type Props = {
  slug: string;
  title: string;
  onClose: () => void;
};

export function ShareSheet({ slug, title, onClose }: Props) {
  const { palette } = useTheme();
  const url = `${WEB_BASE.replace(/\/$/, '')}/e/${slug}`;
  const unreachable = isUnreachableFromOtherDevices(url);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    try {
      await Share.share({ message: `${title}\n${url}`, url });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <BottomSheet visible onClose={onClose} title="Partager la soirée">
      <Text style={{ color: palette.textMuted }}>
        Envoie ce lien à tes amis pour qu&apos;ils rejoignent la soirée.
      </Text>

      {unreachable ? (
        <View
          style={{
            backgroundColor: palette.badgeUpcomingBg,
            padding: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: palette.badgeUpcomingText, fontSize: 13 }}>
            ⚠️ L&apos;URL pointe sur ta machine de dev — elle ne fonctionnera pas chez tes amis.
            Configure
            <Text style={{ fontWeight: '700' }}> EXPO_PUBLIC_WEB_BASE_URL </Text>
            avec l&apos;URL publique du site avant de partager.
          </Text>
        </View>
      ) : null}

      <View style={{ alignItems: 'center', gap: 8, padding: 16 }}>
        <View style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 12 }}>
          <QRCode value={url} size={200} />
        </View>
        <Text style={{ color: palette.meta, fontSize: 12 }} numberOfLines={1}>
          {url}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Button
          label={copied ? 'Lien copié ✓' : 'Copier le lien'}
          variant="secondary"
          onPress={copy}
        />
        <Button label="Partager…" onPress={share} />
      </View>
    </BottomSheet>
  );
}
