# SCCMGPC 2028 completo en español

## Instalación
1. Copie la carpeta como `C:\xampp\htdocs\sccmgpc`.
2. Inicie Apache y MySQL.
3. Revise `config/configuracion.php`.
4. Abra `http://localhost/sccmgpc/instalar.php`.
5. Pulse **Instalar sistema completo**.

## Cuentas
- `control01` / `ControlMGPC2028!`
- `control02` / `ControlMGPC2028!`
- `distrito01` a `distrito33`
- Contraseñas distritales: `Distrito01!` a `Distrito33!`

## Tablas en español
- `distritos`
- `usuarios`
- `casos_actualizacion`
- `archivos_caso`
- `bitacora_sistema`

La tabla existente `seccxut` se conserva. Las UT se filtran por `dtto` según el usuario de la sesión.

## Si la tabla usuarios aparece vacía
Abra `http://localhost/sccmgpc/crear_usuarios.php` y pulse **Crear y verificar 35 usuarios**. El proceso inserta las cuentas, restablece contraseñas y muestra una lista de verificación. La tabla correcta del proyecto en español es `usuarios`, no `users`.
