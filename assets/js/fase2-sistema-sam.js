import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,notify,initShell,getCaseId,localDateTime,esc} from './common.js'

initShell()

const id = getCaseId()
const labels = ['Registro','Cálculo de Encuestas','Encuestas','Portal SAM','Integración','Expediente','Revisión CG','Cédula']
let currentCase = null
let phase1Data = {}
let involvedUTs = []
let externalOrigin = ''
let completed = false

function rows(response) {
  return Array.isArray(response?.data) ? response.data : []
}

function parseJson(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (error) {
    console.error('datos_json de Fase 1 no es válido:', error)
    return {}
  }
}

function renderCase(c) {
  if (qs('#caseInfo')) {
    qs('#caseInfo').innerHTML = `Caso: <strong>${esc(c.folio || id)}</strong>`
  }

  if (qs('#timeline')) {
    qs('#timeline').innerHTML = labels.map((label, index) => {
      const number = index + 1
      const state = number < Number(c.fase_actual)
        ? 'done'
        : number === Number(c.fase_actual) ? 'active' : ''
      const skipped = c.clasificacion === CONFIG.classificationSkip && number === 4
        ? 'skipped'
        : ''
      return `<div class="step ${state} ${skipped}">${number}. ${label}</div>`
    }).join('')
  }
}

async function loadPhase1Data() {
  const response = await API.search(CONFIG.tables.phases, {
    filters: {
      id_caso: Number(id),
      fase: 1
    },
    operator: 'AND',
    fields: ['id', 'id_caso', 'fase', 'datos_json'],
    limit: 10,
    offset: 0
  })

  phase1Data = parseJson(rows(response)[0]?.datos_json)
}

async function loadInvolvedUTs() {
  const relationResponse = await API.search(CONFIG.tables.caseAdditionalUTs, {
    filters: {
      id_caso: Number(id)
    },
    operator: 'AND',
    fields: ['id', 'id_caso', 'id_seccxut'],
    limit: 100,
    offset: 0
  })

  const relations = rows(relationResponse)
  const ids = [...new Set(
    relations
      .map(item => Number(item.id_seccxut))
      .filter(value => Number.isInteger(value) && value > 0)
  )]

  involvedUTs = []

  for (const idSeccxut of ids) {
    try {
      const territorialResponse = await API.search(CONFIG.tables.territorial, {
        filters: {
          id_seccxut: idSeccxut
        },
        operator: 'AND',
        fields: ['id_seccxut', 'claveUT'],
        limit: 1,
        offset: 0
      })

      const territorial = rows(territorialResponse)[0]
      if (territorial?.claveUT) {
        involvedUTs.push({
          idSeccxut,
          claveUT: String(territorial.claveUT)
        })
      }
    } catch (error) {
      console.error(`No fue posible consultar la UT ${idSeccxut}:`, error)
    }
  }
}

function payload() {
  return {
    tipo: 'INIT_FASE_2',
    idCaso: Number(id),
    claveUT: phase1Data.claveUT || '',
    clasificacion: currentCase?.clasificacion || '',
    utInvolucradas: involvedUTs
  }
}

function sendData() {
  const frame = qs('#externalPhaseFrame')
  if (!frame?.contentWindow || !externalOrigin) return

  const data = payload()
  console.log('Datos enviados a la Fase 2:', data)
  frame.contentWindow.postMessage(data, externalOrigin)
}

async function finish(result = {}) {
  if (completed) return
  completed = true

  try {
    await API.create(CONFIG.tables.phases, {
      id_caso: Number(id),
      fase: 2,
      estatus: 'CONCLUIDA',
      observaciones: result.observaciones || '',
      datos_json: JSON.stringify(result),
      fecha_fin: localDateTime()
    })

    await API.update(CONFIG.tables.cases, id, {
      fase_actual: 3
    })

    currentCase = {...currentCase, fase_actual: 3}
    renderCase(currentCase)

    const actions = qs('.phase-actions')
    if (actions && !qs('#continuePhase3')) {
      const button = document.createElement('a')
      button.id = 'continuePhase3'
      button.className = 'btn btn-primary'
      button.href = `fase3-encuestas.html?id=${encodeURIComponent(id)}`
      button.textContent = 'Continuar a Fase 3'
      actions.appendChild(button)
    }

    notify('La exportación de Excel concluyó la Fase 2. Puede continuar a la Fase 3.', 'success')
  } catch (error) {
    completed = false
    notify(error.message || 'No fue posible concluir la Fase 2.', 'error')
  }
}

async function init() {
  if (!id) {
    throw new Error('Selecciona un caso para continuar.')
  }

  currentCase = await API.record(CONFIG.tables.cases, id)
  renderCase(currentCase)

  await Promise.all([
    loadPhase1Data(),
    loadInvolvedUTs()
  ])

  if (!CONFIG.phase2ExternalUrl) {
    throw new Error('Falta configurar CONFIG.phase2ExternalUrl en assets/js/config.js.')
  }

  const url = new URL(CONFIG.phase2ExternalUrl, location.href)
  externalOrigin = url.origin

  const frame = qs('#externalPhaseFrame')
  const loading = qs('#phaseLoading')

  if (!frame) {
    throw new Error('No se encontró el iframe externalPhaseFrame.')
  }

  window.addEventListener('message', async event => {
    if (event.origin !== externalOrigin || event.source !== frame.contentWindow) return

    const message = event.data
    if (!message || typeof message !== 'object') return

    if (message.tipo === 'READY' || message.tipo === 'FASE_2_LISTA') {
      sendData()
      return
    }

    if (message.tipo === 'RESIZE') {
      const height = Number(message.height)
      if (Number.isFinite(height)) {
        frame.style.height = `${Math.max(500, Math.min(height, 3000))}px`
      }
      return
    }

    // Solo la exportación de resultados en Excel concluye la Fase 2.
    // Los eventos generados por Analizar y calcular muestra no avanzan el caso.
    if (message.tipo === 'MGPC_FASE_2_COMPLETADA') {
      const messageCaseId = Number(message.idCaso || message.caseId || id)
      if (messageCaseId !== Number(id)) return

      const excel = message.excel
      const exportacionExcel = Boolean(
        excel && typeof excel === 'object' &&
        String(excel.filename || excel.nombre || '').trim()
      )
      if (!exportacionExcel) return

      await finish({...(message.resultado || message.result || {}), excel})
      return
    }

    if (message.tipo === 'FASE_2_ERROR') {
      notify(message.mensaje || 'El Sistema SAM reportó un error.', 'error')
    }
  })

  frame.addEventListener('load', () => {
    frame.classList.remove('hidden')
    loading?.classList.add('hidden')
    sendData()
  })

  frame.src = url.toString()
}

init().catch(error => {
  notify(error.message || 'No fue posible cargar la Fase 2.', 'error')
  qs('#phaseLoading')?.classList.add('hidden')
})
