<?php
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/functions.php';
require_once __DIR__ . '/../config/config.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?></title>
    <link rel="stylesheet" href="<?php echo urlApp('assets/css/estilos.css'); ?>?v=2">
</head>
<body>
<header class="topbar">
    <div class="brand">
        <strong>IECM</strong> | Sistema de Registro y Expedientes
    </div>
    <?php if (usuarioAutenticado()): ?>
        <nav>
            <a href="<?php echo urlApp('dashboard.php'); ?>">Inicio</a>
            <a href="<?php echo urlApp('registro/nuevo.php'); ?>">Nuevo registro</a>
            <a href="<?php echo urlApp('expediente/index.php'); ?>">Expediente</a>
            <a href="<?php echo urlApp('logout.php'); ?>">Cerrar sesión</a>
        </nav>
        <div class="usuario-barra">
            <?php echo e(usuarioActualNombre()); ?>
            <?php if (esUsuarioDistrito()): ?>
                | Distrito <?php echo intval(usuarioActualDistrito()); ?>
            <?php else: ?>
                | Superusuario
            <?php endif; ?>
        </div>
    <?php endif; ?>
</header>
<main class="contenedor">
