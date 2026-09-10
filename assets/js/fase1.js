import {API} from './api.js';
import {CONFIG} from './config.js';
import {qs, qsa, notify, initShell, getSession, localDateTime} from './common.js';

initShell();

const form = qs('#phaseForm');
const dist = qs('#distrito');
const demarcacionTerritorial = qs('#demarcacion_territorial');
const nombre = qs('#nombreUT');
const clave = qs('#claveUT');
const idUT = qs('#id_seccxut');
const listaNombre = qs('#resultadosNombreUT');
const listaClave = qs('#resultadosClaveUT');
const otherBox = qs('#otrasUtSection');
const cantidadField = qs('#cantidadOtrasUtField');
const cantidadInput = qs('#cantidad_otras_ut');
const involucraOtraUT = qs('#involucra_otra_ut');
const contenedorOtrasUt = qs('#contenedorOtrasUt');
const resumenOtrasUt = qs('#resumenOtrasUt');
const cantidadPersonas = qs('#cantidad_personas');
const contenedorSolicitantes = qs('#contenedorSolicitantes');
const contenedorDocumentos = qs('#contenedorDocumentos');

let timer = null;
let seleccionada = null;
let units = [];
const fields = 'id_seccxut,dtto,claveDT,nombreDT,claveUT,nombreUT,seccC,seccP';

function v(objeto, ...claves) {
  for (const key of claves) {
    if (objeto?.[key] !== undefined && objeto?.[key] !== null) return objeto[key];
  }
  return '';
}

function numeroDistrito() {
  const sesion = getSession() || {};
  const raw = v(sesion, 'distrito', 'claveDT', 'numeroDistrito', 'id_distrito');
  const match = String(raw).match(/\d+/);
  const numero = match ? Number(match[0]) : 0;
  return numero >= 1 && numero <= 33 ? numero : 0;
}

function fijarDistrito() {
  const numero = numeroDistrito();
  dist.value = numero ? `Distrito ${numero}` : '';
  if (!numero) notify('La sesión mgpc_session no contiene un distrito válido.', 'error');
}

async function cargarDemarcacionTerritorial() {
  if (!demarcacionTerritorial) return;

  const sesion = getSession() || {};
  const demarcacionSesion = v(
    sesion,
    'nombreDT',
    'demarcacion_territorial',
    'demarcacionTerritorial',
    'alcaldia'
  );

  if (demarcacionSesion) {
    demarcacionTerritorial.value = demarcacionSesion;
    return;
  }

  const distrito = numeroDistrito();
  if (!distrito) return;

  demarcacionTerritorial.value = 'Cargando...';

  try {
    const response = await API.search(CONFIG.tables.territorial, {
      filters: { dtto: distrito },
      operator: 'AND',
      fields: ['dtto', 'nombreDT'],
      limit: 1,
      offset: 0
    });

    const filas = Array.isArray(response?.data) ? response.data : [];
    const fila = filas.find(item => Number(v(item, 'dtto')) === distrito) || filas[0];
    const nombreDemarcacion = v(fila, 'nombreDT');

    if (!nombreDemarcacion) {
      throw new Error(`No se encontró la demarcación territorial del Distrito ${distrito}.`);
    }

    demarcacionTerritorial.value = nombreDemarcacion;
  } catch (error) {
    demarcacionTerritorial.value = '';
    console.error('Error al cargar la demarcación territorial:', error);
    notify(error.message || 'No fue posible cargar la demarcación territorial.', 'error');
  }
}

function cerrarResultados() {
  listaNombre.innerHTML = '';
  listaClave.innerHTML = '';
}

function limpiarSeleccion() {
  seleccionada = null;
  idUT.value = '';
  qs('#seccionesC').value = '';
  qs('#seccionesP').value = '';
}

function valorSecciones(row, completa) {
  const claves = completa
    ? ['seccC', 'secciones_c', 'seccionesCompletas', 'secciones_completas']
    : ['seccP', 'secciones_p', 'seccionesParciales', 'secciones_parciales'];
  return v(row, ...claves);
}

