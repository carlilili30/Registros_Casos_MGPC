<?php
require_once __DIR__ . '/helpers/auth.php';

if (usuarioAutenticado()) {
    header('Location: dashboard.php');
} else {
    header('Location: login.php');
}
exit;
