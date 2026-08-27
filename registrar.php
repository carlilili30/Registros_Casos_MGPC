<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/inicio.php';
exigir_sesion();

/*
 * registrar.php
 *
 * Este único archivo realiza:
 * 1. Consulta AJAX de las UT del distrito de la sesión.
 * 2. Despliegue de toda la información de seccxut.
 * 3. Validación de la UT seleccionada.
 * 4. Registro del caso en casos_actualizacion.
 * 5. Generación del folio y redirección al acuse.
 */

$idDistritoSesion = (int) (usuario()['id_distrito'] ?? 0);
$numeroDistritoSesion = (int) (usuario()['numero_distrito'] ?? 0);

/*
 * Si numero_distrito no quedó almacenado en la sesión,
 * se obtiene mediante id_distrito.
 */
if (!$numeroDistritoSesion && $idDistritoSesion) {
    $consultaDistrito = bd()->prepare(
        'SELECT numero_distrito
         FROM distritos
         WHERE id_distrito = ?
         LIMIT 1'
    );
    $consultaDistrito->bind_param('i', $idDistritoSesion);
    $consultaDistrito->execute();

    $numeroDistritoSesion = (int) (
        $consultaDistrito->get_result()->fetch_row()[0] ?? 0
    );
}

/*
 * Endpoint AJAX dentro del mismo archivo.
 * La URL utilizada por JavaScript será:
 * registrar.php?accion=unidades
 */
