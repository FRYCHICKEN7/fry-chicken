import { Tabs } from "expo-router";
import { Home, ShoppingCart, ClipboardList, User, Truck, Store, Gift } from "lucide-react-native";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";

function CartTabIcon({ color }: { color: string }) {
  const { itemCount } = useCart();
  const { colors } = useTheme();

  return (
    <View>
      <ShoppingCart size={24} color={color} />
      {itemCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeText, { color: colors.white }]}>
            {itemCount > 9 ? "9+" : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isBranchOrDelivery = user?.role === 'branch' || user?.role === 'delivery';
  const isDelivery = user?.role === 'delivery';
  const isBranch = user?.role === 'branch';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          marginBottom: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Menú",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
          href: isBranchOrDelivery ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Carrito",
          tabBarIcon: ({ color }) => <CartTabIcon color={color} />,
          href: isBranchOrDelivery ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
          href: isBranchOrDelivery ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="prizes"
        options={{
          title: "Premios",
          tabBarIcon: ({ color }) => <Gift size={24} color={color} />,
          href: isBranchOrDelivery ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="delivery-orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <Truck size={24} color={color} />,
          href: isDelivery ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="branch-orders"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <Store size={24} color={color} />,
          href: isBranch ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
});
