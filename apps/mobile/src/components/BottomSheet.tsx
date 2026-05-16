import { Modal, Pressable, Text, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = ViewProps & {
  visible: boolean;
  onClose: () => void;
  title?: string;
};

/**
 * Modal plein écran utilisée comme bottom-sheet "lite" : pas de drag-handle,
 * fermeture via le bouton "✕" ou via le backdrop. À remplacer par une lib
 * dédiée (@gorhom/bottom-sheet) si l'UX devient prioritaire.
 */
export function BottomSheet({ visible, onClose, title, children, style }: Props) {
  const { palette } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: palette.bg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '90%',
          }}
        >
          <SafeAreaView edges={['bottom']}>
            <View
              style={[
                {
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 24,
                  gap: 16,
                },
                style,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700', flex: 1 }}>
                  {title}
                </Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Text style={{ color: palette.textMuted, fontSize: 22 }}>✕</Text>
                </Pressable>
              </View>
              {children}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
