<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../config/database.php';

$id = intval($_GET['id'] ?? 0);

$stmt = $conexion->prepare('SELECT * FROM registro_documentos WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $id);
$stmt->execute();
$doc = $stmt->get_result()->fetch_assoc();

if (!$doc || !file_exists($doc['ruta_archivo'])) {
    die('Documento no encontrado.');
}

header('Content-Type: ' . $doc['tipo_mime']);
header('Content-Disposition: attachment; filename="' . basename($doc['nombre_original']) . '"');
header('Content-Length: ' . filesize($doc['ruta_archivo']));
readfile($doc['ruta_archivo']);
exit;
