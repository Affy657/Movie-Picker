import { useState } from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Aligné `.input` / `.label` du web :
 * - label : 13px, 600, color section-heading, letter-spacing 0.05
 * - input : border 1.5px, radius 12, min-height 46, padding 10/15
 * - focus : ring color-mix primary 18% (approximé via shadow soft)
 */
export function TextField({
  label,
  error,
  hint,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? palette.error
    : focused
      ? palette.primary
      : palette.border;

  return (
    <View style={[{ gap: 8, marginBottom: 4 }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: palette.sectionHeading,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={palette.placeholder}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          backgroundColor: palette.inputBg,
          borderColor,
          borderWidth: 1.5,
          borderRadius: 12,
          paddingHorizontal: 15,
          paddingVertical: 10,
          minHeight: 46,
          color: palette.text,
          fontSize: 16,
          // Equivalent du focus-ring du web (color-mix primary 18%).
          shadowColor: focused && !error ? palette.primary : 'transparent',
          shadowOpacity: focused && !error ? 0.18 : 0,
          shadowRadius: focused && !error ? 4 : 0,
        }}
      />
      {hint && !error ? (
        <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 18 }}>{hint}</Text>
      ) : null}
      {error ? <Text style={{ color: palette.error, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
