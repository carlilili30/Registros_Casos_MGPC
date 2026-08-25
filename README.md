# Sistema de Registro y Expedientes

Sistema en PHP + MySQL para registrar solicitudes, subir documentación PDF o imágenes, generar acuse en PDF y descargar expedientes completos en ZIP.

## Requisitos

- PHP 8.0 o superior
- MySQL/MariaDB
- Composer
- Extensiones PHP: `mysqli`, `fileinfo`, `zip`, `mbstring`
- Servidor Apache o similar

## Instalación rápida

1. Copia la carpeta del proyecto en tu servidor local, por ejemplo:

```text
htdocs/sistema_registro_expedientes/
```

2. Entra a la carpeta del proyecto e instala Dompdf:

```bash
composer install
```

3. Crea la base de datos e importa el archivo:

```text
database/schema.sql
```

4. Configura tus datos de conexión en:

```text
config/database.php
```

5. Accede desde el navegador:

```text
http://localhost/sistema_registro_expedientes/
```

## Usuario inicial

El script SQL crea un usuario administrador:

```text
Usuario: admin
Contraseña: admin123
```

Por seguridad, cambia la contraseña después de instalar.

## Funcionalidades incluidas

- Inicio de sesión.
- Dashboard.
- Registro de solicitudes.
- Carga múltiple de archivos PDF, JPG, JPEG y PNG.
- Validación de extensión, MIME y tamaño.
- Generación automática de folio.
- Generación automática de acuse PDF con Dompdf.
- Consulta de expediente por folio.
- Descarga individual de documentos.
- Descarga de acuse PDF.
- Descarga de expediente completo en ZIP con acuse y documentación.
- Carpeta de carga protegida con `.htaccess`.

## Carpetas importantes

```text
uploads/registros/   Documentos adjuntos por folio
acuses/              Acuses PDF generados
temp/                ZIP temporales de expedientes
```

## Nota de seguridad

Este proyecto es una base funcional. Para producción se recomienda:

- Activar HTTPS.
- Cambiar permisos de carpetas.
- Guardar archivos fuera de la raíz pública si el servidor lo permite.
- Agregar roles y permisos por usuario.
- Registrar bitácora de descargas y cambios.
- Revisar políticas internas de protección de datos.
