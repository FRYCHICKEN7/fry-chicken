import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { CheckCircle, Database, MapPin, Building2, Navigation } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { firebaseService } from '@/services/firebase-service';
import { Municipality, Branch, DeliveryZone } from '@/types';

interface ZoneData {
  name: string;
  price: number;
}

interface MunicipalityData {
  nombre: string;
  sucursales: string[];
  zonas: Record<string, ZoneData[]>;
}

const MUNICIPALITIES_DATA: MunicipalityData[] = [
  {
    nombre: 'Choloma',
    sucursales: ['Lopez', 'Centro', 'Surtidora', 'Altara'],
    zonas: {
      Lopez: [
        { name: 'El Chaparro', price: 30 },
        { name: 'Lopez Norte', price: 25 },
        { name: 'Lopez Centro', price: 20 },
        { name: 'Lopez Sur', price: 25 },
      ],
      Centro: [
        { name: 'Centro Choloma', price: 20 },
        { name: 'Col. Kennedy', price: 25 },
        { name: 'El Sauce', price: 30 },
        { name: 'La Jutosa', price: 35 },
      ],
      Surtidora: [
        { name: 'Surtidora Norte', price: 20 },
        { name: 'Surtidora Centro', price: 25 },
        { name: 'Col. Moderna', price: 30 },
        { name: 'Zona Industrial', price: 35 },
      ],
      Altara: [
        { name: 'Altara Centro', price: 20 },
        { name: 'Col. Las Américas', price: 25 },
        { name: 'Residencial Altara', price: 30 },
        { name: 'Los Pinos', price: 35 },
      ],
    },
  },
  {
    nombre: 'San Pedro Sula',
    sucursales: [],
    zonas: {},
  },
  {
    nombre: 'Villanueva',
    sucursales: [],
    zonas: {},
  },
  {
    nombre: 'Potrerillos',
    sucursales: [],
    zonas: {},
  },
];

