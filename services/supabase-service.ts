import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
  receipts: {
    upload: async (orderId: string, imageUri: string): Promise<string> => {
      try {
        console.log('📤 [SUPABASE] Uploading receipt for order:', orderId);
        console.log('📷 [SUPABASE] Image URI:', imageUri);
        console.log('🖥️ [SUPABASE] Platform:', Platform.OS);

        if (!imageUri) {
          throw new Error('No se proporcionó una imagen');
        }

        let blob: Blob;
        let contentType = 'image/jpeg';

        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (Platform.OS === 'web') {
          console.log('🌐 [SUPABASE] Using web upload method...');
          
          blob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function() {
              resolve(xhr.response as Blob);
            };
            xhr.onerror = function() {
              reject(new Error('Error al leer la imagen'));
            };
            xhr.responseType = 'blob';
            xhr.open('GET', imageUri, true);
            xhr.send(null);
          });
          
          contentType = blob.type || 'image/jpeg';
          console.log('📦 [SUPABASE] Web blob created, size:', blob.size, 'type:', contentType);
          
          if (!validImageTypes.includes(contentType)) {
            throw new Error('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)');
          }
        } else {
          console.log('📱 [SUPABASE] Using native upload method with base64...');
          
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64' as any,
          });
          
          const extension = imageUri.toLowerCase().split('.').pop() || 'jpg';
          if (extension === 'jpg') {
            contentType = 'image/jpeg';
          } else if (extension === 'png') {
            contentType = 'image/png';
          } else if (extension === 'gif') {
            contentType = 'image/gif';
          } else if (extension === 'webp') {
            contentType = 'image/webp';
          } else {
            contentType = 'image/jpeg';
          }
          
          if (!validImageTypes.includes(contentType)) {
            throw new Error('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)');
          }
          
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: contentType });
          
          console.log('📦 [SUPABASE] Native blob created, size:', blob.size, 'type:', contentType);
        }

        if (blob.size === 0) {
          throw new Error('La imagen está vacía');
        }

        const fileExtension = contentType.split('/')[1] || 'jpg';
        const fileName = `${orderId}_${Date.now()}.${fileExtension}`;
        const filePath = `receipts/${fileName}`;

        console.log('☁️ [SUPABASE] Uploading to storage:', filePath);

        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(filePath, blob, {
            contentType: contentType,
            upsert: false,
          });

        if (error) {
          console.error('❌ [SUPABASE] Upload error:', error);
          throw new Error(`Error al subir: ${error.message}`);
        }

        console.log('✅ [SUPABASE] Upload successful:', data.path);

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(data.path);

        console.log('🔗 [SUPABASE] Public URL:', urlData.publicUrl);
        return urlData.publicUrl;
      } catch (error: any) {
        console.error('❌ [SUPABASE] Error uploading receipt:', error);
        console.error('❌ [SUPABASE] Error stack:', error.stack);
        throw new Error(error.message || 'Error al subir el comprobante');
      }
    },

    delete: async (receiptUrl: string): Promise<void> => {
      try {
        const path = receiptUrl.split('/receipts/')[1];
        if (!path) {
          throw new Error('URL de comprobante inválida');
        }

        console.log('🗑️ [SUPABASE] Deleting receipt:', path);

        const { error } = await supabase.storage
          .from('receipts')
          .remove([`receipts/${path}`]);

        if (error) {
          console.error('❌ [SUPABASE] Delete error:', error);
          throw new Error(`Error al eliminar: ${error.message}`);
        }

        console.log('✅ [SUPABASE] Receipt deleted successfully');
      } catch (error: any) {
        console.error('❌ [SUPABASE] Error deleting receipt:', error);
        throw error;
      }
    },
  },
};