if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    ($_GET['accion'] ?? '') === 'unidades'
) {
    header('Content-Type: application/json; charset=utf-8');

    try {
        if (!$idDistritoSesion || !$numeroDistritoSesion) {
            throw new RuntimeException(
                'El usuario no tiene un Distrito Local asignado.'
            );
        }

        $consultaUT = bd()->prepare(
            'SELECT
                id_seccxut,
                claveDT,
                nombreDT,
                dtto,
                claveUT,
                nombreUT,
                seccionesC,
                seccionesP,
                tipoUT
             FROM seccxut
             WHERE dtto = ?
             ORDER BY claveUT, nombreUT'
        );
        $consultaUT->bind_param('i', $numeroDistritoSesion);
        $consultaUT->execute();

        $unidadesTerritoriales = $consultaUT
            ->get_result()
            ->fetch_all(MYSQLI_ASSOC);

        echo json_encode(
            [
                'correcto' => true,
                'numero_distrito' => $numeroDistritoSesion,
                'total' => count($unidadesTerritoriales),
                'unidades' => $unidadesTerritoriales
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    } catch (Throwable $error) {
        http_response_code(400);

        echo json_encode(
            [
                'correcto' => false,
                'mensaje' => $error->getMessage(),
                'unidades' => []
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    }

    exit;
}

/*
 * Impide abrir el formulario si la cuenta no tiene distrito.
 */
if (!$idDistritoSesion || !$numeroDistritoSesion) {
    mensaje(
        'El usuario que inició sesión no tiene un Distrito Local asignado.',
        'error'
    );

    ir('panel.php');
}

/*
 * Procesamiento del formulario.
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        validar_token();

        $idSeccxut = (int) ($_POST['id_seccxut'] ?? 0);

        if (!$idSeccxut) {
            throw new RuntimeException(
                'Seleccione una Unidad Territorial.'
            );
        }

        /*
         * Se vuelve a consultar la UT en el servidor.
         * No se confía únicamente en los datos mostrados por JavaScript.
         */
        $consultaUT = bd()->prepare(
            'SELECT
                id_seccxut,
                claveDT,
                nombreDT,
                dtto,
                claveUT,
                nombreUT,
                seccionesC,
                seccionesP,
                tipoUT
             FROM seccxut
             WHERE id_seccxut = ?
               AND dtto = ?
             LIMIT 1'
        );
        $consultaUT->bind_param(
            'ii',
            $idSeccxut,
            $numeroDistritoSesion
        );
        $consultaUT->execute();

        $unidadTerritorial = $consultaUT
            ->get_result()
            ->fetch_assoc();

        if (!$unidadTerritorial) {
            throw new RuntimeException(
                'La Unidad Territorial seleccionada no corresponde al Distrito Local de la sesión.'
            );
        }

        $nombreSolicitante = trim(
            (string) ($_POST['nombre_solicitante'] ?? '')
        );
        $tipoSolicitante = trim(
            (string) ($_POST['tipo_solicitante'] ?? '')
        );
        $correo = trim(
            (string) ($_POST['correo'] ?? '')
        );
        $telefono = trim(
            (string) ($_POST['telefono'] ?? '')
        );
        $fechaRecepcion = trim(
            (string) ($_POST['fecha_recepcion'] ?? '')
        );
        $medioRecepcion = trim(
            (string) ($_POST['medio_recepcion'] ?? '')
        );
        $descripcionSolicitud = trim(
            (string) ($_POST['descripcion'] ?? '')
        );

        if ($nombreSolicitante === '') {
            throw new RuntimeException(
                'Capture el nombre o denominación solicitante.'
            );
        }

        if ($tipoSolicitante === '') {
            throw new RuntimeException(
                'Seleccione el tipo de solicitante.'
            );
        }

        if ($fechaRecepcion === '') {
            throw new RuntimeException(
                'Seleccione la fecha de recepción.'
            );
        }

        if ($medioRecepcion === '') {
            throw new RuntimeException(
                'Seleccione el medio de recepción.'
            );
        }

        if ($descripcionSolicitud === '') {
            throw new RuntimeException(
                'Capture la descripción de la solicitud.'
            );
        }

        if (
            $correo !== '' &&
            !filter_var($correo, FILTER_VALIDATE_EMAIL)
        ) {
            throw new RuntimeException(
                'El correo electrónico no tiene un formato válido.'
            );
        }

        $uuidRegistro = bin2hex(random_bytes(16));
        $idUsuarioRegistro = (int) usuario()['id_usuario'];

        /*
         * Guarda una copia de todos los datos de seccxut
         * utilizados en el momento del registro.
         *
         * La tabla casos_actualizacion debe contar con tipo_ut.
         */
        $insertarCaso = bd()->prepare(
            "INSERT INTO casos_actualizacion (
                uuid_registro,
                id_distrito,
                id_usuario_registro,
                id_seccxut,
                clave_demarcacion,
                nombre_demarcacion,
                clave_ut,
                nombre_ut,
                tipo_ut,
                secciones_c,
                secciones_p,
                nombre_solicitante,
                tipo_solicitante,
                correo,
                telefono,
                fecha_recepcion,
                medio_recepcion,
                descripcion_solicitud,
                estado,
                fase_actual
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                'REGISTRADO', 1
            )"
        );

        $insertarCaso->bind_param(
            'siiiisssssssssssss',
            $uuidRegistro,
            $idDistritoSesion,
            $idUsuarioRegistro,
            $unidadTerritorial['id_seccxut'],
            $unidadTerritorial['claveDT'],
            $unidadTerritorial['nombreDT'],
            $unidadTerritorial['claveUT'],
            $unidadTerritorial['nombreUT'],
            $unidadTerritorial['tipoUT'],
            $unidadTerritorial['seccionesC'],
            $unidadTerritorial['seccionesP'],
            $nombreSolicitante,
            $tipoSolicitante,
            $correo,
            $telefono,
            $fechaRecepcion,
            $medioRecepcion,
            $descripcionSolicitud
        );
        $insertarCaso->execute();

        $idCaso = $insertarCaso->insert_id;
        $folioCaso = folio($numeroDistritoSesion, $idCaso);

        $actualizarFolio = bd()->prepare(
            'UPDATE casos_actualizacion
             SET folio = ?
             WHERE id_caso = ?'
        );
        $actualizarFolio->bind_param(
            'si',
            $folioCaso,
            $idCaso
        );
        $actualizarFolio->execute();

        bitacora(
            'REGISTRO_CASO',
            $idCaso,
            'UT seleccionada de seccxut. ' .
            'ID: ' . $unidadTerritorial['id_seccxut'] .
            '. Clave: ' . $unidadTerritorial['claveUT'] .
            '. Nombre: ' . $unidadTerritorial['nombreUT'] .
            '. Tipo: ' . $unidadTerritorial['tipoUT']
        );

        ir('acuse.php?id=' . $idCaso);
    } catch (Throwable $error) {
        mensaje($error->getMessage(), 'error');
        ir('registrar.php');
    }
}

include 'encabezado.php';
?>

<section class="tarjeta">
    <h1>Fase 1. Registro del caso</h1>

    <form method="post" id="formularioRegistro">
        <input
            type="hidden"
            name="token"
            value="<?= token() ?>"
        >

        <div class="rejilla">
            <div>
                <label for="distrito_sesion">
                    Distrito Local
                </label>

                <input
                    id="distrito_sesion"
                    type="text"
                    value="<?= h(
                        str_pad(
                            (string) $numeroDistritoSesion,
                            2,
                            '0',
                            STR_PAD_LEFT
                        )
                    ) ?>"
                    readonly
                >
            </div>

            <div>
                <label for="usuario_registro">
                    Usuario que registra
                </label>

                <input
                    id="usuario_registro"
                    type="text"
                    value="<?= h(
                        usuario()['nombre_completo'] ?? ''
                    ) ?>"
                    readonly
                >
            </div>
        </div>

        <label for="id_seccxut">
            Unidad Territorial
        </label>

        <select
            id="id_seccxut"
            name="id_seccxut"
            required
            disabled
        >
            <option value="">
                Cargando Unidades Territoriales...
            </option>
        </select>

        <div class="rejilla-3">
            <div>
                <label for="claveUT">Clave de Unidad Territorial</label>
                <input id="claveUT" type="text" readonly>
            </div>

            <div>
                <label for="nombreUT">Nombre de Unidad Territorial</label>
                <input id="nombreUT" type="text" readonly>
            </div>

            <div>
                <label for="tipoUT">Tipo de Unidad Territorial</label>
                <input id="tipoUT" type="text" readonly>
            </div>

            <div>
                <label for="claveDT">
                    Clave de Demarcación Territorial
                </label>
                <input id="claveDT" type="text" readonly>
            </div>

            <div>
                <label for="nombreDT">
                    Demarcación Territorial
                </label>
                <input id="nombreDT" type="text" readonly>
            </div>

            <div>
                <label for="dtto">Distrito Local</label>
                <input id="dtto" type="text" readonly>
            </div>

            <div>
                <label for="seccionesC">Secciones Completas</label>
                <textarea
                    id="seccionesC"
                    rows="3"
                    readonly
                ></textarea>
            </div>

            <div>
                <label for="seccionesP">Secciones Parciales</label>
                <textarea
                    id="seccionesP"
                    rows="3"
                    readonly
                ></textarea>
            </div>
        </div>

        <h2>Datos de recepción</h2>

        <div class="rejilla">
            <div>
                <label for="nombre_solicitante">
                    Nombre o denominación solicitante
                </label>
                <input
                    id="nombre_solicitante"
                    name="nombre_solicitante"
                    type="text"
                    maxlength="220"
                    required
                >
            </div>

            <div>
                <label for="tipo_solicitante">
                    Tipo de solicitante
                </label>
                <select
                    id="tipo_solicitante"
                    name="tipo_solicitante"
                    required
                >
                    <option value="Ciudadanía">Ciudadanía</option>
                    <option value="COPACO">COPACO</option>
                    <option value="Dirección Distrital">
                        Dirección Distrital
                    </option>
                    <option value="Área central">Área central</option>
                    <option value="Autoridad">Autoridad</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>

            <div>
                <label for="correo">Correo electrónico</label>
                <input
                    id="correo"
                    type="email"
                    name="correo"
                    maxlength="160"
                >
            </div>

            <div>
                <label for="telefono">Teléfono</label>
                <input
                    id="telefono"
                    type="text"
                    name="telefono"
                    maxlength="60"
                >
            </div>

            <div>
                <label for="fecha_recepcion">
                    Fecha de recepción
                </label>
                <input
                    id="fecha_recepcion"
                    type="date"
                    name="fecha_recepcion"
                    required
                >
            </div>

            <div>
                <label for="medio_recepcion">
                    Medio de recepción
                </label>
                <select
                    id="medio_recepcion"
                    name="medio_recepcion"
                    required
                >
                    <option value="Presencial">Presencial</option>
                    <option value="Correo electrónico">
                        Correo electrónico
                    </option>
                    <option value="Oficialía de Partes">
                        Oficialía de Partes
                    </option>
                    <option value="Oficio">Oficio</option>
                    <option value="Canalización interna">
                        Canalización interna
                    </option>
                </select>
            </div>
        </div>

        <label for="descripcion">
            Descripción de la solicitud
        </label>

        <textarea
            id="descripcion"
            name="descripcion"
            rows="6"
            required
        ></textarea>

        <button class="boton" type="submit">
            Registrar y generar acuse
        </button>
    </form>
