# Reglas de Firebase Corregidas

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ================= FUNCIONES AUXILIARES =================
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'admin';
    }

    function isBranch() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'branch';
    }

    function isDelivery() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'delivery';
    }

    function isCustomer() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             getUserData().role == 'customer';
    }

    function getBranchId() {
      return getUserData().branchId;
    }

    // ================= USUARIOS =================
    match /users/{userId} {
      // Permitir creación sin restricciones (para registro inicial)
      allow create: if true;
      
      // Cualquier usuario autenticado puede leer cualquier perfil
      allow get, list: if isAuthenticated();
      
      // Usuarios autenticados pueden actualizar sus propios perfiles
      // Admin puede actualizar cualquier perfil
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      
      // Solo admin puede eliminar
      allow delete: if isAdmin();
    }

    // ================= PEDIDOS =================
    match /orders/{orderId} {
      // Admin puede ver todos los pedidos
      allow list: if isAdmin();
      
      // Sucursal puede ver solo sus pedidos
      allow list: if isBranch() && resource.data.branchId == getBranchId();
      
      // Repartidor puede ver pedidos asignados o disponibles de su sucursal
      allow list: if isDelivery() && (
        resource.data.deliveryId == request.auth.uid ||
        resource.data.branchId == getBranchId()
      );
      
      // Cliente puede ver sus propios pedidos
      allow list: if isCustomer() && resource.data.customerId == request.auth.uid;
      
      // Lectura individual de pedido
      allow get: if isAuthenticated() && (
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && (resource.data.deliveryId == request.auth.uid || resource.data.branchId == getBranchId())) ||
        (isCustomer() && resource.data.customerId == request.auth.uid)
      );
      
      // Crear pedidos
      allow create: if isAuthenticated() && (isCustomer() || isAdmin());
      
      // Actualizar pedidos
      allow update: if isAuthenticated() && (
        isAdmin() ||
        (isBranch() && resource.data.branchId == getBranchId()) ||
        (isDelivery() && resource.data.deliveryId == request.auth.uid)
      );
      
      // Eliminar pedidos
      allow delete: if isAdmin();
    }

    // ================= QUEJAS =================
    match /complaints/{complaintId} {
      allow get, list: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // ================= SUCURSALES =================
    match /branches/{branchId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= ZONAS DE ENVÍO =================
    match /zones/{zoneId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= DELIVERY USERS =================
    match /deliveryUsers/{deliveryId} {
      allow get, list: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PRODUCTOS =================
    match /products/{productId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CATEGORÍAS =================
    match /categories/{categoryId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CUENTAS BANCARIAS =================
    match /bankAccounts/{accountId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= NOTIFICACIONES =================
    match /notifications/{notificationId} {
      allow get, list, create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PUNTOS DE USUARIO =================
    match /userPoints/{userPointsId} {
      allow get, list: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= PASSWORD RESETS =================
    match /passwordResets/{email} {
      allow read, write: if true;
    }

    // ================= SOLICITUDES DE RECUPERACIÓN DE CONTRASEÑA =================
    match /passwordRecoveryRequests/{requestId} {
      allow create, read, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // ================= CUPONES =================
    match /coupons/{couponId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= PROMOCIONES =================
    match /promotions/{promotionId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CONFIGURACIÓN DE PUNTOS =================
    match /pointsSettings/{settingId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= HORARIOS DE NEGOCIO =================
    match /businessHours/{hourId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= CONFIGURACIÓN DE TEMA =================
    match /theme/{themeId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= POPUP DE MARKETING =================
    match /marketingPopup/{popupId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }

    // ================= RESPALDOS =================
    match /backups/{backupId} {
      allow read, write: if isAdmin();
    }

    // ================= ESTADÍSTICAS =================
    match /statistics/{statId} {
      allow read, write: if isAdmin();
    }

    // ================= IMPORTACIÓN DE PRODUCTOS =================
    match /importLogs/{logId} {
      allow read, write: if isAdmin();
    }

    // ================= CALIFICACIONES =================
    match /reviews/{reviewId} {
      allow get, list: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }

    // ================= ZONAS DE ENVÍO POR SUCURSAL =================
    match /deliveryZones/{zoneId} {
      allow get, list: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

## Índices Compuestos Requeridos

Para que las consultas funcionen correctamente, necesitas crear estos índices compuestos en Firebase Console:

### 1. Índice para pedidos por sucursal (CRÍTICO)
- **Colección**: `orders`
- **Campos indexados**:
  - `branchId` (Ascending)
  - `createdAt` (Descending)

### 2. Índice para pedidos por cliente
- **Colección**: `orders`
- **Campos indexados**:
  - `customerId` (Ascending)
  - `createdAt` (Descending)

### 3. Índice para pedidos por repartidor
- **Colección**: `orders`
- **Campos indexados**:
  - `deliveryId` (Ascending)
  - `createdAt` (Descending)

### 4. Índice para pedidos disponibles para entrega
- **Colección**: `orders`
- **Campos indexados**:
  - `branchId` (Ascending)
  - `deliveryType` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Ascending)

## Cómo crear los índices:

1. Ve a Firebase Console → Firestore Database → Indexes
2. Haz clic en "Create Index"
3. Ingresa los campos según se especifica arriba
4. Espera a que el índice se construya (puede tomar varios minutos)

**IMPORTANTE**: Firebase también te mostrará automáticamente qué índices necesitas crear cuando hagas una consulta que los requiera. Revisa la consola del navegador para ver si hay enlaces directos para crear índices.

## Cambios principales respecto a las reglas anteriores:

1. ✅ **Eliminadas todas las referencias a municipios** (`municipalities`)
2. ✅ **Reglas de pedidos más seguras**: Las sucursales solo pueden ver sus propios pedidos
3. ✅ **Permisos específicos por rol**: Admin, sucursal, repartidor y cliente tienen acceso controlado
4. ✅ **Funciones auxiliares mejoradas**: Verifican la existencia del documento de usuario antes de acceder a sus datos
5. ✅ **Reglas optimizadas para queries con orderBy**: Permiten las consultas ordenadas que usa la app
