import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type ListRowProps = {
  icon?: IconName;
  label: string;
  hint?: string;
  showChevron?: boolean;
  onPress?: (e: GestureResponderEvent) => void;
};

export function ListRow({ icon, label, hint, showChevron = true, onPress }: ListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <MaterialIcons name={icon} size={22} color={Brand.beigeMuted} style={styles.icon} />
      ) : null}
      <View style={styles.labelWrap}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {hint ? <ThemedText style={styles.hint}>{hint}</ThemedText> : null}
      </View>
      {showChevron ? (
        <MaterialIcons name="chevron-right" size={22} color={Brand.beigeMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.burgundyLight,
  },
  pressed: {
    backgroundColor: Brand.burgundyLight,
  },
  icon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: Brand.beigeMuted,
    marginTop: 2,
  },
});
