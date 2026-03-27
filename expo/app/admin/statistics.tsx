import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  Truck, 
  Clock, 
  CheckCircle,
  DollarSign,
  Award,
  Calendar,
  Store,
  Medal,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useData } from '@/providers/DataProvider';
import React, { useState } from 'react';

export default function StatisticsScreen() {
  const { colors } = useTheme();
  const { getStats, orders, branches, deliveryUsers } = useData();
  const stats = getStats();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const getDailySalesByBranch = () => {
    const today = new Date().toISOString().split('T')[0];
    const salesByBranch: Record<string, { name: string; total: number; orders: number }> = {};
    
    branches.forEach(branch => {
      salesByBranch[branch.id] = { name: branch.name, total: 0, orders: 0 };
    });

    orders.forEach(order => {
      const orderDate = order.createdAt.split('T')[0];
      if (orderDate === today && salesByBranch[order.branchId]) {
        salesByBranch[order.branchId].total += order.total;
        salesByBranch[order.branchId].orders += 1;
      }
    });

    return Object.values(salesByBranch).sort((a, b) => b.total - a.total);
  };

  const getTopDeliveries = () => {
    const deliveryStats: Record<string, { name: string; deliveries: number; rating: number }> = {};
    
    deliveryUsers
      .filter(u => u.status === 'approved')
      .forEach(user => {
        deliveryStats[user.id] = { name: user.name, deliveries: 0, rating: 4.5 };
      });

    orders
      .filter(o => o.deliveryId && o.status === 'delivered')
      .forEach(order => {
        if (order.deliveryId && deliveryStats[order.deliveryId]) {
          deliveryStats[order.deliveryId].deliveries += 1;
        }
      });

    return Object.values(deliveryStats)
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);
  };

  const dailySales = getDailySalesByBranch();
  const topDeliveries = getTopDeliveries();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Estadísticas' }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Panel de Estadísticas</Text>
          <Text style={styles.headerSubtitle}>Resumen general del negocio</Text>
        </View>

        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardLarge]}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <DollarSign size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>L. {stats.totalSales.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Ventas Totales</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <ShoppingBag size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.accent + '20' }]}>
              <Clock size={20} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
              <CheckCircle size={20} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F6' + '20' }]}>
              <Users size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.totalCustomers}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Truck size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
            <Text style={styles.statLabel}>Entregas</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Productos Más Vendidos</Text>
          </View>
          {stats.topProducts.map((product, index) => (
            <View key={index} style={styles.rankItem}>
              <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.primary : colors.surfaceLight }]}>
                <Text style={[styles.rankNumber, { color: index === 0 ? colors.secondary : colors.textSecondary }]}>
                  #{index + 1}
                </Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{product.name}</Text>
                <Text style={styles.rankStat}>{product.quantity} unidades vendidas</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Store size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Ventas Diarias por Sucursal</Text>
          </View>
          {dailySales.length > 0 ? (
            dailySales.map((branch, index) => (
              <View key={index} style={styles.branchStat}>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <Text style={styles.branchOrders}>{branch.orders} pedidos</Text>
                </View>
                <View style={styles.branchBarContainer}>
                  <View 
                    style={[
                      styles.branchBar, 
                      { width: `${dailySales[0].total > 0 ? (branch.total / dailySales[0].total) * 100 : 0}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.branchTotal}>L. {branch.total.toLocaleString()}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Sin ventas registradas hoy</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Medal size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Top Repartidores</Text>
          </View>
          {topDeliveries.length > 0 ? (
            topDeliveries.map((delivery, index) => (
              <View key={index} style={styles.deliveryItem}>
                <View style={[
                  styles.deliveryRank,
                  { backgroundColor: index === 0 ? colors.primary : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.surfaceLight }
                ]}>
                  <Text style={[
                    styles.deliveryRankText,
                    { color: index < 3 ? colors.secondary : colors.textSecondary }
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryName}>{delivery.name}</Text>
                  <Text style={styles.deliveryStats}>
                    {delivery.deliveries} entregas • ⭐ {delivery.rating.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.deliveryBadge}>
                  <Truck size={16} color={colors.success} />
                  <Text style={styles.deliveryBadgeText}>{delivery.deliveries}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Sin repartidores activos</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={colors.success} />
            <Text style={styles.sectionTitle}>Ventas Totales por Sucursal</Text>
          </View>
          {stats.salesByBranch.map((branch, index) => (
            <View key={index} style={styles.branchStat}>
              <View style={styles.branchInfo}>
                <Text style={styles.branchName}>{branch.branchName}</Text>
              </View>
              <View style={styles.branchBarContainer}>
                <View 
                  style={[
                    styles.branchBar, 
                    { width: `${(branch.total / Math.max(...stats.salesByBranch.map(b => b.total))) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.branchTotal}>L. {branch.total.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Calendar size={14} color={colors.textMuted} />
          <Text style={styles.footerText}>Datos actualizados en tiempo real</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: colors.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  statCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statCardLarge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
    paddingVertical: 20,
    marginBottom: 6,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  rankStat: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  branchStat: {
    marginBottom: 14,
  },
  branchInfo: {
    marginBottom: 6,
  },
  branchName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  branchOrders: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  branchBarContainer: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  branchBar: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  branchTotal: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.success,
    marginTop: 4,
    textAlign: 'right',
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deliveryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deliveryRankText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  deliveryStats: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  deliveryBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.success,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