</section>

<script>
'use strict';

document.addEventListener(
    'DOMContentLoaded',
    cargarUnidadesTerritoriales
);

let unidadesTerritoriales = [];

const selectorUnidad = document.getElementById('id_seccxut');

/*
 * Carga las UT a partir del distrito del usuario de la sesión.
 * La consulta se realiza en este mismo archivo:
 * registrar.php?accion=unidades
 */
async function cargarUnidadesTerritoriales() {
    selectorUnidad.disabled = true;
    selectorUnidad.innerHTML =
        '<option value="">' +
        'Cargando Unidades Territoriales...' +
        '</option>';

    limpiarDatosUnidad();

    try {
        const respuesta = await fetch(
            'registrar.php?accion=unidades',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.correcto) {
            throw new Error(
                resultado.mensaje ||
                'No fue posible consultar las Unidades Territoriales.'
            );
        }

        unidadesTerritoriales = resultado.unidades || [];

        if (unidadesTerritoriales.length === 0) {
            selectorUnidad.innerHTML =
                '<option value="">' +
                'No existen UT asignadas a este Distrito Local' +
                '</option>';
            return;
        }

        selectorUnidad.innerHTML =
            '<option value="">' +
            'Seleccione una Unidad Territorial' +
            '</option>' +
            unidadesTerritoriales
                .map(unidad => {
                    const tipo = unidad.tipoUT
                        ? ' · ' + unidad.tipoUT
                        : '';

                    return (
                        '<option value="' +
                        unidad.id_seccxut +
                        '">' +
                        unidad.claveUT +
                        ' · ' +
                        unidad.nombreUT +
                        tipo +
                        '</option>'
                    );
                })
                .join('');

        selectorUnidad.disabled = false;
    } catch (error) {
        console.error(error);
        unidadesTerritoriales = [];
        selectorUnidad.innerHTML =
            '<option value="">' +
            'Error al cargar las Unidades Territoriales' +
            '</option>';
        limpiarDatosUnidad();
        alert(error.message);
    }
}

