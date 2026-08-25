<?php
session_start();
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/helpers/functions.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $usuario = limpiarTexto($_POST['usuario'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $conexion->prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1 LIMIT 1');
    $stmt->bind_param('s', $usuario);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $user = $resultado->fetch_assoc();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['usuario_id'] = $user['id'];
        $_SESSION['usuario_nombre'] = $user['nombre'];
        $_SESSION['usuario_rol'] = $user['rol'];
        $_SESSION['usuario_distrito'] = $user['distrito_asignado'] ?? null;
        header('Location: ' . urlApp('dashboard.php'));
        exit;
    } else {
        $error = 'Usuario o contraseña incorrectos.';
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Iniciar sesión</title>
    <link rel="stylesheet" href="<?php echo urlApp('assets/css/estilos.css'); ?>?v=2">
</head>
<body class="login-body">
<div class="login-card">
    <h1>Sistema de Registro</h1>
    <p>Ingresa tus credenciales para continuar.</p>

    <?php if ($error): ?>
        <div class="alerta error"><?php echo e($error); ?></div>
    <?php endif; ?>

    <form method="POST">
        <label>Usuario</label>
        <input type="text" name="usuario" required autofocus>

        <label>Contraseña</label>
        <input type="password" name="password" required>

        <button type="submit">Entrar</button>
    </form>
</div>
</body>
</html>
