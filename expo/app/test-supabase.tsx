import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/services/supabase-service';

export default function TestSupabaseScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);

    addLog('🔍 Iniciando pruebas de Supabase...');

    addLog(`📋 URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL}`);
    addLog(`📋 Key: ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...`);

    try {
      addLog('1️⃣ Test: Verificar conexión básica');
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        addLog(`❌ Error de conexión: ${error.message}`);
        addLog(`❌ Detalles: ${JSON.stringify(error)}`);
      } else {
        addLog(`✅ Conexión exitosa`);
        addLog(`📦 Buckets encontrados: ${data.length}`);
        data.forEach(bucket => {
          addLog(`  - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
        });
      }

      addLog('2️⃣ Test: Verificar bucket "receipts"');
      const receiptBucket = data?.find(b => b.name === 'receipts');
      if (receiptBucket) {
        addLog(`✅ Bucket "receipts" encontrado`);
        addLog(`  - Público: ${receiptBucket.public ? 'SÍ' : 'NO'}`);
        addLog(`  - ID: ${receiptBucket.id}`);
      } else {
        addLog(`❌ Bucket "receipts" NO encontrado`);
        addLog(`⚠️ Necesitas crear el bucket "receipts"`);
      }

      addLog('3️⃣ Test: Intentar subir archivo de prueba');
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testPath = `test_${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(testPath, testBlob);

      if (uploadError) {
        addLog(`❌ Error al subir: ${uploadError.message}`);
        addLog(`❌ Detalles: ${JSON.stringify(uploadError)}`);
      } else {
        addLog(`✅ Archivo subido exitosamente`);
        addLog(`  - Path: ${uploadData.path}`);

        addLog('4️⃣ Test: Obtener URL pública');
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(uploadData.path);
        
        addLog(`✅ URL pública obtenida`);
        addLog(`  - URL: ${urlData.publicUrl}`);

        addLog('5️⃣ Test: Eliminar archivo de prueba');
        const { error: deleteError } = await supabase.storage
          .from('receipts')
          .remove([uploadData.path]);

        if (deleteError) {
          addLog(`⚠️ Error al eliminar: ${deleteError.message}`);
        } else {
          addLog(`✅ Archivo eliminado`);
        }
      }

      addLog('');
      addLog('✅ Pruebas completadas');
      
    } catch (error: any) {
      addLog(`❌ Error inesperado: ${error.message}`);
      addLog(`❌ Stack: ${error.stack}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Test Supabase',
          headerStyle: { backgroundColor: '#10b981' },
          headerTintColor: '#fff'
        }} 
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Prueba de Supabase</Text>
        <Text style={styles.subtitle}>
          Verifica que la configuración de Supabase sea correcta
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runTests}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? '⏳ Ejecutando pruebas...' : '▶️ Ejecutar Pruebas'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.results}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Credenciales necesarias:</Text>
        <Text style={styles.instructionsText}>
          1. Project URL: https://xxxxx.supabase.co{'\n'}
          2. anon/public key: eyJhbGc... (clave JWT larga)
        </Text>
        <Text style={styles.instructionsText}>
          {'\n'}⚠️ NO uses la &quot;publishable key&quot; ni la &quot;service_role key&quot;
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#10b981',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#d1fae5',
  },
  button: {
    backgroundColor: '#10b981',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    backgroundColor: '#1f2937',
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
  },
  resultText: {
    color: '#f3f4f6',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  instructions: {
    backgroundColor: '#fff3cd',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
});