function mostrarDatosUnidad() {
    const idSeleccionado = selectorUnidad.value;

    const unidad = unidadesTerritoriales.find(
        elemento =>
            String(elemento.id_seccxut) ===
            String(idSeleccionado)
    );

    if (!unidad) {
        limpiarDatosUnidad();
        return;
    }

    document.getElementById('claveUT').value =
        unidad.claveUT || '';
    document.getElementById('nombreUT').value =
        unidad.nombreUT || '';
    document.getElementById('tipoUT').value =
        unidad.tipoUT || '';
    document.getElementById('claveDT').value =
        unidad.claveDT || '';
    document.getElementById('nombreDT').value =
        unidad.nombreDT || '';
    document.getElementById('dtto').value =
        unidad.dtto || '';
    document.getElementById('seccionesC').value =
        unidad.seccionesC || '';
    document.getElementById('seccionesP').value =
        unidad.seccionesP || '';
}

function limpiarDatosUnidad() {
    const campos = [
        'claveUT',
        'nombreUT',
        'tipoUT',
        'claveDT',
        'nombreDT',
        'dtto',
        'seccionesC',
        'seccionesP'
    ];

    campos.forEach(idCampo => {
        const campo = document.getElementById(idCampo);
        if (campo) {
            campo.value = '';
        }
    });
}

selectorUnidad.addEventListener(
    'change',
    mostrarDatosUnidad
);
</script>

<?php include 'pie.php'; ?>
