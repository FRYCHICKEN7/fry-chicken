import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '../create-context';
import { adminAuth } from '@/lib/firebase-admin';

export const usersRouter = createTRPCRouter({
  deleteUser: publicProcedure
    .input(z.object({
      userId: z.string(),
      adminToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('🗑️ Backend: Deleting user from Firebase Auth:', input.userId);
        
        await adminAuth().deleteUser(input.userId);
        
        console.log('✅ Backend: User deleted from Firebase Auth successfully');
        
        return { success: true };
      } catch (error: any) {
        console.error('❌ Backend: Error deleting user from Firebase Auth:', error);
        
        if (error.code === 'auth/user-not-found') {
          console.log('⚠️ Backend: User not found in Firebase Auth, continuing...');
          return { success: true, message: 'User not found in Auth, already deleted' };
        }
        
        throw new Error(`Error al eliminar usuario de Authentication: ${error.message}`);
      }
    }),

  syncDeletedUsers: publicProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      adminToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('🔄 Backend: Syncing deleted users from Firebase Auth:', input.userIds.length);
        
        const results = {
          deleted: 0,
          notFound: 0,
          errors: 0,
        };

        for (const userId of input.userIds) {
          try {
            await adminAuth().deleteUser(userId);
            results.deleted++;
            console.log(`✅ Backend: Deleted user ${userId} from Firebase Auth`);
          } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
              results.notFound++;
              console.log(`⚠️ Backend: User ${userId} not found in Firebase Auth`);
            } else {
              results.errors++;
              console.error(`❌ Backend: Error deleting user ${userId}:`, error);
            }
          }
        }
        
        console.log('✅ Backend: Sync completed:', results);
        
        return { success: true, results };
      } catch (error: any) {
        console.error('❌ Backend: Error syncing users:', error);
        throw new Error(`Error al sincronizar usuarios: ${error.message}`);
      }
    }),

  updatePassword: publicProcedure
    .input(z.object({
      userId: z.string(),
      newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
      adminToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('🔐 Backend: Updating password for user:', input.userId);
        console.log('🔐 Backend: Password length:', input.newPassword?.length);
        
        const trimmedPassword = input.newPassword.trim();
        
        if (trimmedPassword.length < 6) {
          console.error('❌ Backend: Password too short after trim');
          throw new Error('La contraseña debe tener al menos 6 caracteres (sin espacios)');
        }
        
        const auth = adminAuth();
        console.log('🔐 Backend: Got admin auth instance');
        console.log('🔐 Backend: Updating with trimmed password');
        
        const updateResult = await auth.updateUser(input.userId, {
          password: trimmedPassword,
        });
        
        console.log('✅ Backend: Password updated successfully');
        console.log('✅ Backend: Update result UID:', updateResult.uid);
        
        return { 
          success: true, 
          message: 'Contraseña actualizada correctamente',
          userId: input.userId
        };
      } catch (error: any) {
        console.error('❌ Backend: Error updating password:', error);
        console.error('❌ Backend: Error code:', error?.code);
        console.error('❌ Backend: Error message:', error?.message);
        console.error('❌ Backend: Error stack:', error?.stack);
        
        const errorMessage = error?.message || 'Error desconocido';
        const errorCode = error?.code || 'unknown';
        
        if (errorCode === 'auth/user-not-found') {
          throw new Error('Usuario no encontrado en Firebase Authentication');
        }
        
        if (errorCode === 'auth/invalid-password') {
          throw new Error('La contraseña no cumple con los requisitos mínimos');
        }
        
        throw new Error(`Error al actualizar contraseña: ${errorMessage}`);
      }
    }),
});
