import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { ShoppingCart, MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Product } from '@/types';
import { formatPrice } from '@/lib/formatPrice';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onWhatsApp: (product: Product) => void;
  onProductPress: (product: Product) => void;
}

export default function ProductCard({ 
  product, 
  onAddToCart, 
  onWhatsApp,
  onProductPress
}: ProductCardProps) {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.contentWrapper}>
        <View style={styles.info}>
          <Text style={[styles.name, { color: isDark ? colors.primary : colors.textPrimary }]} numberOfLines={2}>
            {product.name}
          </Text>
          
          {product.description ? (
            <Text style={[styles.description, { color: colors.textPrimary }]} numberOfLines={2}>
              {stripHtml(product.description)}
            </Text>
          ) : null}

          <Text style={[styles.price, { color: colors.textPrimary }]}>L. {formatPrice(product.price)}</Text>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.addToCartButton }, !product.available && styles.disabledButton]}
              onPress={() => onAddToCart(product)}
              disabled={!product.available}
            >
              <ShoppingCart size={18} color={colors.addToCartText} />
              <Text style={[styles.addButtonText, { color: colors.addToCartText }]}>
                Comprar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.whatsappButton, { backgroundColor: colors.whatsapp + '15', borderColor: colors.whatsapp + '30' }]}
              onPress={() => onWhatsApp(product)}
            >
              <MessageCircle size={20} color={colors.whatsapp} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={() => onProductPress(product)}
          activeOpacity={0.8}
        >
          <Image 
            source={{ uri: product.image }} 
            style={styles.image} 
          />

          {!product.available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>No disponible</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  info: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  name: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  price: {
    fontSize: 17,
    fontWeight: '800' as const,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    fontWeight: '700' as const,
    fontSize: 13,
  },
  whatsappButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  comboBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comboBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900' as const,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    color: '#FFFFFF',
    fontWeight: '800' as const,
    fontSize: 14,
  },
});
