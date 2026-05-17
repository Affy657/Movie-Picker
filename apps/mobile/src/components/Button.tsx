import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: Props) {
  const { palette } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? palette.primary
      : variant === 'danger'
        ? palette.surface
        : variant === 'secondary'
          ? palette.surface
          : 'transparent';

  const fg =
    variant === 'primary'
      ? palette.primaryContrast
      : variant === 'danger'
        ? palette.error
        : palette.text;

  const border =
    variant === 'ghost' ? 'transparent' : variant === 'primary' ? palette.primary : palette.border;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 10,
          minHeight: 42,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.55 : 1,
          transform: [{ translateY: pressed && !isDisabled ? -1 : 0 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          shadowColor: '#0f172a',
          shadowOpacity: variant === 'ghost' ? 0 : pressed ? 0.12 : 0.06,
          shadowRadius: pressed ? 6 : 2,
          shadowOffset: { width: 0, height: pressed ? 4 : 1 },
          elevation: variant === 'ghost' ? 0 : pressed ? 4 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text
          style={{
            color: fg,
            fontSize: 15,
            fontWeight: '600',
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
