<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/functions.php';
require_once __DIR__ . '/../layouts/header.php';

$folio = limpiarFolio($_GET['folio'] ?? '');

$stmt = $conexion->prepare('SELECT * FROM registros WHERE folio = ? LIMIT 1');
$stmt->bind_param('s', $folio);
$stmt->execute();
$registro = $stmt->get_result()->fetch_assoc();

if (!$registro) {
    echo '<div class="alerta error">No se encontró el expediente.</div>';
    require_once __DIR__ . '/../layouts/footer.php';
    exit;
}

if (!puedeVerDistrito($registro['distrito'])) {
    echo '<div class="alerta error">No tienes permiso para consultar este expediente.</div>';
    require_once __DIR__ . '/../layouts/footer.php';
    exit;
}

$stmtDocs = $conexion->prepare('SELECT * FROM registro_documentos WHERE folio = ? ORDER BY fecha_carga ASC');
$stmtDocs->bind_param('s', $folio);
$stmtDocs->execute();
$documentos = $stmtDocs->get_result();
?>

<h1>Expediente</h1>

<div class="resumen-expediente">
    <h2>Folio: <?php echo e($registro['folio']); ?></h2>
    <p><strong>Distrito:</strong> <?php echo e($registro['distrito']); ?></p>
    <p><strong>Fecha de registro:</strong> <?php echo e($registro['fecha_registro']); ?></p>
    <p><strong>Representante:</strong> <?php echo e($registro['representante']); ?></p>
    <p><strong>Clasificación:</strong> <?php echo e($registro['clasificacion']); ?></p>
    <p><strong>Estatus:</strong> <?php echo e($registro['estatus']); ?></p>
</div>

<div class="acciones">
    <a class="boton" href="../registro/descargar_acuse.php?folio=<?php echo urlencode($folio); ?>">Descargar acuse PDF</a>
    <a class="boton secundario" href="descargar_expediente.php?folio=<?php echo urlencode($folio); ?>">Descargar expediente ZIP</a>
</div>

<section class="panel">
    <h2>Datos del registro</h2>
    <table class="tabla">
        <tr><th>Distrito</th><td><?php echo e($registro['distrito']); ?></td></tr>
        <tr><th>Unidad Territorial</th><td><?php echo e($registro['nombre_ut']); ?> <?php echo e($registro['clave_ut']); ?></td></tr>
        <tr><th>Demarcación</th><td><?php echo e($registro['nombre_demarcacion']); ?></td></tr>
        <tr><th>Procedencia</th><td><?php echo e($registro['procedencia']); ?></td></tr>
        <tr><th>Fecha de recepción</th><td><?php echo e($registro['fecha_recepcion']); ?></td></tr>
        <tr><th>Área remitente</th><td><?php echo e($registro['area_remitente']); ?></td></tr>
        <tr><th>Contacto</th><td><?php echo e($registro['contacto']); ?></td></tr>
        <tr><th>Descripción</th><td><?php echo nl2br(e($registro['descripcion'])); ?></td></tr>
    </table>
</section>

<section class="panel">
    <h2>Documentación adjunta</h2>

    <?php if ($documentos->num_rows > 0): ?>
        <table class="tabla">
            <thead>
                <tr>
                    <th>No.</th>
                    <th>Archivo</th>
                    <th>Formato</th>
                    <th>Peso</th>
                    <th>Fecha de carga</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
            <?php $i = 1; while ($doc = $documentos->fetch_assoc()): ?>
                <tr>
                    <td><?php echo $i++; ?></td>
                    <td><?php echo e($doc['nombre_original']); ?></td>
                    <td><?php echo strtoupper(e($doc['extension'])); ?></td>
                    <td><?php echo formatearBytes(intval($doc['peso_bytes'])); ?></td>
                    <td><?php echo e($doc['fecha_carga']); ?></td>
                    <td><a href="descargar_archivo.php?id=<?php echo intval($doc['id']); ?>">Descargar</a></td>
                </tr>
            <?php endwhile; ?>
            </tbody>
        </table>
    <?php else: ?>
        <p>No hay documentos adjuntos.</p>
    <?php endif; ?>
</section>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
