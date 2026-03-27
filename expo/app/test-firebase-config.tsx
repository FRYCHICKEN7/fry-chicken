import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

export default function TestFirebaseConfig() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkEnvVar = (name: string, value: any, isRequired: boolean = true) => {
    const exists = !!value;
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    
    let status: 'success' | 'error' | 'warning' = 'success';
    let message = '';
    
    if (!exists || isEmpty) {
      status = isRequired ? 'error' : 'warning';
      message = 'No configurado';
    } else {
      message = `Configurado (${String(value).length} caracteres)`;
      
      if (name.includes('PRIVATE_KEY')) {
        const keyStr = String(value);
        if (!keyStr.includes('BEGIN PRIVATE KEY') && !keyStr.includes('\\n')) {
          status = 'warning';
          message += ' - Posible formato incorrecto';
        }
      }
    }
    
    return { name, status, message, value: exists ? `${String(value).substring(0, 20)}...` : 'N/A' };
  };

  const runTests = useCallback(async () => {
    setIsLoading(true);
    const testResults: any[] = [];

    testResults.push({
      category: 'Firebase Client (Público)',
      tests: [
        checkEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
        checkEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
        checkEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
        checkEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, false),
        checkEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
        checkEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
      ]
    });

    testResults.push({
      category: 'Firebase Admin (Servidor)',
      tests: [
        checkEnvVar('FIREBASE_ADMIN_PRIVATE_KEY_ID', process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID, false),
        checkEnvVar('FIREBASE_ADMIN_PRIVATE_KEY', process.env.FIREBASE_ADMIN_PRIVATE_KEY, false),
        checkEnvVar('FIREBASE_ADMIN_CLIENT_EMAIL', process.env.FIREBASE_ADMIN_CLIENT_EMAIL, false),
      ]
    });

    try {
      const { auth } = await import('@/lib/firebase');
      testResults.push({
        category: 'Firebase Inicialización',
        tests: [
          {
            name: 'Firebase Auth',
            status: auth ? 'success' : 'error',
            message: auth ? 'Inicializado correctamente' : 'No inicializado',
          }
        ]
      });
    } catch (error: any) {
      testResults.push({
        category: 'Firebase Inicialización',
        tests: [
          {
            name: 'Firebase Auth',
            status: 'error',
            message: `Error: ${error.message || 'Error desconocido'}`,
          }
        ]
      });
    }

    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (privateKey) {
      const keyStr = String(privateKey);
      const analysis = {
        category: 'Análisis de Private Key',
        tests: [
          {
            name: 'Longitud',
            status: keyStr.length > 100 ? 'success' : 'error' as any,
            message: `${keyStr.length} caracteres`,
          },
          {
            name: 'Contiene BEGIN PRIVATE KEY',
            status: keyStr.includes('BEGIN PRIVATE KEY') ? 'success' : 'warning' as any,
            message: keyStr.includes('BEGIN PRIVATE KEY') ? 'Sí' : 'No encontrado',
          },
          {
            name: 'Contiene END PRIVATE KEY',
            status: keyStr.includes('END PRIVATE KEY') ? 'success' : 'warning' as any,
            message: keyStr.includes('END PRIVATE KEY') ? 'Sí' : 'No encontrado',
          },
          {
            name: 'Saltos de línea (\\n)',
            status: keyStr.includes('\\n') || keyStr.includes('\n') ? 'success' : 'warning' as any,
            message: keyStr.includes('\\n') ? 'Escapados (\\n)' : keyStr.includes('\n') ? 'Literales' : 'No detectados',
          },
          {
            name: 'Caracteres especiales problemáticos',
            status: (/[^A-Za-z0-9+/=\n\r\- ]/.test(keyStr.replace(/-----[A-Z ]+-----/g, '')) ? 'warning' : 'success') as any,
            message: /[^A-Za-z0-9+/=\n\r\- ]/.test(keyStr.replace(/-----[A-Z ]+-----/g, '')) ? 'Detectados' : 'No detectados',
          }
        ]
      };
      testResults.push(analysis);
    }

    setResults(testResults);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    runTests();
  }, [runTests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} color="#21A118" />;
      case 'error':
        return <XCircle size={20} color="#D01714" />;
      case 'warning':
        return <AlertCircle size={20} color="#FFA500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#21A118';
      case 'error':
        return '#D01714';
      case 'warning':
        return '#FFA500';
      default:
        return '#666666';
    }
  };

  const showInstructions = () => {
    Alert.alert(
      'Cómo Configurar Firebase Admin',
      `1. Ve a Firebase Console
2. Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Abre el archivo JSON descargado
5. Copia los valores:
   - private_key_id
   - private_key (IMPORTANTE: debe incluir \\n)
   - client_email

IMPORTANTE para private_key:
- Debe empezar con "-----BEGIN PRIVATE KEY-----\\n"
- Los saltos de línea deben ser \\n (escapados)
- Debe terminar con "\\n-----END PRIVATE KEY-----\\n"

Ejemplo correcto:
"-----BEGIN PRIVATE KEY-----\\nMIIE...resto...\\n-----END PRIVATE KEY-----\\n"`,
      [{ text: 'Entendido' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diagnóstico de Firebase</Text>
        <Text style={styles.subtitle}>
          Verifica la configuración de tus variables de entorno
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Ejecutando pruebas...</Text>
          </View>
        ) : (
          <>
            {results.map((category, idx) => (
              <View key={idx} style={styles.categoryCard}>
                <Text style={styles.categoryTitle}>{category.category}</Text>
                {category.tests.map((test: any, testIdx: number) => (
                  <View key={testIdx} style={styles.testRow}>
                    <View style={styles.testInfo}>
                      {getStatusIcon(test.status)}
                      <View style={styles.testDetails}>
                        <Text style={styles.testName}>{test.name}</Text>
                        <Text style={[styles.testMessage, { color: getStatusColor(test.status) }]}>
                          {test.message}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <Text style={styles.summaryText}>
                {results.reduce((acc, cat) => acc + cat.tests.length, 0)} pruebas ejecutadas
              </Text>
              <Text style={[styles.summaryText, { color: '#21A118' }]}>
                ✓ {results.reduce((acc, cat) => acc + cat.tests.filter((t: any) => t.status === 'success').length, 0)} exitosas
              </Text>
              <Text style={[styles.summaryText, { color: '#FFA500' }]}>
                ⚠ {results.reduce((acc, cat) => acc + cat.tests.filter((t: any) => t.status === 'warning').length, 0)} advertencias
              </Text>
              <Text style={[styles.summaryText, { color: '#D01714' }]}>
                ✗ {results.reduce((acc, cat) => acc + cat.tests.filter((t: any) => t.status === 'error').length, 0)} errores
              </Text>
            </View>

            <TouchableOpacity style={styles.instructionsButton} onPress={showInstructions}>
              <Text style={styles.instructionsButtonText}>
                📖 Ver Instrucciones de Configuración
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshButton} onPress={runTests}>
              <Text style={styles.refreshButtonText}>🔄 Ejecutar Pruebas Nuevamente</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FCBA1D',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loading: {
    padding: 40,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  testRow: {
    marginBottom: 12,
  },
  testInfo: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  testDetails: {
    flex: 1,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  testMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  instructionsButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  instructionsButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  refreshButton: {
    backgroundColor: '#FCBA1D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000000',
  },
  backButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#000000',
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
