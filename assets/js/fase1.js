import {API} from './api.js';
import {CONFIG} from './config.js';
import {qs, qsa, notify, initShell, getSession, localDateTime} from './common.js';

initShell();

const form = qs('#phaseForm');
const distritoInput = qs('#distrito');
const nombreInput = qs('#nombreUT');
const claveInput = qs('#claveUT');
const idInput = qs('#id_seccxut');
const resultadosNombre = qs('#resultadosNombreUT');
const resultadosClave = qs('#resultadosClaveUT');
const otrasBox = qs('#otrasUtSection');
const otrasSelect = qsa('.otra-ut');

let debounceTimer;
let utSeleccionada = null;
let unidadesDistrito = [];

const CAMPOS_UT = 'id_seccxut,claveUT,nombreUT,seccionesC,seccionesP';

function valor(objeto, ...claves) {
  for (const clave of claves) {
    if (objeto && objeto[clave] !== undefined && objeto[clave] !== null && objeto[clave] !== '') return objeto[clave];
  }
  return '';
}

function parsearJSON(texto) {
  try { return JSON.parse(texto); } catch (_error) { return null; }
}

function buscarDistritoEnObjeto(objeto, profundidad = 0) {
  if (!objeto || typeof objeto !== 'object' || profundidad > 5) return 0;
  const claves = ['distrito', 'numeroDistrito', 'numero_distrito', 'idDistrito', 'id_distrito', 'claveDT', 'clave_dt', 'district'];
  for (const clave of claves) {
    if (objeto[clave] !== undefined && objeto[clave] !== null) {
      const coincidencia = String(objeto[clave]).match(/\d+/);
      const numero = coincidencia ? Number(coincidencia[0]) : 0;
      if (numero >= 1 && numero <= 33) return numero;
    }
  }
  for (const contenido of Object.values(objeto)) {
    if (contenido && typeof contenido === 'object') {
      const numero = buscarDistritoEnObjeto(contenido, profundidad + 1);
      if (numero) return numero;
    }
  }
  return 0;
}

function obtenerDistritoSesion() {
  const sesionComun = (() => { try { return getSession(); } catch (_error) { return null; } })();
  let numero = buscarDistritoEnObjeto(sesionComun);
  if (numero) return numero;

  const clavesPreferidas = ['usuario', 'sesion', 'session', 'mgpc_session', 'mgpc_user', 'user', 'auth'];
  for (const clave of clavesPreferidas) {
    const crudo = sessionStorage.getItem(clave);
    if (!crudo) continue;
    numero = buscarDistritoEnObjeto(parsearJSON(crudo));
    if (!numero) {
      const coincidencia = String(crudo).match(/(?:distrito|claveDT)[^0-9]{0,12}(\d{1,2})/i);
      numero = coincidencia ? Number(coincidencia[1]) : 0;
    }
    if (numero >= 1 && numero <= 33) return numero;
  }

  for (let i = 0; i < sessionStorage.length; i++) {
    const clave = sessionStorage.key(i);
    const crudo = sessionStorage.getItem(clave);
    numero = buscarDistritoEnObjeto(parsearJSON(crudo));
    if (!numero && /distrito|district|claveDT/i.test(clave || '')) {
      const coincidencia = String(crudo).match(/\d+/);
      numero = coincidencia ? Number(coincidencia[0]) : 0;
    }
    if (numero >= 1 && numero <= 33) return numero;
  }
  return 0;
}

function establecerDistrito() {
  const numero = obtenerDistritoSesion();
  distritoInput.value = numero ? `Distrito ${numero}` : '';
  if (!numero) notify('No se encontró el distrito en sessionStorage. Revise la variable guardada al iniciar sesión.', 'error');
  return numero;
}

function baseUrl() {
  const url = CONFIG.baseUrl || CONFIG.apiUrl || CONFIG.apiURL || CONFIG.API_URL || CONFIG.api?.baseUrl || CONFIG.api?.url;
  if (!url) throw new Error('No se encontró la URL de la API en config.js.');
  return String(url).replace(/\/$/, '');
}

function apiKey() {
  return CONFIG.apiKey || CONFIG.API_KEY || CONFIG.api_key || CONFIG.api?.key || '';
}

