<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/functions.php';
require_once __DIR__ . '/../pdf/generar_acuse.php';

function generarFolio($conexion, $distrito)
{
    $anio = date('Y');
    $prefijo = 'MGPC-' . $anio . '-D' . str_pad(intval($distrito), 2, '0', STR_PAD_LEFT) . '-';
    $like = $prefijo . '%';

    $stmt = $conexion->prepare('SELECT COUNT(*) AS total FROM registros WHERE folio LIKE ?');
    $stmt->bind_param('s', $like);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $consecutivo = intval($fila['total'] ?? 0) + 1;

    return $prefijo . str_pad($consecutivo, 5, '0', STR_PAD_LEFT);
}

function validarDocumento($tmp, $nombreOriginal, $peso, &$error)
{
    $extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png'];
    $tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];

    $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
    $tipoMime = mime_content_type($tmp);

    if (!in_array($extension, $extensionesPermitidas, true)) {
        $error = 'Extensión no permitida: ' . $nombreOriginal;
        return false;
    }

    if (!in_array($tipoMime, $tiposPermitidos, true)) {
        $error = 'Tipo de archivo no permitido: ' . $nombreOriginal;
        return false;
    }

    if ($peso > MAX_FILE_SIZE) {
        $error = 'El archivo supera el tamaño permitido: ' . $nombreOriginal;
        return false;
    }

    return true;
}

function guardarDocumentos($conexion, $registroId, $folio)
{
    if (!isset($_FILES['documentos'])) {
        throw new Exception('No se recibieron documentos.');
    }

    $carpetaFolio = UPLOAD_DIR . $folio . '/';
    crearCarpetaSiNoExiste($carpetaFolio);

    foreach ($_FILES['documentos']['name'] as $index => $nombreOriginal) {
        if ($_FILES['documentos']['error'][$index] !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmp = $_FILES['documentos']['tmp_name'][$index];
        $peso = intval($_FILES['documentos']['size'][$index]);
        $error = '';

        if (!validarDocumento($tmp, $nombreOriginal, $peso, $error)) {
            throw new Exception($error);
        }

        $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
        $tipoMime = mime_content_type($tmp);
        $nombreBase = pathinfo($nombreOriginal, PATHINFO_FILENAME);
        $nombreBase = preg_replace('/[^A-Za-z0-9_\-]/', '_', $nombreBase);
        $nombreGuardado = $folio . '_' . uniqid() . '_' . $nombreBase . '.' . $extension;
        $rutaFinal = $carpetaFolio . $nombreGuardado;

        if (!move_uploaded_file($tmp, $rutaFinal)) {
            throw new Exception('No se pudo guardar el archivo: ' . $nombreOriginal);
        }

        $stmt = $conexion->prepare('
            INSERT INTO registro_documentos
            (registro_id, folio, nombre_original, nombre_guardado, ruta_archivo, extension, tipo_mime, peso_bytes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->bind_param('issssssi', $registroId, $folio, $nombreOriginal, $nombreGuardado, $rutaFinal, $extension, $tipoMime, $peso);
        $stmt->execute();
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido.');
    }

    $distrito = intval($_POST['distrito'] ?? 0);

    if ($distrito < 1 || $distrito > 33) {
        throw new Exception('Distrito inválido.');
    }

    if (esUsuarioDistrito() && $distrito !== usuarioActualDistrito()) {
        throw new Exception('No tienes permiso para registrar solicitudes de otro distrito.');
    }

    $folio = generarFolio($conexion, $distrito);
    $creadoPor = usuarioActualId();

    $claveDemarcacion = limpiarTexto($_POST['clave_demarcacion'] ?? '');
    $nombreDemarcacion = limpiarTexto($_POST['nombre_demarcacion'] ?? '');
    $claveUt = limpiarTexto($_POST['clave_ut'] ?? '');
    $nombreUt = limpiarTexto($_POST['nombre_ut'] ?? '');
    $procedencia = limpiarTexto($_POST['procedencia'] ?? '');
    $fechaRecepcion = limpiarTexto($_POST['fecha_recepcion'] ?? '');
    $areaRemitente = limpiarTexto($_POST['area_remitente'] ?? '');
    $representante = limpiarTexto($_POST['representante'] ?? '');
    $contacto = limpiarTexto($_POST['contacto'] ?? '');
    $descripcion = limpiarTexto($_POST['descripcion'] ?? '');
    $clasificacion = limpiarTexto($_POST['clasificacion'] ?? '');

    if (!$procedencia || !$fechaRecepcion || !$areaRemitente || !$representante || !$contacto || !$descripcion || !$clasificacion) {
        throw new Exception('Faltan campos obligatorios.');
    }

    $conexion->begin_transaction();

    $stmt = $conexion->prepare('
        INSERT INTO registros
        (folio, distrito, clave_demarcacion, nombre_demarcacion, clave_ut, nombre_ut, procedencia, fecha_recepcion, area_remitente, representante, contacto, descripcion, clasificacion, creado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    $distritoTexto = strval($distrito);
    $stmt->bind_param('sssssssssssssi', $folio, $distritoTexto, $claveDemarcacion, $nombreDemarcacion, $claveUt, $nombreUt, $procedencia, $fechaRecepcion, $areaRemitente, $representante, $contacto, $descripcion, $clasificacion, $creadoPor);
    $stmt->execute();

    $registroId = $conexion->insert_id;
    guardarDocumentos($conexion, $registroId, $folio);
    generarAcuse($conexion, $registroId);

    $conexion->commit();

    header('Location: confirmar.php?folio=' . urlencode($folio));
    exit;
} catch (Exception $e) {
    if ($conexion->errno === 0) {
        // No-op
    }
    $conexion->rollback();
    die('Error: ' . e($e->getMessage()));
}
