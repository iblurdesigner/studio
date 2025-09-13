# Configuración de Base de Datos - TextScan Arriendo

## 📋 Requisitos Previos

- MySQL 8.0+ o MariaDB 10.6+
- Node.js 18+
- npm o yarn

## 🗄️ Configuración de la Base de Datos

### 1. Crear la Base de Datos

```sql
CREATE DATABASE textscan_comprob_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Ejecutar el Esquema

```bash
mysql -u tu_usuario -p textscan_comprob_db < database-schema.sql
```

### 3. Verificar la Instalación

```sql
USE textscan_comprob_db;
SHOW TABLES;
SELECT get_next_sequence_number() as siguiente_numero;
```

## 🔧 Configuración de Variables de Entorno

### 1. Crear archivo `.env.local`

```bash
cp env.example .env.local
```

### 2. Configurar las variables

```env
# Database Configuration
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=textscan_comprob_db
DB_PORT=3306

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📦 Instalación de Dependencias

```bash
npm install
# o
yarn install
```

## 🚀 Ejecutar la Aplicación

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:9002`

## 🧪 Probar la Funcionalidad

1. **Subir una imagen** con texto de comprobante
2. **Extraer el texto** usando OCR
3. **Generar el informe** automáticamente
4. **Guardar en la base de datos** usando el botón "Guardar en BD"

## 📊 Estructura de la Base de Datos

### Tabla `comprobantes`
- Almacena la información principal del comprobante
- Incluye datos del emisor, receptor, totales y metadatos
- Número secuencial único generado automáticamente

### Tabla `comprobante_items`
- Almacena los detalles/items del comprobante
- Relación uno a muchos con `comprobantes`

### Funciones y Procedimientos
- `get_next_sequence_number()`: Genera números secuenciales únicos
- `create_comprobante()`: Crea comprobantes con validación y transacciones

## 🔍 Consultas Útiles

### Ver todos los comprobantes
```sql
SELECT * FROM v_comprobantes_completos ORDER BY fecha_creacion DESC;
```

### Buscar por número de secuencia
```sql
SELECT * FROM comprobantes WHERE numero_secuencia = '20241221001';
```

### Estadísticas por día
```sql
SELECT 
    DATE(fecha_creacion) as fecha,
    COUNT(*) as total_comprobantes,
    SUM(total) as total_monto
FROM comprobantes 
GROUP BY DATE(fecha_creacion)
ORDER BY fecha DESC;
```

## 🛠️ Solución de Problemas

### Error de Conexión
- Verificar que MySQL esté ejecutándose
- Confirmar credenciales en `.env.local`
- Verificar que la base de datos existe

### Error de Permisos
```sql
GRANT ALL PRIVILEGES ON textscan_comprob_db.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

### Error de Funciones
```sql
-- Verificar que las funciones existen
SHOW FUNCTION STATUS WHERE Db = 'textscan_comprob_db';
```

## 📝 Notas Importantes

- Los números secuenciales se generan por día (formato: YYYYMMDD001)
- Cada día empieza desde 001
- Los comprobantes se guardan con transacciones para mantener integridad
- El texto OCR original se almacena para referencia
- Las imágenes se pueden almacenar como rutas o en base64

## 🔄 Backup y Restauración

### Backup
```bash
mysqldump -u tu_usuario -p textscan_comprob_db > backup_$(date +%Y%m%d).sql
```

### Restauración
```bash
mysql -u tu_usuario -p textscan_comprob_db < backup_20241221.sql
```
