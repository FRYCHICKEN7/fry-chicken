import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Minus, Plus, Trash2, Gift } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { CartItem } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export default function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  
  const productPrice = item.isPrizeRedemption ? 0 : item.product.price;
  const extrasPrice = item.extras.reduce((sum, e) => sum + e.product.price * e.quantity, 0);
  const itemTotal = (productPrice + extrasPrice) * item.quantity;

  return (
    <View style={styles.container}>
      <Image source={{ uri: item.product.image }} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameContainer}>
            {item.isPrizeRedemption && (
              <View style={styles.prizeTag}>
                <Gift size={12} color={colors.white} />
                <Text style={styles.prizeTagText}>PREMIO</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>
              {item.product.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            style={styles.removeButton}
          >
            <Trash2 size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {item.selectedDrink && (
          <Text style={styles.extra}>+ {item.selectedDrink.name}</Text>
        )}
        {item.extras.map((extra, index) => (
          <Text key={index} style={styles.extra}>
            + {extra.quantity}x {extra.product.name}
          </Text>
        ))}
        {item.notes && (
          <Text style={styles.notes}>Nota: {item.notes}</Text>
        )}

        <View style={styles.footer}>
          <View>
            {item.isPrizeRedemption && (
              <Text style={styles.originalPrice}>L. {formatPrice(item.product.price)}</Text>
            )}
            <Text style={styles.price}>
              {item.isPrizeRedemption && itemTotal === 0 ? 'GRATIS' : `L. ${formatPrice(itemTotal)}`}
            </Text>
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
            >
              <Minus size={16} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: 100,
    height: '100%',
    minHeight: 120,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  prizeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  prizeTagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    padding: 4,
  },
  extra: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  notes: {
    color: colors.primary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  originalPrice: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  price: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: colors.surfaceLight,
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
});
