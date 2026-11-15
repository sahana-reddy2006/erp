import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export function SplashScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.logoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Svg width={56} height={56} viewBox="0 0 40 40" fill="none">
          <Rect width={40} height={40} rx={10} fill={colors.accent} />
          <Path
            d="M11 28V12H15.2V19.1L22.1 12H27.4L19.6 19.8L28 28H22.5L15.2 20.6V28H11Z"
            fill="#FFFFFF"
          />
          <Rect x={25} y={12} width={4} height={4} rx={1} fill="#A7F3D0" />
        </Svg>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>KinLedger</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Family Finance ERP</Text>
      <ActivityIndicator size="small" color={colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBox: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  spinner: {
    marginTop: 28,
  },
});
