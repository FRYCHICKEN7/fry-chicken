import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Upload, CheckCircle, XCircle, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { supabaseService } from '@/services/supabase-service';
import { useRouter } from 'expo-router';

export default function TestUploadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePickImage = async () => {
    console.log('📱 Requesting media library permissions...');
    
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para probar la subida');
        return;
      }
    }

    console.log('📂 Opening image picker...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1.0,
    });

    console.log('📊 Picker result:', result);

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('✅ Image selected:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        type: asset.type,
        mimeType: asset.mimeType,
      });
      
      setSelectedImage(asset.uri);
      setUploadStatus('idle');
      setUploadedUrl(null);
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Por favor selecciona una imagen primero');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      console.log('🚀 Starting upload test...');
      console.log('📸 Image URI:', selectedImage);

      const url = await supabaseService.receipts.upload(
        `test_${Date.now()}`,
        selectedImage
      );

      console.log('✅ Upload successful!');
      console.log('🔗 URL:', url);

      setUploadedUrl(url);
      setUploadStatus('success');
      Alert.alert(
        '✅ ¡Éxito!',
        'La imagen se subió correctamente a Supabase. Solo se permiten imágenes (JPG, PNG, GIF, WEBP).'
      );
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Error desconocido');
      Alert.alert('❌ Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setUploadedUrl(null);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Prueba de Subida de Imágenes</Text>
        <Text style={styles.subtitle}>
          Solo se permiten imágenes (JPG, PNG, GIF, WEBP). Videos y otros archivos serán rechazados.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Seleccionar Imagen</Text>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={handlePickImage}
          disabled={isUploading}
        >
          <Camera size={24} color={colors.primary} />
          <Text style={styles.pickButtonText}>Seleccionar de Galería</Text>
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Trash2 size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {selectedImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Subir a Supabase</Text>
          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.uploadButtonText}>Subiendo...</Text>
              </>
            ) : (
              <>
                <Upload size={24} color={colors.white} />
                <Text style={styles.uploadButtonText}>Subir Imagen</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {uploadStatus !== 'idle' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultado</Text>
          <View
            style={[
              styles.resultContainer,
              uploadStatus === 'success' && styles.resultSuccess,
              uploadStatus === 'error' && styles.resultError,
            ]}
          >
            {uploadStatus === 'success' ? (
              <>
                <CheckCircle size={32} color={colors.success} />
                <Text style={[styles.resultTitle, { color: colors.success }]}>
                  ¡Subida Exitosa!
                </Text>
                <Text style={styles.resultText}>
                  La imagen se subió correctamente a Supabase Storage
                </Text>
                {uploadedUrl && (
                  <View style={styles.urlContainer}>
                    <Text style={styles.urlLabel}>URL:</Text>
                    <Text style={styles.urlText} numberOfLines={2}>
                      {uploadedUrl}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <XCircle size={32} color={colors.error} />
                <Text style={[styles.resultTitle, { color: colors.error }]}>Error</Text>
                <Text style={styles.resultText}>{errorMessage}</Text>
              </>
            )}
          </View>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>ℹ️ Información</Text>
        <Text style={styles.infoText}>
          • Solo se permiten imágenes (JPG, PNG, GIF, WEBP)
        </Text>
        <Text style={styles.infoText}>
          • Videos y otros archivos serán rechazados automáticamente
        </Text>
        <Text style={styles.infoText}>
          • El selector solo muestra imágenes
        </Text>
        <Text style={styles.infoText}>
          • La validación ocurre en el servidor (Supabase Service)
        </Text>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 20,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: '800' as const,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    pickButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    pickButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    previewContainer: {
      marginTop: 16,
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
    },
    previewImage: {
      width: '100%',
      height: 300,
      borderRadius: 12,
    },
    clearButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: colors.error,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    uploadButtonDisabled: {
      opacity: 0.6,
    },
    uploadButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.white,
    },
    resultContainer: {
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      gap: 12,
    },
    resultSuccess: {
      backgroundColor: colors.success + '15',
      borderWidth: 2,
      borderColor: colors.success,
    },
    resultError: {
      backgroundColor: colors.error + '15',
      borderWidth: 2,
      borderColor: colors.error,
    },
    resultTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    resultText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    urlContainer: {
      marginTop: 8,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      width: '100%',
    },
    urlLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    urlText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    infoSection: {
      backgroundColor: colors.surfaceLight,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    backButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 40,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.textPrimary,
    },
  });
