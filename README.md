# SCCMGPCCOPIA completo

Proyecto multipágina HTML/CSS/JS que usa exclusivamente la API REST mediante `api/api-proxy.php`. No requiere cambios al esquema `sccmgpc`.

## Datos sin columna propia
El domicilio, el ID de seccxut, tipoUT, secciones y hasta 8 UT adicionales se guardan en `seguimiento_fases.datos_json` de la fase 1. Los datos principales se guardan solo en las columnas existentes de `casos`.

## Instalación
1. Copie el contenido en `C:/xampp/htdocs/sitios/SCCMGPCCOPIA`.
2. Configure las dos API keys en `api/api-proxy.php`.
3. Confirme `proxyUrl` en `assets/js/config.js`.
4. La clave de lectura debe permitir usuarios, casos, seccxut, seguimiento_fases y casos_archivos. La de escritura debe permitir casos, seguimiento_fases, casos_archivos y archivos.
5. Abra `/sitios/SCCMGPCCOPIA/`.

## Distrito
`usuarios.distrito` se interpreta como número 1 a 33. Roles SUPERUSUARIO, SUPERADMINISTRADOR, SUPERADMIN, ADMINISTRADOR o CONTROL pueden elegir cualquier distrito. Los demás quedan restringidos al distrito de la sesión.
