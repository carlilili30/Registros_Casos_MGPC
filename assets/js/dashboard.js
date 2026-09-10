import {API} from './api.js';
import {CONFIG} from './config.js';
import {qs, notify, initShell} from './common.js';

initShell();

const totalElement = qs('#total');
const processElement = qs('#process');
const doneElement = qs('#done');
const recentElement = qs('#recent');

function valor(objeto, ...claves) {
  for (const clave of claves) {
    if (objeto?.[clave] !== undefined && objeto?.[clave] !== null) {
      return objeto[clave];
    }
  }
  return '';
}

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function estaConcluido(caso) {
  const estatus = normalizar(valor(caso, 'estatus'));
  return ['CONCLUIDO', 'CONCLUIDA', 'FINALIZADO', 'FINALIZADA'].includes(estatus);
}

function textoFase(caso) {
  const fase = Number(valor(caso, 'fase_actual', 'fase'));
  if (normalizar(valor(caso, 'tipo_caso')) === 'SIN_CASOS_ACTUALIZACION') {
    return 'Sin actualización';
  }
  if (!Number.isFinite(fase) || fase < 1) return 'Sin fase';
  return `Fase ${fase}`;
}

function crearCelda(texto) {
  const td = document.createElement('td');
  td.textContent = texto || 'Sin información';
  return td;
}

function pintarRegistros(registros) {
  recentElement.innerHTML = '';

  if (!registros.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'muted';
    td.textContent = 'No hay registros disponibles.';
    tr.appendChild(td);
    recentElement.appendChild(tr);
    return;
  }

  const ordenados = [...registros].sort(
    (a, b) => Number(valor(b, 'id', 'id_caso')) - Number(valor(a, 'id', 'id_caso'))
  );

  ordenados.forEach(caso => {
    const idCaso = Number(valor(caso, 'id', 'id_caso'));
    const tr = document.createElement('tr');

    tr.appendChild(crearCelda(valor(caso, 'folio') || 'Pendiente'));
    tr.appendChild(crearCelda(valor(caso, 'distrito')));
    tr.appendChild(crearCelda(valor(caso, 'clasificacion')));
    tr.appendChild(crearCelda(textoFase(caso)));
    tr.appendChild(crearCelda(valor(caso, 'estatus')));

    const tdAccion = document.createElement('td');
    if (idCaso) {
      const enlace = document.createElement('a');
      enlace.className = 'btn btn-secondary';
      enlace.href = `casos/detalle.html?id=${encodeURIComponent(idCaso)}`;
      enlace.textContent = 'Ver registro';
      tdAccion.appendChild(enlace);
    } else {
      tdAccion.textContent = '-';
    }
    tr.appendChild(tdAccion);
    recentElement.appendChild(tr);
  });
}

async function cargarDashboard() {
  recentElement.innerHTML = '<tr><td colspan="6" class="muted">Cargando registros...</td></tr>';

  try {
    const response = await API.search(CONFIG.tables.cases, {
      filters: {},
      operator: 'AND',
      fields: [
        'id',
        'folio',
        'distrito',
        'clasificacion',
        'fase_actual',
        'estatus',
        'tipo_caso',
        'fecha_registro'
      ],
      limit: 10000,
      offset: 0
    });

    const registros = Array.isArray(response?.data) ? response.data : [];
    const concluidos = registros.filter(estaConcluido).length;
    const enProceso = registros.length - concluidos;

    totalElement.textContent = String(registros.length);
    processElement.textContent = String(enProceso);
    doneElement.textContent = String(concluidos);
    pintarRegistros(registros);
  } catch (error) {
    console.error('Error al cargar el panel:', error);
    totalElement.textContent = '0';
    processElement.textContent = '0';
    doneElement.textContent = '0';
    recentElement.innerHTML = '<tr><td colspan="6">No fue posible cargar los registros.</td></tr>';
    notify(error.message || 'No fue posible cargar la información del panel.', 'error');
  }
}

cargarDashboard();
