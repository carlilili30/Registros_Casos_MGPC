<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/functions.php';

$folio = limpiarFolio($_GET['folio'] ?? '');

$stmt = $conexion->prepare('SELECT * FROM registros WHERE folio = ? LIMIT 1');
$stmt->bind_param('s', $folio);
$stmt->execute();
$registro = $stmt->get_result()->fetch_assoc();

if (!$registro) {
    die('No se encontró el expediente.');
}

$stmtDocs = $conexion->prepare('SELECT * FROM registro_documentos WHERE folio = ? ORDER BY fecha_carga ASC');
$stmtDocs->bind_param('s', $folio);
$stmtDocs->execute();
$documentos = $stmtDocs->get_result();

crearCarpetaSiNoExiste(TEMP_DIR);
$zipPath = TEMP_DIR . 'expediente_' . $folio . '.zip';

$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    die('No se pudo crear el archivo ZIP.');
}

$rutaAcuse = ACUSES_DIR . 'acuse_' . $folio . '.pdf';
if (file_exists($rutaAcuse)) {
    $zip->addFile($rutaAcuse, 'acuse_' . $folio . '.pdf');
}

while ($doc = $documentos->fetch_assoc()) {
    if (file_exists($doc['ruta_archivo'])) {
        $zip->addFile($doc['ruta_archivo'], 'documentacion/' . $doc['nombre_original']);
    }
}

$zip->close();

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="expediente_' . $folio . '.zip"');
header('Content-Length: ' . filesize($zipPath));
readfile($zipPath);
exit;
