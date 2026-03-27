import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
} from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useData } from "@/providers/DataProvider";
import { useAuth } from "@/providers/AuthProvider";
import { BranchNotification } from "@/types";

type FilterType = "all" | "unread";

export default function BranchNotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { getBranchNotifications, markNotificationAsRead, getUnreadNotificationsCount } = useData();
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const branchId = user?.branchId || "";
  const notifications = getBranchNotifications(branchId);
  const unreadCount = getUnreadNotificationsCount(branchId);

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") {
      return !notification.read;
    }
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNotificationPress = async (notification: BranchNotification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: BranchNotification["type"]) => {
    switch (type) {
      case "delivery_completed":
        return { Icon: CheckCircle, color: colors.success };
      case "order_rejected":
        return { Icon: XCircle, color: colors.accent };
      case "order_delayed":
        return { Icon: Clock, color: "#F97316" };
      case "order_cancelled":
        return { Icon: AlertTriangle, color: colors.accent };
      default:
        return { Icon: Bell, color: colors.primary };
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Justo ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString("es-HN", { day: "2-digit", month: "short" });
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Notificaciones" }} />

      <View style={styles.header}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "all" && styles.filterButtonTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === "unread" && styles.filterButtonActive]}
            onPress={() => setFilter("unread")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === "unread" && styles.filterButtonTextActive,
              ]}
            >
              No leídas ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          {filter === "unread" ? (
            <BellOff size={64} color={colors.textMuted} />
          ) : (
            <Bell size={64} color={colors.textMuted} />
          )}
          <Text style={styles.emptyTitle}>
            {filter === "unread" ? "Sin notificaciones nuevas" : "Sin notificaciones"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter === "unread"
              ? "Estás al día con todas tus notificaciones"
              : "Aquí aparecerán las notificaciones de entregas, rechazos y más"}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification) => {
              const { Icon, color } = getNotificationIcon(notification.type);
              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
                    <Icon size={24} color={color} />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      {!notification.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <View style={styles.notificationFooter}>
                      <Package size={12} color={colors.textMuted} />
                      <Text style={styles.notificationTime}>
                        {getTimeAgo(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    filterContainer: {
      flexDirection: "row",
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600" as const,
    },
    filterButtonTextActive: {
      color: colors.secondary,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    notificationsList: {
      padding: 16,
      gap: 12,
    },
    notificationCard: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notificationCardUnread: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      gap: 8,
    },
    notificationTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.textPrimary,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    notificationMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    notificationFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    notificationTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    bottomPadding: {
      height: 20,
    },
  });
