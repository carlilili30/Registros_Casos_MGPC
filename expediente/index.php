<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../layouts/header.php';
?>

<h1>Consulta de expediente</h1>

<?php if (esUsuarioDistrito()): ?>
    <p>Solo podrás consultar expedientes del Distrito <?php echo intval(usuarioActualDistrito()); ?>.</p>
<?php else: ?>
    <p>Como superusuario puedes consultar expedientes de cualquier distrito.</p>
<?php endif; ?>

<form action="detalle.php" method="GET" class="busqueda">
    <label>Folio de registro</label>
    <input type="text" name="folio" placeholder="Ejemplo: MGPC-2026-D01-00001" required>
    <button type="submit">Buscar expediente</button>
</form>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
