import * as admin from 'firebase-admin';

let adminApp: admin.app.App;

export function getAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyId = process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID;
  
  if (!projectId) {
    throw new Error('EXPO_PUBLIC_FIREBASE_PROJECT_ID is not set');
  }

  if (!privateKeyRaw || !clientEmail) {
    throw new Error('Firebase Admin credentials not configured. Please set FIREBASE_ADMIN_PRIVATE_KEY and FIREBASE_ADMIN_CLIENT_EMAIL');
  }

  let privateKey = privateKeyRaw.trim();
  
  console.log('🔑 [FIREBASE ADMIN] Raw private key preview:', {
    length: privateKey.length,
    starts: privateKey.substring(0, 30),
    ends: privateKey.substring(privateKey.length - 30),
    hasLiteralBackslashN: privateKey.includes('\\n'),
    hasActualNewline: privateKey.includes('\n'),
  });
  
  if (privateKey.includes('\\n')) {
    console.log('🔄 [FIREBASE ADMIN] Converting \\\\n to actual newlines...');
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  
  if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    console.error('❌ [FIREBASE ADMIN] Private key does not start with BEGIN marker');
    throw new Error('Invalid private key format: missing BEGIN marker');
  }
  
  if (!privateKey.endsWith('-----END PRIVATE KEY-----') && !privateKey.endsWith('-----END PRIVATE KEY-----\n')) {
    console.error('❌ [FIREBASE ADMIN] Private key does not end with END marker');
    throw new Error('Invalid private key format: missing END marker');
  }
  
  privateKey = privateKey.trim();
  
  if (!privateKey.includes('\n')) {
    console.log('🔄 [FIREBASE ADMIN] No newlines detected, formatting key...');
    const keyContent = privateKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .trim();
    
    const lines = [];
    for (let i = 0; i < keyContent.length; i += 64) {
      lines.push(keyContent.substring(i, i + 64));
    }
    
    privateKey = '-----BEGIN PRIVATE KEY-----\n' + lines.join('\n') + '\n-----END PRIVATE KEY-----\n';
  }

  console.log('🔑 [FIREBASE ADMIN] Formatted private key check:', {
    hasBeginMarker: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    hasEndMarker: privateKey.includes('-----END PRIVATE KEY-----'),
    hasNewlines: privateKey.includes('\n'),
    lineCount: privateKey.split('\n').length,
    length: privateKey.length,
    firstLine: privateKey.split('\n')[0],
    lastLine: privateKey.split('\n').filter(l => l.trim()).pop()
  });

  try {
    console.log('🚀 [FIREBASE ADMIN] Initializing Firebase Admin SDK...');
    console.log('🚀 [FIREBASE ADMIN] Project ID:', projectId);
    console.log('🚀 [FIREBASE ADMIN] Client Email:', clientEmail);
    
    const serviceAccount: admin.ServiceAccount = {
      projectId: projectId.trim(),
      privateKey: privateKey,
      clientEmail: clientEmail.trim(),
      ...(privateKeyId && { privateKeyId: privateKeyId.trim() }),
    };
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ [FIREBASE ADMIN] Firebase Admin initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('❌ [FIREBASE ADMIN] Failed to initialize Firebase Admin:', error);
    console.error('❌ [FIREBASE ADMIN] Error details:', {
      message: (error as any)?.message,
      code: (error as any)?.code,
      stack: (error as any)?.stack?.substring(0, 200)
    });
    throw new Error(`Error al inicializar Firebase Admin: ${(error as any)?.message || 'Error desconocido'}`);
  }
}

export const adminAuth = () => getAdminApp().auth();
export const adminFirestore = () => getAdminApp().firestore();
