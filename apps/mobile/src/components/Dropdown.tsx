import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Text } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  accessibilityHint,
}: Props<T>) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  if (__DEV__ && !current) {
    console.warn(`[Dropdown] value "${value}" not in options`);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint ?? 'Ouvre la liste des options'}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: palette.text, fontSize: 15, fontWeight: '500' }}>
          {current?.label ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Pressable
            onPress={() => {}}
            android_ripple={null}
            style={{
              backgroundColor: palette.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: palette.borderSubtle,
              overflow: 'hidden',
            }}
          >
            {options.map((opt, idx) => {
              const selected = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: palette.borderSubtle,
                    backgroundColor: pressed ? palette.badgeMeBg : 'transparent',
                  })}
                >
                  <Text
                    style={{
                      color: selected ? palette.primary : palette.text,
                      fontSize: 15,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={palette.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
