import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Brand } from '@/constants/theme';

type BrandButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
};

export function BrandButton({ title, disabled, style, ...rest }: BrandButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
      ]}
      {...rest}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Brand.radius,
    backgroundColor: Brand.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: Brand.burgundy,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
