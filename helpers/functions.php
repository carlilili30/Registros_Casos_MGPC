<?php

function e($valor)
{
    return htmlspecialchars($valor ?? '', ENT_QUOTES, 'UTF-8');
}

function limpiarTexto($valor)
{
    return trim($valor ?? '');
}

function limpiarFolio($folio)
{
    return preg_replace('/[^A-Za-z0-9_\-]/', '', $folio ?? '');
}

function formatearBytes($bytes)
{
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    }
    return number_format($bytes / 1024, 2) . ' KB';
}
