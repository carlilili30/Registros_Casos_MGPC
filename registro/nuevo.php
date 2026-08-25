<?php
require_once __DIR__ . '/../helpers/auth.php';
requerirLogin();
require_once __DIR__ . '/../layouts/header.php';

$distritoUsuario = usuarioActualDistrito();
?>

<h1>Registro de solicitud</h1>
<p>Captura los datos de la solicitud y adjunta la documentación soporte en PDF o imagen.</p>

<form action="guardar.php" method="POST" enctype="multipart/form-data" class="formulario">
    <section class="panel">
        <h2>Datos del solicitante</h2>

        <div class="grid-2">
            <div>
                <label>Distrito *</label>
                <?php if (esUsuarioDistrito()): ?>
                    <input type="text" value="Distrito <?php echo intval($distritoUsuario); ?>" readonly>
                    <input type="hidden" name="distrito" value="<?php echo intval($distritoUsuario); ?>">
                <?php else: ?>
                    <select name="distrito" required>
                        <option value="">Seleccionar...</option>
                        <?php for ($i = 1; $i <= 33; $i++): ?>
                            <option value="<?php echo $i; ?>">Distrito <?php echo $i; ?></option>
                        <?php endfor; ?>
                    </select>
                <?php endif; ?>
            </div>
            <div>
                <label>Clave Demarcación Territorial</label>
                <input type="text" name="clave_demarcacion">
            </div>
            <div>
                <label>Nombre Demarcación Territorial</label>
                <input type="text" name="nombre_demarcacion">
            </div>
            <div>
                <label>Clave de Unidad Territorial</label>
                <input type="text" name="clave_ut">
            </div>
            <div>
                <label>Nombre de Unidad Territorial</label>
                <input type="text" name="nombre_ut">
            </div>
            <div>
                <label>Procedencia de la solicitud *</label>
                <select name="procedencia" required>
                    <option value="">Seleccionar...</option>
                    <option value="Ciudadanía">Ciudadanía</option>
                    <option value="Órganos Desconcentrados">Órganos Desconcentrados</option>
                    <option value="Oficinas Centrales">Oficinas Centrales</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div>
                <label>Fecha de recepción del caso *</label>
                <input type="date" name="fecha_recepcion" required>
            </div>
            <div>
                <label>Área remitente *</label>
                <select name="area_remitente" required>
                    <option value="">Seleccionar...</option>
                    <option value="Presidencia">Presidencia</option>
                    <option value="Secretaría Ejecutiva">Secretaría Ejecutiva</option>
                    <option value="Oficina de Transparencia">Oficina de Transparencia</option>
                    <option value="Órganos Desconcentrados">Órganos Desconcentrados</option>
                    <option value="Dirección Ejecutiva de Organización Electoral y Geoestadística">Dirección Ejecutiva de Organización Electoral y Geoestadística</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div>
                <label>Representante de la solicitud *</label>
                <input type="text" name="representante" required>
            </div>
            <div>
                <label>Contacto *</label>
                <input type="text" name="contacto" required>
            </div>
        </div>
    </section>

    <section class="panel">
        <h2>Descripción del caso</h2>

        <label>Descripción del caso de actualización *</label>
        <textarea name="descripcion" rows="6" required></textarea>

        <label>Clasificación del caso *</label>
        <select name="clasificacion" required>
            <option value="">Seleccionar...</option>
            <option value="División">División</option>
            <option value="Fusión">Fusión</option>
            <option value="Cambio de Nomenclatura">Cambio de Nomenclatura</option>
            <option value="Inclusión/Exclusión de Secciones Electorales">Inclusión/Exclusión de Secciones Electorales</option>
            <option value="Inclusión/Exclusión de Manzanas">Inclusión/Exclusión de Manzanas</option>
            <option value="Combinación">Combinación</option>
            <option value="Otro">Otro</option>
        </select>
    </section>

    <section class="panel">
        <h2>Documentación soporte</h2>

        <label>Adjuntar documentos *</label>
        <input type="file" name="documentos[]" multiple accept=".pdf,.jpg,.jpeg,.png" required>

        <div class="ayuda">
            Formatos permitidos: PDF, JPG, JPEG y PNG. Tamaño máximo: 15 MB por archivo.
        </div>
    </section>

    <button type="submit">Guardar registro y generar acuse</button>
</form>

<?php require_once __DIR__ . '/../layouts/footer.php'; ?>
