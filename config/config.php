<?php

define('APP_NAME', 'Sistema de Registro y Expedientes');

// Ruta base real de tu proyecto en XAMPP.
// Si cambias la carpeta, modifica solo esta línea.
define('APP_BASE_URL', '/sitios/SCCMGPCCOPIA');

define('MAX_FILE_SIZE', 15 * 1024 * 1024); // 15 MB por archivo

define('UPLOAD_DIR', __DIR__ . '/../uploads/registros/');
define('ACUSES_DIR', __DIR__ . '/../acuses/');
define('TEMP_DIR', __DIR__ . '/../temp/');

function crearCarpetaSiNoExiste($ruta)
{
    if (!file_exists($ruta)) {
        mkdir($ruta, 0755, true);
    }
}

function urlApp($ruta = '')
{
    return APP_BASE_URL . '/' . ltrim($ruta, '/');
}

crearCarpetaSiNoExiste(UPLOAD_DIR);
crearCarpetaSiNoExiste(ACUSES_DIR);
crearCarpetaSiNoExiste(TEMP_DIR);
