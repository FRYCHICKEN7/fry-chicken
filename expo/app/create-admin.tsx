import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { firebaseService } from '@/services/firebase-service';
import { User } from '@/types';

const ADMIN_EMAIL = 'frychickenhn@gmail.com';
const ADMIN_PASSWORD = 'FRY2027';

export default function CreateAdminScreen() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [adminData, setAdminData] = useState<User | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog('📱 Pantalla de creación de admin cargada');
    addLog(`📧 Email: ${ADMIN_EMAIL}`);
    addLog(`🔑 Password: ${ADMIN_PASSWORD}`);
  }, []);

  const createAdmin = async () => {
    try {
      setLoading(true);
      setLogs([]);
      addLog('🚀 Iniciando creación de administrador...');
      
      let firebaseUser;
      let isNewUser = false;

      try {
        addLog('🔐 Intentando iniciar sesión en Firebase Auth...');
        const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        firebaseUser = userCredential.user;
        addLog(`✅ Usuario ya existe en Firebase Auth: ${firebaseUser.uid}`);
      } catch (error: any) {
        addLog(`⚠️ Error al iniciar sesión: ${error.code}`);
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          addLog('📝 Creando nuevo usuario en Firebase Auth...');
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
            firebaseUser = userCredential.user;
            isNewUser = true;
            addLog(`✅ Usuario creado en Firebase Auth: ${firebaseUser.uid}`);
          } catch (createError: any) {
            addLog(`❌ Error creando usuario en Auth: ${createError.code} - ${createError.message}`);
            throw createError;
          }
        } else {
          throw error;
        }
      }

      addLog(`🔍 Buscando perfil en Firestore para UID: ${firebaseUser.uid}`);
      let userData;
      try {
        userData = await firebaseService.users.getById(firebaseUser.uid);
        if (userData) {
          addLog('✅ Perfil encontrado en Firestore');
          addLog(`👤 Nombre: ${userData.name}`);
          addLog(`👤 Role: ${userData.role}`);
        } else {
          addLog('⚠️ No se encontró perfil en Firestore');
        }
      } catch (error: any) {
        addLog(`❌ Error al buscar en Firestore: ${error.message}`);
        userData = null;
      }
      
      if (!userData || isNewUser) {
        addLog('💾 Creando perfil de administrador en Firestore...');
        
        const newUserData: User = {
          id: firebaseUser.uid,
          role: 'admin',
          name: 'Administrador',
          email: ADMIN_EMAIL,
          profileImage: 'https://frychickenhn.com/wp-content/uploads/2022/01/512.png',
        };
        
        addLog(`📝 Datos a guardar: ${JSON.stringify(newUserData, null, 2)}`);
        
        try {
          await firebaseService.users.create(newUserData);
          addLog('✅ Perfil creado en Firestore exitosamente');
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          addLog('🔍 Verificando que el perfil se creó correctamente...');
          const verifyUser = await firebaseService.users.getById(firebaseUser.uid);
          if (verifyUser) {
            addLog(`✅ Verificación exitosa: ${verifyUser.name} (${verifyUser.role})`);
            userData = verifyUser;
          } else {
            addLog('❌ ERROR: El perfil no se encuentra en Firestore después de crearlo');
            throw new Error('El perfil no se creó correctamente');
          }
        } catch (error: any) {
          addLog(`❌ Error al crear perfil en Firestore: ${error.code || 'unknown'}`);
          addLog(`❌ Mensaje: ${error.message}`);
          throw error;
        }
      }
      
      setAdminData(userData);
      setSuccess(true);
      addLog('🎉 ¡Administrador creado exitosamente!');
      
      Alert.alert(
        '✅ Admin Creado',
        `Usuario admin creado exitosamente!\n\nEmail: ${ADMIN_EMAIL}\nPassword: ${ADMIN_PASSWORD}\nID: ${userData.id}\nRole: ${userData.role}`,
        [
          {
            text: 'Ir al Login',
            onPress: () => router.replace('/login'),
          }
        ]
      );
    } catch (error: any) {
      addLog(`❌ ERROR FINAL: ${error.message || 'Error desconocido'}`);
      if (error.code) {
        addLog(`❌ Código de error: ${error.code}`);
      }
      Alert.alert('Error', error.message || 'Error al crear usuario admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        <Text style={styles.title}>Crear Usuario Admin</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{ADMIN_EMAIL}</Text>
          
          <Text style={styles.infoLabel}>Password:</Text>
          <Text style={styles.infoValue}>{ADMIN_PASSWORD}</Text>
          
          <Text style={styles.infoLabel}>Role:</Text>
          <Text style={styles.infoValue}>admin</Text>
        </View>

        {success && adminData && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Admin creado exitosamente</Text>
            <Text style={styles.successDetail}>ID: {adminData.id}</Text>
            <Text style={styles.successDetail}>Nombre: {adminData.name}</Text>
            <Text style={styles.successDetail}>Role: {adminData.role}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createAdmin}
          disabled={loading || success}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {success ? '✅ Admin Creado' : 'Crear Admin'}
            </Text>
          )}
        </TouchableOpacity>

        {success && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.secondaryButtonText}>Ir al Login</Text>
          </TouchableOpacity>
        )}

        {logs.length > 0 && (
          <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>📋 Logs de Proceso:</Text>
            <ScrollView style={styles.logsScroll}>
              {logs.map((log, index) => (
                <Text key={index} style={styles.logText}>{log}</Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: '100%',
  },
  content: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600' as const,
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#155724',
    textAlign: 'center',
    fontWeight: '600' as const,
    fontSize: 16,
    marginBottom: 8,
  },
  successDetail: {
    color: '#155724',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#DC143C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC143C',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#DC143C',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  logsContainer: {
    marginTop: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    maxHeight: 300,
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    marginBottom: 12,
    color: '#333',
  },
  logsScroll: {
    maxHeight: 250,
  },
  logText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace' as any,
  },
});
