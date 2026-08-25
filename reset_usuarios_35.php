<?php

require_once __DIR__ . '/config/database.php';

// Agrega columna distrito_asignado si todavía no existe.
$check = $conexion->query("SHOW COLUMNS FROM usuarios LIKE 'distrito_asignado'");
if ($check->num_rows === 0) {
    $conexion->query("ALTER TABLE usuarios ADD distrito_asignado INT NULL AFTER rol");
}

function crearOActualizarUsuario($conexion, $nombre, $usuario, $passwordPlano, $rol, $distritoAsignado = null)
{
    $hash = password_hash($passwordPlano, PASSWORD_DEFAULT);

    $stmt = $conexion->prepare('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1');
    $stmt->bind_param('s', $usuario);
    $stmt->execute();
    $existe = $stmt->get_result()->fetch_assoc();

    if ($existe) {
        $stmtUpdate = $conexion->prepare('
            UPDATE usuarios
            SET nombre = ?, password_hash = ?, rol = ?, distrito_asignado = ?, activo = 1
            WHERE usuario = ?
        ');
        $stmtUpdate->bind_param('sssis', $nombre, $hash, $rol, $distritoAsignado, $usuario);
        $stmtUpdate->execute();
    } else {
        $stmtInsert = $conexion->prepare('
            INSERT INTO usuarios (nombre, usuario, password_hash, rol, distrito_asignado, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        ');
        $stmtInsert->bind_param('ssssi', $nombre, $usuario, $hash, $rol, $distritoAsignado);
        $stmtInsert->execute();
    }
}

crearOActualizarUsuario($conexion, 'Superusuario 1', 'superusuario1', 'superusuario1', 'superusuario', null);
crearOActualizarUsuario($conexion, 'Superusuario 2', 'superusuario2', 'superusuario2', 'superusuario', null);

for ($i = 1; $i <= 33; $i++) {
    crearOActualizarUsuario(
        $conexion,
        'Distrito ' . $i,
        'distrito' . $i,
        'distrito' . $i,
        'distrito',
        $i
    );
}

echo '<h2>Usuarios creados o actualizados correctamente.</h2>';
echo '<p><strong>Superusuarios:</strong> superusuario1/superusuario1 y superusuario2/superusuario2</p>';
echo '<p><strong>Distritos:</strong> distrito1/distrito1 hasta distrito33/distrito33</p>';
echo '<p style="color:red;"><strong>Importante:</strong> borra este archivo después de ejecutarlo.</p>';
