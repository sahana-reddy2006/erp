import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErpProvider, useErp } from './src/context/ErpContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { BudgetsAndGoalsScreen } from './src/screens/BudgetsAndGoalsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ReportsAndFamilyScreen } from './src/screens/ReportsAndFamilyScreen';
import { SplashScreen } from './src/screens/SplashScreen';

const Tab = createBottomTabNavigator();

function RootNavigator() {
  const { booting, user } = useErp();
  const { colors, mode } = useTheme();

  if (booting) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }: { route: { name: string } }) => ({
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ color, size }: { color: string; size: number }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              Home: 'home-outline',
              Ledger: 'list-outline',
              Budgets: 'pie-chart-outline',
              Family: 'people-outline',
              Profile: 'person-circle-outline',
            };
            return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={DashboardScreen} />
        <Tab.Screen name="Ledger" component={LedgerScreen} />
        <Tab.Screen name="Budgets" component={BudgetsAndGoalsScreen} options={{ title: 'Budgets & Goals' }} />
        <Tab.Screen name="Family" component={ReportsAndFamilyScreen} options={{ title: 'Family & Reports' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErpProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </ErpProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
