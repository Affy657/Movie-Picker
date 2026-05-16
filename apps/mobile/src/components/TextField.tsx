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
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({ label, error, containerStyle, onFocus, onBlur, ...rest }: Props) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <Text style={{ color: palette.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
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
          borderColor: error ? palette.error : focused ? palette.primary : palette.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: palette.text,
          fontSize: 16,
        }}
      />
      {error ? (
        <Text style={{ color: palette.error, fontSize: 13 }}>{error}</Text>
      ) : null}
    </View>
  );
}
