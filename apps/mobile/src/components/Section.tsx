import { Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Aligné `.section h2` web : carte surface + heading 1.2rem 700. */
export function Section({ title, children, style }: Props) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.surface,
          borderColor: palette.borderSubtle,
          borderWidth: 1,
          borderRadius: 16,
          padding: 18,
          gap: 12,
          shadowColor: '#0f172a',
          shadowOpacity: 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        style,
      ]}
    >
      {title ? (
        <Text
          style={{
            color: palette.sectionHeading,
            fontSize: 18,
            fontWeight: '700',
            letterSpacing: -0.15,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
