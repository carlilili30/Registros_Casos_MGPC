<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/functions.php';

$folio = limpiarFolio($_GET['folio'] ?? '');
$ruta = ACUSES_DIR . 'acuse_' . $folio . '.pdf';

if (!$folio || !file_exists($ruta)) {
    die('No se encontró el acuse.');
}

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="acuse_' . $folio . '.pdf"');
header('Content-Length: ' . filesize($ruta));
readfile($ruta);
exit;
