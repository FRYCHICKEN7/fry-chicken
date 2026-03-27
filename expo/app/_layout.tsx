import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Platform, LogBox } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { CartProvider } from "@/providers/CartProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";

import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { colors } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Atrás",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product/[id]"
        options={{
          presentation: "modal",
          headerTitle: "Personalizar",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          presentation: "modal",
          headerTitle: "Iniciar Sesión",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="customer-login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="customer-register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="complete-profile"
        options={{
          headerTitle: "Completar Perfil",
          headerStyle: { backgroundColor: colors.surface },
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="checkout"
        options={{
          headerTitle: "Finalizar Pedido",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="complaints"
        options={{
          headerTitle: "Quejas y Sugerencias",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          headerTitle: "Centro de Ayuda",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/branches"
        options={{
          headerTitle: "Gestionar Sucursales",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/zones"
        options={{
          headerTitle: "Zonas de Envío",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/statistics"
        options={{
          headerTitle: "Estadísticas",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/products"
        options={{
          headerTitle: "Gestionar Productos",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/coupons"
        options={{
          headerTitle: "Gestionar Cupones",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/delivery"
        options={{
          headerTitle: "Gestionar Repartidores",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/complaints-received"
        options={{
          headerTitle: "Quejas Recibidas",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="delivery-register"
        options={{
          headerTitle: "Registro de Repartidor",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/bank-accounts"
        options={{
          headerTitle: "Cuentas Bancarias",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/promotions"
        options={{
          headerTitle: "Gestionar Promociones",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/orders"
        options={{
          headerTitle: "Gestionar Pedidos",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="delivery/my-orders"
        options={{
          headerTitle: "Mis Entregas",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerTitle: "Editar Perfil",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/theme-editor"
        options={{
          headerTitle: "Editor de Tema",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/business-hours"
        options={{
          headerTitle: "Horarios de Atención",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/marketing-popup"
        options={{
          headerTitle: "Popup de Marketing",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/backup"
        options={{
          headerTitle: "Respaldo de Datos",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/import-products"
        options={{
          headerTitle: "Importar Productos",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          headerTitle: "Políticas de Privacidad",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="terms-and-conditions"
        options={{
          headerTitle: "Términos y Condiciones",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="select-branch"
        options={{
          headerTitle: "Seleccionar Sucursal",
          headerStyle: { backgroundColor: colors.surface },
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="admin/delete-municipalities"
        options={{
          headerTitle: "Eliminar Municipios",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="admin/delivery-zones"
        options={{
          headerTitle: "Zonas de Envío",
          headerStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    
    LogBox.ignoreAllLogs(true);
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataProvider>
            <ThemeProvider>
              <CartProvider>
                <AppContent />
              </CartProvider>
            </ThemeProvider>
          </DataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