async function cargarSeccionesUT(row) {
  const id = String(v(row, 'id_seccxut', 'id'));
  let detalle = units.find(unit => String(v(unit, 'id_seccxut', 'id')) === id) || row;
  let completas = valorSecciones(detalle, true);
  let parciales = valorSecciones(detalle, false);

  // Si suggest no regresó las secciones y la lista general aún no terminó de cargar,
  // consulta directamente el registro territorial seleccionado.
  if (!completas && !parciales && id) {
    try {
      const response = await API.search(CONFIG.tables.territorial, {
        filters: { id_seccxut: Number(id) },
        operator: 'AND',
        fields: ['id_seccxut', 'seccC', 'seccP'],
        limit: 1,
        offset: 0
      });
      detalle = Array.isArray(response?.data) ? response.data[0] : null;
      completas = valorSecciones(detalle, true);
      parciales = valorSecciones(detalle, false);
    } catch (error) {
      console.error('No fue posible consultar las secciones de la UT:', error);
    }
  }

  qs('#seccionesC').value = completas || '';
  qs('#seccionesP').value = parciales || '';
}

async function seleccionarUT(row) {
  seleccionada = row;
  idUT.value = v(row, 'id_seccxut', 'id');
  clave.value = v(row, 'claveUT');
  nombre.value = v(row, 'nombreUT');
  if (demarcacionTerritorial) demarcacionTerritorial.value = v(row, 'nombreDT');
  qs('#seccionesC').value = 'Cargando...';
  qs('#seccionesP').value = 'Cargando...';
  cerrarResultados();
  llenarOpcionesOtrasUT();
  await cargarSeccionesUT(row);
  console.log('DATOS COMPLETOS DE LA UT:', row);
}

async function sugerirUT(campo, texto, lista) {
  lista.innerHTML = '<li>Buscando...</li>';

  try {
    const distrito = numeroDistrito();

    if (!distrito) {
      throw new Error('No se encontró un distrito válido en la sesión.');
    }

    if (!['claveUT', 'nombreUT'].includes(campo)) {
      throw new Error('Campo de búsqueda no permitido.');
    }

    const params = new URLSearchParams({
      campo,
      q: texto,
      dtto: String(distrito),
      fields,
      limit: '10'
    });

    const path = `/suggest/${CONFIG.tables.territorial}?${params.toString()}`;
    console.log('Ruta suggest filtrada por dtto:', path);

    const response = await fetch(
      `${CONFIG.proxyUrl}?path=${encodeURIComponent(path)}`
    );
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json.error || json.message || `Error API ${response.status}`);
    }

    const resultados = Array.isArray(json.data) ? json.data : [];
    const rows = resultados.filter(row => Number(v(row, 'dtto')) === distrito);

    lista.innerHTML = '';

    if (!rows.length) {
      lista.innerHTML = `<li>Sin resultados en el Distrito ${distrito}</li>`;
      return;
    }

    rows.forEach(row => {
      const li = document.createElement('li');
      li.className = 'ut-opcion';
      li.tabIndex = 0;
      li.setAttribute('role', 'option');

      const claveTexto = document.createElement('span');
      claveTexto.className = 'ut-opcion-clave';
      claveTexto.textContent = v(row, 'claveUT') || 'Sin clave';

      const nombreTexto = document.createElement('span');
      nombreTexto.className = 'ut-opcion-nombre';
      nombreTexto.textContent = v(row, 'nombreUT') || 'Sin nombre';

      li.append(claveTexto, nombreTexto);
      li.addEventListener('click', () => seleccionarUT(row));
      li.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          seleccionarUT(row);
        }
      });

      lista.appendChild(li);
    });
  } catch (error) {
    console.error('Error al consultar suggest:', error);
    lista.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = `Error: ${error.message}`;
    lista.appendChild(li);
  }
}
function activarBusqueda(input, campo, lista, otraLista) {
  input.addEventListener('input', () => {
    clearTimeout(timer);
    limpiarSeleccion();
    otraLista.innerHTML = '';
    const texto = input.value.trim();
    if (texto.length < 2) {
      lista.innerHTML = '';
      return;
    }
    timer = setTimeout(() => sugerirUT(campo, texto, lista), 300);
  });
}

function obtenerSelectsOtrasUT() {
  return qsa('.otra-ut', contenedorOtrasUt);
}

