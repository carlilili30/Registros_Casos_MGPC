<?php

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../helpers/functions.php';

use Dompdf\Dompdf;
use Dompdf\Options;

function generarAcuse($conexion, $registroId)
{
    $stmt = $conexion->prepare('SELECT * FROM registros WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $registroId);
    $stmt->execute();
    $registro = $stmt->get_result()->fetch_assoc();

    if (!$registro) {
        return false;
    }

    $stmtDocs = $conexion->prepare('SELECT * FROM registro_documentos WHERE registro_id = ? ORDER BY fecha_carga ASC');
    $stmtDocs->bind_param('i', $registroId);
    $stmtDocs->execute();
    $documentos = $stmtDocs->get_result();

    $filasDocumentos = '';
    $contador = 1;

    if ($documentos->num_rows > 0) {
        while ($doc = $documentos->fetch_assoc()) {
            $filasDocumentos .= '
                <tr>
                    <td class="centrado">' . $contador . '</td>
                    <td>' . e($doc['nombre_original']) . '</td>
                    <td class="centrado">' . strtoupper(e($doc['extension'])) . '</td>
                    <td class="centrado">' . formatearBytes(intval($doc['peso_bytes'])) . '</td>
                    <td class="centrado">' . e($doc['fecha_carga']) . '</td>
                </tr>';
            $contador++;
        }
    } else {
        $filasDocumentos = '<tr><td colspan="5" class="centrado">No se adjuntaron documentos.</td></tr>';
    }

    $html = '<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 28px 35px 46px 35px; }
            body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #2b2b2b; }
            .encabezado { border-bottom: 3px solid #7A003C; padding-bottom: 12px; margin-bottom: 18px; }
            .institucion { font-size: 17px; font-weight: bold; color: #7A003C; text-align: center; }
            .direccion { font-size: 12px; text-align: center; margin-top: 4px; }
            .sistema { font-size: 10px; text-align: center; color: #555; margin-top: 4px; }
            .titulo { text-align: center; font-size: 18px; font-weight: bold; color: #7A003C; margin: 18px 0; letter-spacing: .5px; }
            .folio-box { border: 2px solid #7A003C; background: #f8f1f5; padding: 14px; margin-bottom: 18px; text-align: center; }
            .folio-label { font-size: 11px; color: #555; }
            .folio { font-size: 22px; color: #7A003C; font-weight: bold; margin: 5px 0; }
            .fecha { font-size: 10px; color: #444; }
            .section-title { background: #7A003C; color: #ffffff; padding: 7px 9px; font-weight: bold; margin-top: 15px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            td, th { border: 1px solid #cfcfcf; padding: 7px; vertical-align: top; }
            th { background: #eeeeee; font-weight: bold; text-align: center; }
            .label { width: 34%; background: #f5f5f5; font-weight: bold; }
            .centrado { text-align: center; }
            .descripcion { line-height: 1.45; text-align: justify; }
            .nota { border: 1px solid #cfcfcf; background: #fafafa; padding: 10px; margin-top: 18px; font-size: 10px; line-height: 1.45; text-align: justify; }
            .pie { position: fixed; bottom: -28px; left: 0; right: 0; height: 30px; border-top: 1px solid #cccccc; text-align: center; font-size: 9px; color: #666666; padding-top: 6px; }
        </style>
    </head>
    <body>
        <div class="encabezado">
            <div class="institucion">Instituto Electoral de la Ciudad de México</div>
            <div class="direccion">Dirección de Geografía y Proyectos Especiales</div>
            <div class="sistema">Sistema de captura de casos para la actualización del Marco Geográfico de Participación Ciudadana</div>
        </div>

        <div class="titulo">ACUSE DE REGISTRO</div>

        <div class="folio-box">
            <div class="folio-label">Folio del registro</div>
            <div class="folio">' . e($registro['folio']) . '</div>
            <div class="fecha">Fecha de registro: ' . e($registro['fecha_registro']) . '</div>
        </div>

        <div class="section-title">Datos del solicitante</div>
        <table>
            <tr><td class="label">Distrito</td><td>' . e($registro['distrito']) . '</td></tr>
            <tr><td class="label">Clave Demarcación Territorial</td><td>' . e($registro['clave_demarcacion']) . '</td></tr>
            <tr><td class="label">Nombre Demarcación Territorial</td><td>' . e($registro['nombre_demarcacion']) . '</td></tr>
            <tr><td class="label">Clave de Unidad Territorial</td><td>' . e($registro['clave_ut']) . '</td></tr>
            <tr><td class="label">Nombre de Unidad Territorial</td><td>' . e($registro['nombre_ut']) . '</td></tr>
            <tr><td class="label">Procedencia de la solicitud</td><td>' . e($registro['procedencia']) . '</td></tr>
            <tr><td class="label">Fecha de recepción del caso</td><td>' . e($registro['fecha_recepcion']) . '</td></tr>
            <tr><td class="label">Área remitente</td><td>' . e($registro['area_remitente']) . '</td></tr>
            <tr><td class="label">Representante de la solicitud</td><td>' . e($registro['representante']) . '</td></tr>
            <tr><td class="label">Contacto</td><td>' . e($registro['contacto']) . '</td></tr>
        </table>

        <div class="section-title">Descripción del caso</div>
        <table>
            <tr><td class="label">Descripción del caso de actualización</td><td class="descripcion">' . nl2br(e($registro['descripcion'])) . '</td></tr>
            <tr><td class="label">Clasificación del caso</td><td>' . e($registro['clasificacion']) . '</td></tr>
            <tr><td class="label">Estatus</td><td>' . e($registro['estatus']) . '</td></tr>
        </table>

        <div class="section-title">Documentación adjunta</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 7%;">No.</th>
                    <th>Nombre del archivo</th>
                    <th style="width: 13%;">Formato</th>
                    <th style="width: 13%;">Peso</th>
                    <th style="width: 22%;">Fecha de carga</th>
                </tr>
            </thead>
            <tbody>' . $filasDocumentos . '</tbody>
        </table>

        <div class="nota">
            Este documento acredita la recepción del registro y de la documentación adjunta en el sistema.
            La solicitud será analizada y determinada conforme a la legislación vigente, procedimientos aplicables
            y criterios aprobados para la actualización del Marco Geográfico de Participación Ciudadana.
        </div>

        <div class="pie">IECM | DEOEyG | Acuse generado automáticamente por el sistema</div>
    </body>
    </html>';

    $options = new Options();
    $options->set('isRemoteEnabled', true);
    $options->set('defaultFont', 'DejaVu Sans');

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('letter', 'portrait');
    $dompdf->render();

    crearCarpetaSiNoExiste(ACUSES_DIR);
    $rutaAcuse = ACUSES_DIR . 'acuse_' . $registro['folio'] . '.pdf';
    file_put_contents($rutaAcuse, $dompdf->output());

    return $rutaAcuse;
}
