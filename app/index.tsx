import { useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

const SLIDES = [
  {
    eyebrow: 'Drive with Kyra',
    title: 'Earn safely.\nDrive on your terms.',
    body: 'Kyra is a women-only mobility platform. Flexible hours, transparent fares, real safety.',
  },
  {
    eyebrow: 'Auto + Bike-taxi',
    title: 'By her,\nfor her.',
    body: 'Choose what you drive. Auto-rickshaw or bike-taxi — own or Kyra-leased. We support both.',
  },
  {
    eyebrow: 'Bengaluru first',
    title: 'Join the women-\nonly road.',
    body: 'Rider and driver are both verified women. Aadhaar + selfie + OTP — every account, every time.',
  },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(next);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.logoRow}>
        <Image
          source={require('@/assets/images/kyra-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText style={styles.logoTag}>Driver</ThemedText>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <ThemedText style={styles.eyebrow}>{slide.eyebrow}</ThemedText>
            <ThemedText type="title" style={styles.slideTitle}>
              {slide.title}
            </ThemedText>
            <ThemedText style={styles.slideBody}>{slide.body}</ThemedText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <BrandButton
          title="Start Driving"
          style={styles.cta}
          onPress={() => router.push('/language')}
        />
        <Pressable
          onPress={() => router.push('/sign-up')}
          hitSlop={8}
          style={styles.signInLink}
        >
          <ThemedText style={styles.signInText}>
            Already a Kyra driver? <ThemedText style={styles.signInTextBold}>Sign in</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.burgundy,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 10,
  },
  logo: {
    width: 96,
    height: 36,
  },
  logoTag: {
    color: Brand.gold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pager: {
    flexGrow: 0,
    marginTop: 32,
  },
  slide: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  eyebrow: {
    color: Brand.gold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  slideTitle: {
    fontSize: 36,
    lineHeight: 44,
    marginBottom: 16,
  },
  slideBody: {
    color: Brand.beigeMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Brand.burgundyLight,
  },
  dotActive: {
    backgroundColor: Brand.beige,
    width: 22,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  cta: {
    width: '100%',
  },
  signInLink: {
    alignSelf: 'center',
  },
  signInText: {
    color: Brand.beigeMuted,
    fontSize: 14,
  },
  signInTextBold: {
    color: Brand.beige,
    fontWeight: '600',
  },
});
