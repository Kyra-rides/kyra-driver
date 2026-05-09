/**
 * Hold-to-fire SOS button for the driver app. Floats bottom-right.
 *
 * Hold for 1.5s to trigger. Larger guard than the rider variant — drivers
 * are likely interacting with steering/route, so accidental taps are more
 * likely.
 */

import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

import { triggerSOS } from '@/services/sos';

const HOLD_MS = 1500;

type Props = {
  rideId?: string | null;
  onTriggered?: () => void;
};

export function SosButton({ rideId, onTriggered }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy]         = useState(false);
  const [pressing, setPressing] = useState(false);
  const progress                = useRef(new Animated.Value(0)).current;
  const timer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const cancelHold = () => {
    setPressing(false);
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const fire = async () => {
    setBusy(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await triggerSOS(rideId);
      onTriggered?.();
      Alert.alert(t('sos.confirmed_title'), t('sos.confirmed_body'));
    } catch (e) {
      Alert.alert(t('sos.error_title'), t('sos.error_body'));
    } finally {
      setBusy(false);
    }
  };

  const onPressIn = () => {
    if (busy) return;
    setPressing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: false,
    }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      setPressing(false);
      void fire();
    }, HOLD_MS);
  };

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.col}>
        {pressing ? (
          <View style={styles.hint}>
            <Animated.Text style={styles.hintText}>{t('sos.hold_hint')}</Animated.Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sos.button_label')}
          onPressIn={onPressIn}
          onPressOut={cancelHold}
          disabled={busy}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, busy && styles.btnBusy]}
        >
          <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }] }]} />
          <MaterialIcons name="warning" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    zIndex: 50,
  },
  col: {
    alignItems: 'flex-end',
  },
  hint: {
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C4242C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  btnPressed: {
    backgroundColor: '#A41A20',
  },
  btnBusy: {
    opacity: 0.6,
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
  },
});
