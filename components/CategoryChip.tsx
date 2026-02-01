import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import {
  Users,
  User,
  Percent,
  PlusCircle,
  Package,
  Citrus,
  CupSoda,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Category } from '@/types';

interface CategoryChipProps {
  category: Category;
  isSelected: boolean;
  onPress: () => void;
}

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  users: Users,
  user: User,
  percent: Percent,
  'plus-circle': PlusCircle,
  'cup-soda': CupSoda,
  citrus: Citrus,
  package: Package,
};

export default function CategoryChip({
  category,
  isSelected,
  onPress,
}: CategoryChipProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const IconComponent = iconMap[category.icon] || Package;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <IconComponent
          size={16}
          color={isSelected ? Colors.secondary : Colors.textSecondary}
        />
        <Text
          style={[styles.chipText, isSelected && styles.chipTextSelected]}
          numberOfLines={1}
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.secondary,
  },
});