async function cargarUTDistrito() {
  try {
    // Consulta general para las UT adicionales, sin filtrar por dtto ni claveDT.
    const response = await API.search(CONFIG.tables.territorial, {
      filters: {},
      operator: 'AND',
      fields: [
        'id_seccxut',
        'dtto',
        'nombreDT',
        'claveDT',
        'nombreDT',
        'claveUT',
        'nombreUT',
        'seccC',
        'seccP'
      ],
      limit: 5000,
      offset: 0
    });

    units = Array.isArray(response.data) ? response.data : [];
    const distritoActual = numeroDistrito();
    const unidadDistrito = units.find(unit => Number(v(unit, 'dtto')) === distritoActual);
    if (demarcacionTerritorial && unidadDistrito) {
      demarcacionTerritorial.value = v(unidadDistrito, 'nombreDT');
    }

    // Orden alfanumérico ascendente por claveUT.
    units.sort((a, b) =>
      String(v(a, 'claveUT')).trim().localeCompare(
        String(v(b, 'claveUT')).trim(),
        'es',
        {
          numeric: true,
          sensitivity: 'base'
        }
      )
    );

    llenarOpcionesOtrasUT();
  } catch (error) {
    units = [];
    console.error('No fue posible cargar las UT adicionales:', error);
    notify(
      error.message || 'No fue posible cargar las UT adicionales.',
      'error'
    );
  }
}
function llenarOpcionesOtrasUT() {
  const selects = obtenerSelectsOtrasUT();
  if (!selects.length) return;

  const idPrincipal = String(idUT.value || '');
  const seleccionados = selects.map(select => select.value).filter(Boolean);

  selects.forEach(select => {
    const conservar = select.value;
    select.innerHTML = '<option value="">Seleccione una UT</option>';

    units
      .filter(unit => String(v(unit, 'id_seccxut', 'id')) !== idPrincipal)
      .forEach(unit => {
        const id = String(v(unit, 'id_seccxut', 'id'));
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${v(unit, 'claveUT')} · ${v(unit, 'nombreUT')}`;
        option.disabled = seleccionados.includes(id) && id !== conservar;
        select.appendChild(option);
      });

    if ([...select.options].some(option => option.value === conservar)) select.value = conservar;
  });
}

function generarCamposOtrasUT(cantidad) {
  contenedorOtrasUt.innerHTML = '';
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    resumenOtrasUt.textContent = '';
    otherBox.classList.add('hidden');
    return;
  }

  otherBox.classList.remove('hidden');
  resumenOtrasUt.textContent = `Seleccione ${cantidad} UT adicional${cantidad === 1 ? '' : 'es'}.`;

  for (let index = 1; index <= cantidad; index++) {
    const field = document.createElement('div');
    field.className = 'field col-6';
    const label = document.createElement('label');
    label.htmlFor = `otra_ut_${index}`;
    label.className = 'required';
    label.textContent = `Unidad Territorial adicional ${index}`;
    const select = document.createElement('select');
    select.id = `otra_ut_${index}`;
    select.name = 'otras_ut[]';
    select.className = 'otra-ut';
    select.required = true;
    select.innerHTML = '<option value="">Seleccione una UT</option>';
    select.addEventListener('change', llenarOpcionesOtrasUT);
    field.append(label, select);
    contenedorOtrasUt.appendChild(field);
  }
  llenarOpcionesOtrasUT();
}

function alternarOtrasUT() {
  const si = involucraOtraUT?.value === 'Sí';
  cantidadField.classList.toggle('hidden', !si);
  cantidadInput.disabled = !si;
  cantidadInput.required = si;

  if (!si) {
    cantidadInput.value = '';
    contenedorOtrasUt.innerHTML = '';
    resumenOtrasUt.textContent = '';
    otherBox.classList.add('hidden');
    return;
  }

  const cantidad = Number(cantidadInput.value);
  if (Number.isInteger(cantidad) && cantidad >= 1) generarCamposOtrasUT(cantidad);
}

function validarOtrasUT() {
  if (involucraOtraUT?.value !== 'Sí') return [];

  const cantidad = Number(cantidadInput.value);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
    throw new Error('Indique una cantidad de UT adicionales entre 1 y 20.');
  }

  const selects = obtenerSelectsOtrasUT();
  if (selects.length !== cantidad) throw new Error('La cantidad de UT adicionales no coincide con los campos mostrados.');

  const valores = selects.map(select => select.value).filter(Boolean);
  if (valores.length !== cantidad) throw new Error(`Seleccione las ${cantidad} UT adicionales.`);
  if (new Set(valores).size !== valores.length) throw new Error('No puede repetir una UT adicional.');
  if (valores.includes(String(idUT.value))) throw new Error('La UT principal no puede agregarse como UT adicional.');
  return valores;
}

async function guardarOtrasUT(idCaso, idsSeccxut) {
  for (const idSeccxut of idsSeccxut) {
    await API.create(CONFIG.tables.caseAdditionalUTs, {
      id_caso: Number(idCaso),
      id_seccxut: Number(idSeccxut)
    });
  }
}

function leerSolicitantesActuales() {
  if (!contenedorSolicitantes) return [];
  return qsa('.solicitante-card', contenedorSolicitantes).map(card => ({
    nombre_solicitante: card.querySelector('.sol_nombre')?.value.trim() || '',
    telefono: card.querySelector('.sol_telefono')?.value.trim() || '',
    correo: card.querySelector('.sol_correo')?.value.trim() || '',
    domicilio: card.querySelector('.sol_domicilio')?.value.trim() || ''
  }));
}

function generarSolicitantes(cantidad) {
  if (!contenedorSolicitantes) return;
  const anteriores = leerSolicitantesActuales();
  contenedorSolicitantes.innerHTML = '';
  if (!Number.isInteger(cantidad) || cantidad < 1) return;

  for (let i = 0; i < cantidad; i++) {
    const numero = i + 1;
    const datos = anteriores[i] || {};
    const card = document.createElement('section');
    card.className = 'card solicitante-card';
    card.innerHTML = `
      <h3>Solicitante ${numero}</h3>
      <div class="grid">
        <div class="field col-6">
          <label for="sol_nombre_${numero}" class="required">Nombre del solicitante</label>
          <input id="sol_nombre_${numero}" class="sol_nombre" type="text" maxlength="200" required>
        </div>
        <div class="field col-3">
          <label for="sol_telefono_${numero}">Teléfono</label>
          <input id="sol_telefono_${numero}" class="sol_telefono" type="tel" maxlength="30">
        </div>
        <div class="field col-3">
          <label for="sol_correo_${numero}">Correo</label>
          <input id="sol_correo_${numero}" class="sol_correo" type="email" maxlength="150">
        </div>
        <div class="field col-12">
          <label for="sol_domicilio_${numero}">Domicilio</label>
          <textarea id="sol_domicilio_${numero}" class="sol_domicilio" rows="3"></textarea>
        </div>
      </div>`;
    contenedorSolicitantes.appendChild(card);
    card.querySelector('.sol_nombre').value = datos.nombre_solicitante || '';
    card.querySelector('.sol_telefono').value = datos.telefono || '';
    card.querySelector('.sol_correo').value = datos.correo || '';
    card.querySelector('.sol_domicilio').value = datos.domicilio || '';
  }
}

function obtenerSolicitantes() {
  const personas = leerSolicitantesActuales();
  if (!personas.length) throw new Error('Debe registrar al menos una persona solicitante.');
  personas.forEach((persona, i) => {
    if (!persona.nombre_solicitante) throw new Error(`Escriba el nombre del solicitante ${i + 1}.`);
    if (persona.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(persona.correo)) throw new Error(`El correo del solicitante ${i + 1} no es válido.`);
  });
  return personas;
}

async function guardarSolicitantes(idCaso, personas) {
  for (let i = 0; i < personas.length; i++) {
    await API.create(CONFIG.tables.caseApplicants, {
      id_caso: Number(idCaso),
      nombre: personas[i].nombre_solicitante,
      telefono: personas[i].telefono || null,
      correo: personas[i].correo || null,
      domicilio: personas[i].domicilio || null,
      principal: i === 0 ? 1 : 0
    });
  }
}

const REGLAS_DOCUMENTOS = {
  Planos: {
    accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
    extensiones: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    ayuda: 'PDF, DOC, DOCX, JPG, JPEG o PNG'
  },
  Oficios: {
    accept: '.pdf,.doc,.docx',
    extensiones: ['pdf', 'doc', 'docx'],
    ayuda: 'PDF, DOC o DOCX'
  },
  Correos: {
    accept: '.eml,.msg,.pdf',
    extensiones: ['eml', 'msg', 'pdf'],
    ayuda: 'EML, MSG o PDF'
  },
  'Escritos de solicitud': {
    accept: '.pdf',
    extensiones: ['pdf'],
    ayuda: 'PDF'
  },
  'Fotografías': {
    accept: '.jpg,.jpeg,.png',
    extensiones: ['jpg', 'jpeg', 'png'],
    ayuda: 'JPG, JPEG o PNG'
  }
};

function idDocumento(tipo) {
  return `doc_${tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function alternarDocumento(checkbox) {
  if (!contenedorDocumentos) return;
  const tipo = checkbox.value;
  const regla = REGLAS_DOCUMENTOS[tipo];
  const id = idDocumento(tipo);
  const existente = document.getElementById(id);

  if (!checkbox.checked) {
    existente?.remove();
    return;
  }
  if (existente || !regla) return;

  const campo = document.createElement('div');
  campo.id = id;
  campo.className = 'field col-6 documento-carga';
  campo.innerHTML = `
    <label for="archivo_${id}">Archivos de ${tipo}</label>
    <input id="archivo_${id}" type="file" class="archivo-documento" data-tipo="${tipo}" multiple accept="${regla.accept}">
    <small class="muted">Puede elegir uno o varios archivos: ${regla.ayuda}.</small>`;
  contenedorDocumentos.appendChild(campo);
}

function configurarDocumentos() {
  qsa('.tipoDoc').forEach(checkbox => {
    checkbox.addEventListener('change', () => alternarDocumento(checkbox));
  });
}

function extensionArchivo(nombreArchivo) {
  const partes = String(nombreArchivo || '').toLowerCase().split('.');
  return partes.length > 1 ? partes.pop() : '';
}

function validarArchivo(archivo, tipo) {
  const regla = REGLAS_DOCUMENTOS[tipo];
  if (!regla) throw new Error(`El tipo de documento ${tipo} no está permitido.`);
  if (archivo.size > CONFIG.maxFileMB * 1024 * 1024) {
    throw new Error(`El archivo ${archivo.name} supera ${CONFIG.maxFileMB} MB.`);
  }
  const extension = extensionArchivo(archivo.name);
  if (!regla.extensiones.includes(extension)) {
    throw new Error(`El archivo ${archivo.name} no es válido para ${tipo}. Formatos permitidos: ${regla.ayuda}.`);
  }
}

async function guardarDocumentos(idCaso) {
  const inputs = contenedorDocumentos ? qsa('.archivo-documento', contenedorDocumentos) : [];
  for (const input of inputs) {
    const tipo = input.dataset.tipo || '';
    const archivos = Array.from(input.files || []);
    if (!archivos.length) continue;

    for (const archivoOriginal of archivos) {
      validarArchivo(archivoOriginal, tipo);
      const formData = new FormData();
      formData.append('file', archivoOriginal, archivoOriginal.name);
      formData.append('descripcion', tipo);

      const carga = await API.upload(CONFIG.tables.files, formData);
      const subidos = Array.isArray(carga?.subidos)
        ? carga.subidos
        : (carga?.id || carga?.id_archivo ? [carga] : []);
      if (!subidos.length) {
        throw new Error(`La API no devolvió el identificador del archivo ${archivoOriginal.name}.`);
      }

      for (const archivoSubido of subidos) {
        const idArchivo = Number(archivoSubido.id || archivoSubido.id_archivo);
        if (!idArchivo) throw new Error(`No se recibió un identificador válido para ${archivoOriginal.name}.`);
        await API.create(CONFIG.tables.caseFiles, {
          id_caso: Number(idCaso),
          id_archivo: idArchivo,
          fase: 1,
          nombre_original: archivoSubido.nombre_original || archivoSubido.nombre || archivoOriginal.name
        });
      }
    }
  }
}

function crearFolio(numero, id) {
  return `D${String(numero).padStart(2, '0')}-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
}

generarSolicitantes(1);
configurarDocumentos();
if (cantidadPersonas) {
  cantidadPersonas.addEventListener('input', () => {
    let cantidad = Math.trunc(Number(cantidadPersonas.value));
    if (cantidad > 100) {
      cantidad = 100;
      cantidadPersonas.value = '100';
    }
    generarSolicitantes(cantidad >= 1 ? cantidad : 0);
  });
}

activarBusqueda(nombre, 'nombreUT', listaNombre, listaClave);
activarBusqueda(clave, 'claveUT', listaClave, listaNombre);
document.addEventListener('click', event => {
  if (!event.target.closest('.ut-search-container')) cerrarResultados();
});
involucraOtraUT?.addEventListener('change', alternarOtrasUT);
cantidadInput.addEventListener('input', () => {
  if (involucraOtraUT?.value !== 'Sí') return;
  let cantidad = Number(cantidadInput.value);
  if (cantidad > 20) {
    cantidad = 20;
    cantidadInput.value = '20';
    notify('Puede seleccionar un máximo de 20 UT adicionales.', 'error');
  }
  generarCamposOtrasUT(Number.isInteger(cantidad) ? cantidad : 0);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const boton = qs('#submitButton');
  boton.disabled = true;
  boton.textContent = 'Guardando...';

  try {
    const numero = numeroDistrito();
    if (!numero) throw new Error('El distrito de la sesión no es válido.');
    if (!seleccionada || !idUT.value) throw new Error('Seleccione una Unidad Territorial de la lista.');

    const solicitantes = obtenerSolicitantes();
    const contacto = solicitantes[0];
    const otrasUT = validarOtrasUT();

    const extra = {
      id_seccxut: Number(idUT.value),
      claveUT: clave.value.trim(),
      nombreUT: nombre.value.trim(),
      seccionesC: qs('#seccionesC').value.trim(),
      seccionesP: qs('#seccionesP').value.trim(),
      domicilio: contacto.domicilio,
      cantidad_otras_ut: otrasUT.length,
      otras_ut: otrasUT
    };

    const datosCaso = {
      folio: null,
      distrito: dist.value,
      demarcacion_territorial: demarcacionTerritorial?.value.trim() || null,
      unidad_territorial: `${clave.value.trim()} · ${nombre.value.trim()}`,
      nombre_solicitante: contacto.nombre_solicitante,
      telefono: contacto.telefono,
      correo: contacto.correo,
      domicilio: contacto.domicilio,
      tipo_caso: 'Solicitud',
      fecha_solicitud: qs('#fecha_solicitud')?.value || null,
      clasificacion: qs('#clasificacion').value,
      area_remitente: qs('#area_remitente').value,
      procedencia_solicitud: qs('#procedencia_solicitud').value,
      involucra_otra_ut: involucraOtraUT?.value || 'No',
      descripcion: qs('#descripcion').value.trim(),
      medio_solicitud: qs('#medio_solicitud')?.value || null,
      fase_actual: 1,
      estatus: 'REGISTRADO',
      fecha_registro: localDateTime()
    };

    const creacion = await API.create(CONFIG.tables.cases, datosCaso);
    const idCaso = creacion.id;
    if (!idCaso) throw new Error('La API no devolvió el identificador del caso.');

    await guardarSolicitantes(idCaso, solicitantes);
    await guardarOtrasUT(idCaso, otrasUT);

    await API.update(CONFIG.tables.cases, idCaso, {
      folio: crearFolio(numero, idCaso),
      fase_actual: 2
    });

    await API.create(CONFIG.tables.phases, {
      id_caso: Number(idCaso),
      fase: 1,
      estatus: 'CONCLUIDA',
      observaciones: 'Registro inicial',
      datos_json: JSON.stringify(extra),
      fecha_fin: localDateTime()
    });

    await guardarDocumentos(idCaso);

    localStorage.setItem('mgpc_current_case', idCaso);
    location.href = `fase2-sistema-sam.html?id=${idCaso}`;
  } catch (error) {
    console.error('Error al registrar el caso:', error);
    notify(error.message || 'No fue posible guardar el registro.', 'error');
    boton.disabled = false;
    boton.textContent = 'Guardar y siguiente';
  }
});

fijarDistrito();
cargarDemarcacionTerritorial();
alternarOtrasUT();
cargarUTDistrito();
