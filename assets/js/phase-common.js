import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,notify,initShell,getCaseId,formObject,localDateTime,esc} from './common.js'

initShell()

const phase = Number(document.body.dataset.phase)
const id = getCaseId()
const labels = ['Registro','Sistema SAM','Encuestas','Portal SAM','Integración','Expediente','Revisión CG','Cédula']
let currentCase = null
let externalOrigin = ''
let phaseCompleted = false

function renderCase(c) {
  qs('#caseInfo').innerHTML = `Caso: <strong>${esc(c.folio || id)}</strong>`
  qs('#timeline').innerHTML = labels.map((x, i) =>
    `<div class="step ${i + 1 < Number(c.fase_actual) ? 'done' : i + 1 === Number(c.fase_actual) ? 'active' : ''} ${c.clasificacion === CONFIG.classificationSkip && i + 1 === 4 ? 'skipped' : ''}">${i + 1}. ${x}</div>`
  ).join('')
}

function externalPhaseUrl() {
  const configured = CONFIG.phase2ExternalUrl || ''
  if (!configured) throw new Error('Falta configurar CONFIG.phase2ExternalUrl en assets/js/config.js.')

  const url = new URL(configured, window.location.href)
  url.searchParams.set('caseId', id)
  if (currentCase?.folio) url.searchParams.set('folio', currentCase.folio)
  externalOrigin = url.origin
  return url.toString()
}

function casePayload() {
  return {
    tipo: 'INIT_FASE_2',
    caseId: Number(id),
    folio: currentCase?.folio || String(id),
    caso: currentCase,
    tema: {
      morado: '#4b286d',
      verde: '#00a499',
      fuente: 'Inter, Arial, sans-serif'
    }
  }
}

function sendCaseToExternalSystem() {
  const frame = qs('#externalPhaseFrame')
  if (!frame?.contentWindow || !externalOrigin) return
  frame.contentWindow.postMessage(casePayload(), externalOrigin)
}

async function completePhase(result = {}) {
  if (phaseCompleted) return
  phaseCompleted = true

  try {
    const data = result && typeof result === 'object' ? result : {resultado: result}

    await API.create(CONFIG.tables.phases, {
      id_caso: Number(id),
      fase: phase,
      estatus: 'CONCLUIDA',
      observaciones: data.observaciones || '',
      datos_json: JSON.stringify(data),
      fecha_fin: localDateTime()
    })

    const next = phase + 1
    await API.update(CONFIG.tables.cases, id, {fase_actual: next})
    location.href = `fase3-encuestas.html?id=${encodeURIComponent(id)}`
  } catch (error) {
    phaseCompleted = false
    notify(error.message || 'No fue posible concluir la Fase 2.', 'error')
  }
}

function initializeExternalPhase() {
  const frame = qs('#externalPhaseFrame')
  const loading = qs('#phaseLoading')

  frame.addEventListener('load', () => {
    frame.classList.remove('hidden')
    loading?.classList.add('hidden')
    sendCaseToExternalSystem()
  })

  window.addEventListener('message', async event => {
    if (!externalOrigin || event.origin !== externalOrigin) return
    if (event.source !== frame.contentWindow) return

    const message = event.data
    if (!message || typeof message !== 'object') return

    switch (message.tipo) {
      case 'FASE_2_LISTA':
      case 'READY':
        sendCaseToExternalSystem()
        break

      case 'RESIZE': {
        const height = Number(message.height)
        if (Number.isFinite(height)) {
          frame.style.height = `${Math.max(500, Math.min(height, 3000))}px`
        }
        break
      }

      case 'FASE_2_COMPLETADA':
      case 'ETAPA_COMPLETADA':
        await completePhase(message.resultado || {})
        break

      case 'FASE_2_ERROR':
        notify(message.mensaje || 'El Sistema SAM reportó un error.', 'error')
        break
    }
  })

  frame.src = externalPhaseUrl()
}

async function load() {
  if (!id) {
    notify('Selecciona un caso para continuar.', 'error')
    qs('#externalPhaseCard')?.classList.add('hidden')
    return
  }

  try {
    currentCase = await API.record(CONFIG.tables.cases, id)
    renderCase(currentCase)

    if (phase === 2) {
      initializeExternalPhase()
      return
    }

    const form = qs('#phaseForm')
    form?.addEventListener('submit', async event => {
      event.preventDefault()
      const button = event.currentTarget.querySelector('button[type=submit]')
      button.disabled = true

      try {
        const data = formObject(event.currentTarget)
        delete data.archivos
        await API.create(CONFIG.tables.phases, {
          id_caso: Number(id), fase: phase, estatus: 'CONCLUIDA',
          observaciones: data.observaciones || '', datos_json: JSON.stringify(data),
          fecha_fin: localDateTime()
        })

        const files = qs('#archivos')?.files
        if (files?.length) {
          const fd = new FormData()
          ;[...files].forEach(file => fd.append('files[]', file))
          fd.append('descripcion', `Caso ${id}, fase ${phase}`)
          const upload = await API.upload(CONFIG.tables.files, fd)
          for (const file of upload.subidos || []) {
            await API.create(CONFIG.tables.caseFiles, {
              id_caso: Number(id), id_archivo: Number(file.id), fase: phase,
              nombre_original: file.nombre_original
            })
          }
        }

        const c = await API.record(CONFIG.tables.cases, id)
        if (phase === 8) {
          await API.update(CONFIG.tables.cases, id, {fase_actual: 8, estatus: 'CONCLUIDO'})
          location.href = `../casos/detalle.html?id=${encodeURIComponent(id)}`
          return
        }

        let next = phase + 1
        if (phase === 3 && c.clasificacion === CONFIG.classificationSkip) next = 5
        await API.update(CONFIG.tables.cases, id, {fase_actual: next})
        const slugs = ['', 'registro', 'sistema-sam', 'encuestas', 'portal-sam', 'integracion-propuesta', 'conformacion-expediente', 'revision-cg', 'cedula-notificacion']
        location.href = `fase${next}-${slugs[next]}.html?id=${encodeURIComponent(id)}`
      } catch (error) {
        notify(error.message, 'error')
        button.disabled = false
      }
    })
  } catch (error) {
    notify(error.message || 'No fue posible cargar el caso.', 'error')
    qs('#externalPhaseCard')?.classList.add('hidden')
  }
}

load()
