import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = ScrollViewProps & {
  scrollable?: boolean;
  padded?: boolean;
};

export function Screen({ scrollable = true, padded = true, children, ...rest }: Props) {
  const { palette } = useTheme();

  const inner = <View style={{ flex: 1, gap: 16, padding: padded ? 20 : 0 }}>{children}</View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top', 'bottom']}>
      {scrollable ? (
        <ScrollView
          {...rest}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
