<?php
require_once __DIR__ . '/helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/layouts/header.php';

$totalRegistros = $conexion->query('SELECT COUNT(*) AS total FROM registros')->fetch_assoc()['total'] ?? 0;
$totalDocumentos = $conexion->query('SELECT COUNT(*) AS total FROM registro_documentos')->fetch_assoc()['total'] ?? 0;
?>

<h1>Panel principal HOLA</h1>
<p>Bienvenida(o), <?php echo e(usuarioActualNombre()); ?>.</p>

<div class="cards">
    <div class="card">
        <h2><?php echo intval($totalRegistros); ?></h2>
        <p>Registros capturados</p>
    </div>
    <div class="card">
        <h2><?php echo intval($totalDocumentos); ?></h2>
        <p>Documentos adjuntos</p>
    </div>
</div>

<div class="acciones">
    <a class="boton" href="registro/nuevo.php">Nuevo registro</a>
    <a class="boton secundario" href="expediente/index.php">Consultar expediente</a>
</div>

<?php require_once __DIR__ . '/layouts/footer.php'; ?>