function limpiarSeleccion(campoEditado) {
  if (!utSeleccionada) return;
  const valorEsperado = campoEditado === 'nombreUT' ? valor(utSeleccionada, 'nombreUT') : valor(utSeleccionada, 'claveUT');
  const valorActual = campoEditado === 'nombreUT' ? nombreInput.value : claveInput.value;
  if (valorActual !== String(valorEsperado)) {
    utSeleccionada = null;
    idInput.value = '';
    qs('#seccionesC').value = '';
    qs('#seccionesP').value = '';
  }
}

function cerrarResultados() {
  resultadosNombre.innerHTML = '';
  resultadosClave.innerHTML = '';
}

function seleccionarUT(fila) {
  utSeleccionada = fila;
  idInput.value = valor(fila, 'id_seccxut', 'id');
  claveInput.value = valor(fila, 'claveUT');
  nombreInput.value = valor(fila, 'nombreUT');
  qs('#seccionesC').value = valor(fila, 'seccionesC');
  qs('#seccionesP').value = valor(fila, 'seccionesP');
  cerrarResultados();
  llenarOtrasUT();
}

async function buscarUT(campo, texto, lista) {
  lista.innerHTML = '<li>Buscando...</li>';
  try {
    const parametros = new URLSearchParams({campo, q: texto, fields: CAMPOS_UT, limit: '10'});
    if (apiKey()) parametros.set('api_key', apiKey());
    const respuesta = await fetch(`${baseUrl()}/suggest/seccxut?${parametros.toString()}`);
    const json = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(json.error || `Error HTTP ${respuesta.status}`);
    const filas = Array.isArray(json.data) ? json.data : [];
    lista.innerHTML = '';
    if (!filas.length) { lista.innerHTML = '<li>Sin resultados</li>'; return; }
    filas.forEach(fila => {
      const li = document.createElement('li');
      li.className = 'ut-opcion';
      li.tabIndex = 0;
      const clave = document.createElement('span');
      clave.className = 'ut-opcion-clave';
      clave.textContent = valor(fila, 'claveUT') || 'Sin clave';
      const nombre = document.createElement('span');
      nombre.className = 'ut-opcion-nombre';
      nombre.textContent = valor(fila, 'nombreUT') || 'Sin nombre';
      li.append(clave, nombre);
      li.addEventListener('click', () => seleccionarUT(fila));
      li.addEventListener('keydown', evento => {
        if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); seleccionarUT(fila); }
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

function prepararBusqueda(input, campo, lista, grupo) {
  input.addEventListener('focus', () => {
    qs('#grupoNombreUT').classList.remove('campo-busqueda-activo');
    qs('#grupoClaveUT').classList.remove('campo-busqueda-activo');
    grupo.classList.add('campo-busqueda-activo');
  });
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    limpiarSeleccion(campo);
    const texto = input.value.trim();
    const otraLista = lista === resultadosNombre ? resultadosClave : resultadosNombre;
    otraLista.innerHTML = '';
    if (texto.length < 2) { lista.innerHTML = ''; return; }
    debounceTimer = setTimeout(() => buscarUT(campo, texto, lista), 300);
  });
}

async function cargarUTDistrito() {
  const numero = obtenerDistritoSesion();
  if (!numero) return;
  try {
    const respuesta = await API.search(CONFIG.tables.territorial, {filters: {claveDT: numero}, operator: 'AND', limit: 5000});
    unidadesDistrito = Array.isArray(respuesta.data) ? respuesta.data : [];
    llenarOtrasUT();
  } catch (error) { console.error('No se cargaron las UT adicionales:', error); }
}

function llenarOtrasUT() {
  const principal = String(idInput.value || '');
  const elegidas = otrasSelect.map(select => select.value).filter(Boolean);
  otrasSelect.forEach(select => {
    const conservar = select.value;
    select.innerHTML = '<option value="">Seleccione una UT</option>';
    unidadesDistrito.filter(fila => String(valor(fila, 'id_seccxut', 'id')) !== principal).forEach(fila => {
      const id = String(valor(fila, 'id_seccxut', 'id'));
      const opcion = document.createElement('option');
      opcion.value = id;
      opcion.textContent = `${valor(fila, 'claveUT')} · ${valor(fila, 'nombreUT')}`;
      opcion.disabled = elegidas.includes(id) && id !== conservar;
      select.appendChild(opcion);
    });
    select.value = conservar;
  });
}

function alternarOtrasUT() {
  const mostrar = qs('#involucra_otra_ut').value === 'Sí';
  otrasBox.classList.toggle('hidden', !mostrar);
  otrasSelect.forEach(select => { select.disabled = !mostrar; if (!mostrar) select.value = ''; });
  if (mostrar) llenarOtrasUT();
}

function crearFolio(numero, id) {
  return `D${String(numero).padStart(2,'0')}-${new Date().getFullYear()}-${String(id).padStart(6,'0')}`;
}

prepararBusqueda(nombreInput, 'nombreUT', resultadosNombre, qs('#grupoNombreUT'));
prepararBusqueda(claveInput, 'claveUT', resultadosClave, qs('#grupoClaveUT'));
document.addEventListener('click', evento => { if (!evento.target.closest('.ut-search-container')) cerrarResultados(); });
qs('#involucra_otra_ut').addEventListener('change', alternarOtrasUT);
otrasSelect.forEach(select => select.addEventListener('change', llenarOtrasUT));

form.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (!form.reportValidity()) return;
  const boton = qs('#submitButton');
  boton.disabled = true;
  try {
    const numeroDistrito = obtenerDistritoSesion();
    if (!numeroDistrito) throw new Error('No se encontró un distrito válido en sessionStorage.');
    if (!utSeleccionada || !idInput.value) throw new Error('Seleccione una Unidad Territorial de la lista de resultados.');
    const extra = {
      id_seccxut: Number(idInput.value), claveUT: claveInput.value, nombreUT: nombreInput.value,
      seccionesC: qs('#seccionesC').value, seccionesP: qs('#seccionesP').value,
      domicilio: qs('#domicilio').value.trim(), otras_ut: otrasSelect.map(x => x.value).filter(Boolean)
    };
    const datosCaso = {
      folio: null, distrito: distritoInput.value,
      unidad_territorial: `${claveInput.value} · ${nombreInput.value}`,
      nombre_solicitante: qs('#nombre_solicitante').value.trim(), telefono: qs('#telefono').value.trim(),
      correo: qs('#correo').value.trim(), tipo_caso: qs('#tipo_caso').value,
      clasificacion: qs('#clasificacion').value, involucra_otra_ut: qs('#involucra_otra_ut').value,
      descripcion: qs('#descripcion').value.trim(), medio_solicitud: qs('#medio_solicitud').value,
      fase_actual: 1, estatus: 'REGISTRADO', fecha_registro: localDateTime()
    };
    const creado = await API.create(CONFIG.tables.cases, datosCaso);
    const id = creado.id;
    if (!id) throw new Error('La API no devolvió el identificador del caso.');
    await API.update(CONFIG.tables.cases, id, {folio: crearFolio(numeroDistrito, id), fase_actual: 2});
    await API.create(CONFIG.tables.phases, {id_caso: Number(id), fase: 1, estatus: 'CONCLUIDA', observaciones: 'Registro inicial', datos_json: JSON.stringify(extra), fecha_fin: localDateTime()});
    const archivos = Array.from(qs('#archivos').files || []);
    if (archivos.length) {
      const fd = new FormData();
      archivos.forEach(archivo => fd.append('files[]', archivo));
      fd.append('descripcion', `Caso ${id}, fase 1`);
      const carga = await API.upload(CONFIG.tables.files, fd);
      for (const archivo of carga.subidos || []) await API.create(CONFIG.tables.caseFiles, {id_caso: Number(id), id_archivo: Number(archivo.id), fase: 1, nombre_original: archivo.nombre_original});
    }
    localStorage.setItem('mgpc_current_case', id);
    location.href = `fase2-sistema-sam.html?id=${id}`;
  } catch (error) { notify(error.message, 'error'); boton.disabled = false; }
});

establecerDistrito();
alternarOtrasUT();
cargarUTDistrito();
