import { useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { ThemeMode } from '@/types';
import { useData } from './DataProvider';

const THEME_KEY = 'fry_chicken_theme';
const THEME_AUTO_KEY = 'fry_chicken_theme_auto';

export const lightColors = {
  primary: '#FCBA1D',
  secondary: '#000000',
  accent: '#D01714',
  success: '#21A118',
  white: '#FFFFFF',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: '#F0F0F0',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  whatsapp: '#25D366',
  addToCartButton: '#2E7D32',
  addToCartText: '#000000',
  error: '#FF4444',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const darkColors = {
  primary: '#FCBA1D',
  secondary: '#000000',
  accent: '#D01714',
  success: '#21A118',
  white: '#FFFFFF',
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  border: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#707070',
  whatsapp: '#25D366',
  addToCartButton: '#2E7D32',
  addToCartText: '#000000',
  error: '#FF4444',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const { themeSettings } = useData();
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (isAutoMode) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        console.log('System theme changed:', colorScheme);
        setTheme(colorScheme === 'dark' ? 'dark' : 'light');
      });
      return () => subscription.remove();
    }
  }, [isAutoMode]);

  const loadTheme = async () => {
    try {
      const [storedTheme, storedAuto] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(THEME_AUTO_KEY),
      ]);
      
      const autoMode = storedAuto !== 'false';
      setIsAutoMode(autoMode);
      
      if (autoMode) {
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === 'dark' ? 'dark' : 'light');
        console.log('Using system theme:', systemTheme);
      } else if (storedTheme) {
        setTheme(storedTheme as ThemeMode);
        console.log('Using stored theme:', storedTheme);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setIsAutoMode(false);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
      await AsyncStorage.setItem(THEME_AUTO_KEY, 'false');
      console.log('Theme saved:', newTheme);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setTheme(mode);
    setIsAutoMode(false);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
      await AsyncStorage.setItem(THEME_AUTO_KEY, 'false');
      console.log('Theme saved:', mode);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const enableAutoTheme = async () => {
    setIsAutoMode(true);
    const systemTheme = Appearance.getColorScheme();
    setTheme(systemTheme === 'dark' ? 'dark' : 'light');
    try {
      await AsyncStorage.setItem(THEME_AUTO_KEY, 'true');
      console.log('Auto theme enabled');
    } catch (error) {
      console.log('Error enabling auto theme:', error);
    }
  };

  const baseColors = theme === 'dark' ? darkColors : lightColors;
  
  const colors = theme === 'dark' 
    ? {
        ...darkColors,
        whatsapp: themeSettings?.whatsappButtonColor || darkColors.whatsapp,
        addToCartButton: themeSettings?.addToCartButtonColor || darkColors.addToCartButton,
        addToCartText: '#000000',
      }
    : {
        ...baseColors,
        primary: themeSettings?.primaryColor || baseColors.primary,
        secondary: themeSettings?.secondaryColor || baseColors.secondary,
        accent: themeSettings?.accentColor || baseColors.accent,
        success: themeSettings?.successColor || baseColors.success,
        background: themeSettings?.backgroundColor || baseColors.background,
        surface: themeSettings?.surfaceColor || baseColors.surface,
        surfaceLight: '#F0F0F0',
        textPrimary: themeSettings?.textPrimaryColor || baseColors.textPrimary,
        textSecondary: themeSettings?.textSecondaryColor || baseColors.textSecondary,
        whatsapp: themeSettings?.whatsappButtonColor || baseColors.whatsapp,
        addToCartButton: themeSettings?.addToCartButtonColor || baseColors.addToCartButton,
        addToCartText: '#000000',
      };

  return {
    theme,
    colors,
    isDark: theme === 'dark',
    isAutoMode,
    toggleTheme,
    setThemeMode,
    enableAutoTheme,
    isLoading,
  };
});
