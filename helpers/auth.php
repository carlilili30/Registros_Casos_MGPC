<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/config.php';

function usuarioAutenticado()
{
    return isset($_SESSION['usuario_id']);
}

function requerirLogin()
{
    if (!usuarioAutenticado()) {
        header('Location: ' . urlApp('login.php'));
        exit;
    }
}

function usuarioActualId()
{
    return intval($_SESSION['usuario_id'] ?? 0);
}

function usuarioActualNombre()
{
    return $_SESSION['usuario_nombre'] ?? 'Usuario';
}

function usuarioActualRol()
{
    return $_SESSION['usuario_rol'] ?? '';
}

function usuarioActualDistrito()
{
    if (!isset($_SESSION['usuario_distrito']) || $_SESSION['usuario_distrito'] === '') {
        return null;
    }

    return intval($_SESSION['usuario_distrito']);
}

function esSuperusuario()
{
    return usuarioActualRol() === 'superusuario';
}

function esUsuarioDistrito()
{
    return usuarioActualRol() === 'distrito';
}

function puedeVerDistrito($distrito)
{
    if (esSuperusuario()) {
        return true;
    }

    return intval($distrito) === usuarioActualDistrito();
}