export default function InitializeDataScreen() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const addStatus = (message: string) => {
    console.log('📝', message);
    setStatus(prev => [...prev, message]);
  };

  const handleInitialize = async () => {
    Alert.alert(
      'Confirmar inicialización',
      '¿Estás seguro de inicializar los datos? Esto creará municipios, asignará sucursales y configurará zonas de envío.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Inicializar',
          onPress: async () => {
            setLoading(true);
            setStatus([]);
            setSuccess(false);

            try {
              addStatus('🚀 Iniciando proceso de inicialización...');

              // Obtener todas las sucursales existentes
              addStatus('📥 Obteniendo sucursales existentes...');
              const branches = await new Promise<Branch[]>((resolve) => {
                const unsubscribe = firebaseService.branches.getAll((data) => {
                  unsubscribe();
                  resolve(data);
                });
              });
              addStatus(`✅ Se encontraron ${branches.length} sucursales`);

              // Crear un mapa de código a ID de sucursal
              const branchCodeToId: Record<string, string> = {};
              branches.forEach(branch => {
                branchCodeToId[branch.code] = branch.id;
              });

              // Crear municipios
              addStatus('🏙️ Creando municipios...');
              let municipiosCreados = 0;
              let zonasCreadas = 0;

              for (const munData of MUNICIPALITIES_DATA) {
                // Crear el municipio
                const municipioId = `mun_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                
                // Encontrar IDs de sucursales asignadas
                const sucursalesAsignadas: string[] = [];
                for (const codigo of munData.sucursales) {
                  const branchId = branchCodeToId[codigo];
                  if (branchId) {
                    sucursalesAsignadas.push(branchId);
                  } else {
                    addStatus(`⚠️ No se encontró sucursal con código: ${codigo}`);
                  }
                }

                const municipio: Municipality = {
                  id: municipioId,
                  nombre: munData.nombre,
                  activo: true,
                  sucursalesAsignadas,
                  createdAt: new Date().toISOString(),
                };

                await firebaseService.municipalities.create(municipio);
                municipiosCreados++;
                addStatus(`✅ Municipio creado: ${munData.nombre} (${sucursalesAsignadas.length} sucursales)`);

                // Actualizar cada sucursal con el municipioId
                for (const branchId of sucursalesAsignadas) {
                  await firebaseService.branches.update(branchId, { municipioId });
                }

                // Crear zonas de envío para cada sucursal
                for (const codigo of munData.sucursales) {
                  const branchId = branchCodeToId[codigo];
                  if (!branchId) continue;

                  const zonasData = munData.zonas[codigo] || [];
                  
                  if (zonasData.length > 0) {
                    // Obtener la sucursal actual para preservar zonas existentes
                    const currentBranch = branches.find(b => b.id === branchId);
                    const existingZones = currentBranch?.deliveryZones || [];

                    // Crear nuevas zonas
                    const newZones: DeliveryZone[] = zonasData.map((zona: ZoneData) => ({
                      id: `zone_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                      name: zona.name,
                      price: zona.price,
                      sucursalId: branchId,
                      municipioId,
                    }));

                    // Combinar con zonas existentes
                    const allZones = [...existingZones, ...newZones];

                    // Actualizar sucursal con todas las zonas
                    await firebaseService.branches.update(branchId, {
                      deliveryZones: allZones,
                    });

                    zonasCreadas += newZones.length;
                    addStatus(`  📍 ${newZones.length} zonas creadas para ${codigo}`);
                  }
                }
              }

              addStatus('');
              addStatus('🎉 ¡Inicialización completada exitosamente!');
              addStatus(`📊 Resumen:`);
              addStatus(`   • ${municipiosCreados} municipios creados`);
              addStatus(`   • ${zonasCreadas} zonas de envío creadas`);
              
              setSuccess(true);
              
              setTimeout(() => {
                Alert.alert(
                  'Éxito',
                  `Se crearon ${zonasCreadas} zonas de envío.`,
                  [
                    {
                      text: 'Ver Zonas',
                      onPress: () => router.push('/admin/delivery-zones' as any),
                    },
                    { text: 'OK' },
                  ]
                );
              }, 500);

            } catch (error: any) {
              console.error('❌ Error durante la inicialización:', error);
              addStatus('');
              addStatus('❌ ERROR: ' + (error.message || 'Error desconocido'));
              Alert.alert('Error', error.message || 'No se pudo completar la inicialización');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Inicializar Datos' }} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Database size={64} color={Colors.primary} />
          <Text style={styles.title}>Inicializar Datos del Sistema</Text>
          <Text style={styles.description}>
            Este proceso creará los municipios, asignará sucursales y configurará las zonas de envío.
          </Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <MapPin size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Municipios</Text>
              <Text style={styles.infoText}>
                Se crearán {MUNICIPALITIES_DATA.length} municipios (Choloma, San Pedro Sula, Villanueva, Potrerillos)
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Building2 size={24} color={Colors.success} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Sucursales</Text>
              <Text style={styles.infoText}>
                Se asignarán las sucursales existentes a sus municipios correspondientes
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Navigation size={24} color={Colors.accent} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Zonas de Envío</Text>
              <Text style={styles.infoText}>
                Se configurarán zonas de envío con sus precios para cada sucursal
              </Text>
            </View>
          </View>
        </View>

        {status.length > 0 && (
          <View style={styles.logSection}>
            <Text style={styles.logTitle}>Registro de Proceso:</Text>
            <View style={styles.logContainer}>
              {status.map((msg, index) => (
                <Text key={index} style={styles.logText}>
                  {msg}
                </Text>
              ))}
            </View>
          </View>
        )}

        {!loading && !success && (
          <TouchableOpacity style={styles.initButton} onPress={handleInitialize}>
            <Database size={20} color={Colors.secondary} />
            <Text style={styles.initButtonText}>Inicializar Datos</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <CheckCircle size={48} color={Colors.success} />
            <Text style={styles.successText}>¡Datos inicializados correctamente!</Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoSection: {
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  logSection: {
    padding: 16,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  logContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'monospace' as any,
    lineHeight: 20,
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  initButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    padding: 32,
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    marginTop: 16,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 32,
  },
});
