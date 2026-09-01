import {API} from './api.js';
import {CONFIG} from './config.js';
import {qs, qsa, notify, initShell, getSession, localDateTime} from './common.js';

initShell();

const form = qs('#phaseForm');
const dist = qs('#distrito');
const nombre = qs('#nombreUT');
const clave = qs('#claveUT');
const idUT = qs('#id_seccxut');
const listaNombre = qs('#resultadosNombreUT');
const listaClave = qs('#resultadosClaveUT');
const otherBox = qs('#otrasUtSection');
const cantidadField = qs('#cantidadOtrasUtField');
const cantidadInput = qs('#cantidad_otras_ut');
const contenedorOtrasUt = qs('#contenedorOtrasUt');
const resumenOtrasUt = qs('#resumenOtrasUt');

let timer = null;
let seleccionada = null;
let units = [];
const fields = 'id_seccxut,claveUT,nombreUT,seccionesC,seccionesP';

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

function seleccionarUT(row) {
  seleccionada = row;
  idUT.value = v(row, 'id_seccxut', 'id');
  clave.value = v(row, 'claveUT');
  nombre.value = v(row, 'nombreUT');
  qs('#seccionesC').value = v(row, 'seccionesC');
  qs('#seccionesP').value = v(row, 'seccionesP');
  cerrarResultados();
  llenarOpcionesOtrasUT();
}

async function sugerirUT(campo, texto, lista) {
  lista.innerHTML = '<li>Buscando...</li>';
  try {
    const params = new URLSearchParams({campo, q: texto, fields, limit: '10'});
    const path = `/suggest/${CONFIG.tables.territorial}?${params.toString()}`;
    const response = await fetch(`${CONFIG.proxyUrl}?path=${encodeURIComponent(path)}`);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || json.message || `Error API ${response.status}`);

    const rows = Array.isArray(json.data) ? json.data : [];
    lista.innerHTML = '';
    if (!rows.length) {
      lista.innerHTML = '<li>Sin resultados</li>';
      return;
    }

    rows.forEach(row => {
      const li = document.createElement('li');
      li.className = 'ut-opcion';
      li.tabIndex = 0;
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
  const numero = numeroDistrito();
  if (!numero) return;
  try {
    const response = await API.search(CONFIG.tables.territorial, {
      filters: {claveDT: numero},
      operator: 'AND',
      fields: ['id_seccxut', 'claveUT', 'nombreUT', 'seccionesC', 'seccionesP'],
      limit: 5000
    });
    units = Array.isArray(response.data) ? response.data : [];
    llenarOpcionesOtrasUT();
  } catch (error) {
    console.error('No fue posible cargar las UT del distrito:', error);
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
  const si = qs('#involucra_otra_ut').value === 'Sí';
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
  if (qs('#involucra_otra_ut').value !== 'Sí') return [];

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

function obtenerDatosContacto() {
  return {
    nombre_solicitante: qs('#nombre_solicitante').value.trim(),
    telefono: qs('#telefono').value.trim(),
    correo: qs('#correo').value.trim(),
    domicilio: qs('#domicilio').value.trim()
  };
}

function validarDatosContacto(datos) {
  if (!datos.nombre_solicitante) throw new Error('Escriba el nombre del solicitante.');
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) throw new Error('Escriba un correo electrónico válido.');
  if (datos.telefono && !/^[0-9+\s()\-]{7,20}$/.test(datos.telefono)) throw new Error('El teléfono contiene caracteres no válidos.');
}

function crearFolio(numero, id) {
  return `D${String(numero).padStart(2, '0')}-${new Date().getFullYear()}-${String(id).padStart(6, '0')}`;
}

activarBusqueda(nombre, 'nombreUT', listaNombre, listaClave);
activarBusqueda(clave, 'claveUT', listaClave, listaNombre);
document.addEventListener('click', event => {
  if (!event.target.closest('.ut-search-container')) cerrarResultados();
});
qs('#involucra_otra_ut').addEventListener('change', alternarOtrasUT);
cantidadInput.addEventListener('input', () => {
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

    const contacto = obtenerDatosContacto();
    validarDatosContacto(contacto);
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
      unidad_territorial: `${clave.value.trim()} · ${nombre.value.trim()}`,
      nombre_solicitante: contacto.nombre_solicitante,
      telefono: contacto.telefono,
      correo: contacto.correo,
      domicilio: contacto.domicilio,
      tipo_caso: 'Solicitud',
      clasificacion: qs('#clasificacion').value,
      involucra_otra_ut: qs('#involucra_otra_ut').value,
      descripcion: qs('#descripcion').value.trim(),
      medio_solicitud: qs('#medio_solicitud').value,
      fase_actual: 1,
      estatus: 'REGISTRADO',
      fecha_registro: localDateTime()
    };

    const creacion = await API.create(CONFIG.tables.cases, datosCaso);
    const idCaso = creacion.id;
    if (!idCaso) throw new Error('La API no devolvió el identificador del caso.');

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

    const archivos = Array.from(qs('#archivos').files || []);
    if (archivos.length) {
      const formData = new FormData();
      archivos.forEach(archivo => formData.append('files[]', archivo));
      formData.append('descripcion', `Caso ${idCaso}, fase 1`);
      const carga = await API.upload(CONFIG.tables.files, formData);
      for (const archivo of carga.subidos || []) {
        await API.create(CONFIG.tables.caseFiles, {
          id_caso: Number(idCaso),
          id_archivo: Number(archivo.id),
          fase: 1,
          nombre_original: archivo.nombre_original
        });
      }
    }

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
alternarOtrasUT();
cargarUTDistrito();
