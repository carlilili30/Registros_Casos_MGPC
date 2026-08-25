<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../helpers/functions.php';
require_once __DIR__ . '/../layouts/header.php';

$folio = limpiarFolio($_GET['folio'] ?? '');
?>

<div class="confirmacion">
    <h1>Registro realizado correctamente</h1>
    <p>El folio generado es:</p>
    <div class="folio-grande"><?php echo e($folio); ?></div>

    <div class="acciones">
        <a class="boton" href="descargar_acuse.php?folio=<?php echo urlencode($folio); ?>">Descargar acuse PDF</a>
        <a class="boton secundario" href="../expediente/detalle.php?folio=<?php echo urlencode($folio); ?>">Ver expediente</a>
        <a class="boton claro" href="nuevo.php">Capturar otro registro</a>
    </div>
</div>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
