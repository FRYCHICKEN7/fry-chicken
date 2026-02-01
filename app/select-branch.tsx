import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Phone, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useData } from '@/providers/DataProvider';

import { Branch } from '@/types';

export default function SelectBranchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { branches, selectBranch, isBranchOpen, getNextOpenTimeForBranch } = useData();


  const filteredBranches = branches;

  const handleSelectBranch = (branch: Branch) => {
    selectBranch(branch.id);
    router.replace('/(tabs)' as any);
  };

  const renderBranchCard = ({ item: branch }: { item: Branch }) => {
    const isOpen = isBranchOpen(branch.id);
    const nextOpenTime = getNextOpenTimeForBranch(branch.id);

    return (
      <TouchableOpacity
        style={[styles.branchCard, { backgroundColor: colors.surface }]}
        onPress={() => handleSelectBranch(branch)}
        activeOpacity={0.7}
      >
        <View style={styles.branchHeader}>
          <View style={styles.branchInfo}>
            <Text style={[styles.branchName, { color: colors.textPrimary }]}>
              {branch.name}
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOpen ? colors.success : colors.accent },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isOpen ? colors.success : colors.accent },
                ]}
              >
                {isOpen ? 'Abierto' : 'Cerrado'}
              </Text>
            </View>
          </View>
          <ChevronRight size={24} color={colors.textMuted} />
        </View>

        {!isOpen && (
          <View style={[styles.closedBanner, { backgroundColor: colors.accent + '15' }]}>
            <Clock size={16} color={colors.accent} />
            <Text style={[styles.closedText, { color: colors.accent }]}>
              Abrimos {nextOpenTime}
            </Text>
          </View>
        )}

        {branch.address && (
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {branch.address}
            </Text>
          </View>
        )}

        {branch.phone && (
          <View style={styles.detailRow}>
            <Phone size={16} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {branch.phone}
            </Text>
          </View>
        )}

        {branch.businessHours && (
          <View style={styles.hoursContainer}>
            <Text style={[styles.hoursTitle, { color: colors.textSecondary }]}>
              Horario:
            </Text>
            {branch.businessHours
              .filter(h => h.isOpen)
              .slice(0, 2)
              .map((hours, index) => {
                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                return (
                  <Text
                    key={index}
                    style={[styles.hoursText, { color: colors.textSecondary }]}
                  >
                    {dayNames[hours.dayOfWeek]}: {formatTime12Hour(hours.openTime)} - {formatTime12Hour(hours.closeTime)}
                  </Text>
                );
              })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://frychickenhn.com/wp-content/uploads/2025/12/Encabezado.jpg' }}
          style={styles.headerImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Selecciona tu Sucursal
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Elige la sucursal más cercana para realizar tu pedido
        </Text>

        <FlatList
          data={filteredBranches}
          renderItem={renderBranchCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      width: '100%',
      height: 120,
      marginBottom: 16,
    },
    headerImage: {
      width: '100%',
      height: '100%',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      marginBottom: 20,
      lineHeight: 20,
    },
    listContent: {
      paddingBottom: 20,
    },
    branchCard: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    branchHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    branchInfo: {
      flex: 1,
    },
    branchName: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: 6,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    closedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    closedText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    detailText: {
      fontSize: 13,
      flex: 1,
    },
    hoursContainer: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    hoursTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    hoursText: {
      fontSize: 12,
      marginTop: 2,
    },
  });
