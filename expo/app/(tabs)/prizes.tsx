import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Star } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useData } from '@/providers/DataProvider';
import { useCart } from '@/providers/CartProvider';
import { Product } from '@/types';
import AddToCartSuccessModal from '@/components/AddToCartSuccessModal';

export default function PrizesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { products, pointsSettings, getUserPoints, refreshUserPointsFromFirebase } = useData();
  const { addItem } = useCart();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const userPoints = user ? getUserPoints(user.id) : null;
  const availablePoints = userPoints?.availablePoints || 0;

  const prizeProducts = useMemo(() => {
    if (!pointsSettings.enabled || pointsSettings.redeemableCategories.length === 0) {
      return [];
    }
    
    return products.filter((p) => {
      if (!p.available) return false;
      return pointsSettings.redeemableCategories.includes(p.categoryId);
    });
  }, [products, pointsSettings]);

  const handleRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      await refreshUserPointsFromFirebase(user.id);
    } catch (error) {
      console.error('Error refreshing points:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRedeemPrize = (product: Product) => {
    const pointsRequired = Math.round(product.price * pointsSettings.conversionRate);
    if (availablePoints < pointsRequired) return;

    const prizeProduct = { ...product, pointsRequired };
    addItem(prizeProduct, undefined, [], undefined, true);
    setShowSuccessModal(true);
  };

  const canRedeem = (product: Product): boolean => {
    const pointsRequired = Math.round(product.price * pointsSettings.conversionRate);
    return availablePoints >= pointsRequired;
  };

  const getPointsNeeded = (product: Product): number => {
    const pointsRequired = Math.round(product.price * pointsSettings.conversionRate);
    return Math.max(0, pointsRequired - availablePoints);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Premios',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
          }}
        />
        <View style={styles.centerContent}>
          <Gift size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Inicia sesión para ver tus premios
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Premios',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.pointsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.pointsHeader}>
            <Star size={32} color={colors.primary} fill={colors.primary} />
            <View style={styles.pointsInfo}>
              <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>
                Tus puntos disponibles
              </Text>
              <Text style={[styles.pointsValue, { color: colors.textPrimary }]}>
                {availablePoints.toLocaleString()} puntos
              </Text>
            </View>
          </View>
          <Text style={[styles.pointsHint, { color: colors.textMuted }]}>
            Canjea tus puntos por productos gratis
          </Text>
        </View>

        <View style={styles.productsContainer}>
          {prizeProducts.length === 0 ? (
            <View style={styles.centerContent}>
              <Gift size={64} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No hay premios disponibles
              </Text>
            </View>
          ) : (
            prizeProducts.map((product) => {
              const redeemable = canRedeem(product);
              const pointsNeeded = getPointsNeeded(product);

              return (
                <View
                  key={product.id}
                  style={[
                    styles.prizeCard,
                    { backgroundColor: colors.surface },
                    !redeemable && styles.prizeCardDisabled,
                  ]}
                >
                  <Image
                    source={{ uri: product.image || 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400' }}
                    style={[
                      styles.prizeImage,
                      !redeemable && styles.prizeImageDisabled,
                    ]}
                    resizeMode="cover"
                    defaultSource={require('@/assets/images/icon.png')}
                  />

                  <View style={styles.prizeInfo}>
                    <Text
                      style={[
                        styles.prizeName,
                        { color: redeemable ? colors.textPrimary : colors.textMuted },
                      ]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>

                    <View style={styles.prizePoints}>
                      <Star
                        size={16}
                        color={redeemable ? colors.primary : colors.textMuted}
                        fill={redeemable ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.prizePointsText,
                          { color: redeemable ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {Math.round(product.price * pointsSettings.conversionRate).toLocaleString()} puntos
                      </Text>
                    </View>

                    {redeemable ? (
                      <TouchableOpacity
                        style={[
                          styles.redeemButton,
                          { backgroundColor: '#22C55E' },
                        ]}
                        onPress={() => handleRedeemPrize(product)}
                        activeOpacity={0.7}
                      >
                        <Gift size={18} color="#FFFFFF" />
                        <Text style={[styles.redeemButtonText, { color: '#FFFFFF' }]}>
                          Canjear
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={[
                          styles.lockedButton,
                          { backgroundColor: '#EF4444' },
                        ]}
                      >
                        <Text style={[styles.lockedButtonText, { color: '#FFFFFF' }]}>
                          Te faltan {pointsNeeded.toLocaleString()} puntos
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            ¿Cómo funcionan los premios?
          </Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            • Ganas puntos con cada pedido completado{'\n'}
            • Los productos en color están disponibles para canjear{'\n'}
            • Los productos en gris requieren más puntos{'\n'}
            • Al canjear, solo pagas el envío (si aplica)
          </Text>
        </View>
      </ScrollView>

      <AddToCartSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  pointsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointsInfo: {
    marginLeft: 16,
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  pointsHint: {
    fontSize: 14,
    marginTop: 8,
  },
  productsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  prizeCard: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  prizeCardDisabled: {
    opacity: 0.6,
  },
  prizeImage: {
    width: 120,
    height: 120,
  },
  prizeImageDisabled: {
    opacity: 0.4,
  },
  prizeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  prizeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  prizePoints: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  prizePointsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 6,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 6,
  },
  lockedButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  lockedButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  infoSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
