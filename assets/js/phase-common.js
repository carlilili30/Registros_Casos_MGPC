import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,notify,initShell,getCaseId,formObject,localDateTime,esc} from './common.js'

initShell()

const phase = Number(document.body.dataset.phase)
const id = getCaseId()
const labels = ['Registro','Cálculo de Encuestas','Encuestas','Portal SAM','Integración','Expediente','Revisión CG','Cédula']
let currentCase = null
let externalOrigin = ''
let phaseCompleted = false

const normalizeText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
const getClaveUT = c => c.claveUT || c.clave_ut || c.clave_ut_origen || c.unidad_territorial || ''
function surveySituations(classification) {
  const k=normalizeText(classification)
  if(k.includes('DIVISION'))return [['copaco','Fraccionamiento sin causa de identidad cultural o desempate','C2'],['ciudadania','División propuesta por identidad cultural','C1'],['no_aplica','Sin COPACO y causa cartográfica o geográfica','NA']]
  if(k.includes('FUSION'))return [['copaco','Fusión sin causa de identidad cultural o desempate','C2'],['ciudadania','Fusión propuesta por identidad cultural','C1']]
  if(k.includes('NOMENCLATURA'))return [['copaco','Corrección, precisión, cambio de clasificación o desempate','C2'],['ciudadania','Modificación propuesta por identidad cultural','C1'],['no_aplica','Sin COPACO y corrección, precisión o cambio de clasificación','NA']]
  if(k.includes('SECCION'))return [['copaco','Desempate de resultados ciudadanos','C2'],['ciudadania','Solicitud ciudadana para trasladar una sección electoral','C1'],['no_aplica','Sin COPACO y actualización cartográfica de sección','NA']]
  if(k.includes('MANZANA'))return [['copaco','Desempate de resultados ciudadanos','C2'],['ciudadania','Solicitud ciudadana para trasladar una manzana electoral','C1'],['no_aplica','Sin COPACO y actualización cartográfica o área sin vivienda','NA']]
  if(k.includes('COMBINACION'))return [['copaco','Solicitud sin causa de identidad cultural o desempate','C2'],['ciudadania','Causas relacionadas con identidad cultural','C1'],['no_aplica','Sin COPACO y actualización cartográfica','NA']]
  return [['ciudadania','Encuesta a personas ciudadanas','C1'],['copaco','Encuesta a integrantes de COPACO','C2'],['no_aplica','No aplica encuesta','NA']]
}
function initializePhase3(c){
  qs('#clasificacionCaso').value=c.clasificacion||'';qs('#claveUtEncuesta').value=getClaveUT(c)
  const s=qs('#situacionEncuesta');surveySituations(c.clasificacion).forEach(([v,l,m])=>{const o=document.createElement('option');o.value=v;o.textContent=l;o.dataset.model=m;s.appendChild(o)})
  s.addEventListener('change',()=>renderSurveyMethods(s.selectedOptions[0]?.dataset.model||''))
  ;['#respuestasFavor','#respuestasContra','#sinRespuesta','#encuestasAplicadas'].forEach(x=>qs(x)?.addEventListener('input',calculateResult))
  qs('#archivos')?.addEventListener('change',renderSelectedFiles);renderSurveyMethods('');calculateResult()
}
function renderSurveyMethods(model){
  const box=qs('#metodosEncuesta'),note=qs('#metodoNota'),section=qs('#levantamientoSection');let item=null
  if(model==='C1')item=['MGPC2025-C1','MGPC2025-C1 - Personas ciudadanas']
  if(model==='C2')item=['MGPC2025-C2','MGPC2025-C2 - Integrantes de COPACO']
  if(model==='NA')item=['NO_APLICA','No aplica encuesta']
  box.innerHTML=item?`<label class="radio-option"><input type="radio" name="modelo_encuesta" value="${item[0]}" checked required> ${item[1]}</label>`:'<span class="muted">Seleccione primero la situación del caso.</span>'
  section?.classList.toggle('hidden',model==='NA');note?.classList.toggle('hidden',!model)
  if(model)note.textContent=model==='NA'?'No se requiere aplicar encuesta. Adjunte la evidencia o justificación correspondiente.':model==='C1'?'El modelo C1 se dirige a personas ciudadanas directamente involucradas.':'El modelo C2 se dirige a integrantes de COPACO.'
}
function calculateResult(){const f=Number(qs('#respuestasFavor')?.value||0),c=Number(qs('#respuestasContra')?.value||0),o=Number(qs('#sinRespuesta')?.value||0),a=Number(qs('#encuestasAplicadas')?.value||0);let r='Sin resultado';if(f>c)r='Mayoría a favor';else if(c>f)r='Mayoría en contra';else if(f>0&&f===c)r='Empate';if(f+c+o>a&&a>0)r='Revisar cantidades capturadas';if(qs('#resultadoCalculado'))qs('#resultadoCalculado').textContent=r;if(qs('#resultado'))qs('#resultado').value=r}
function renderSelectedFiles(e){const l=qs('#listaArchivos');if(l)l.innerHTML=[...e.target.files].map(f=>`<li>${esc(f.name)}</li>`).join('')}
function validatePhase3(){if(phase!==3)return;const m=qs('input[name="modelo_encuesta"]:checked')?.value;if(!m)throw new Error('Seleccione la situación y el modelo de encuesta aplicable.');if(m==='NO_APLICA')return;const a=Number(qs('#encuestasAplicadas')?.value||0),t=Number(qs('#respuestasFavor')?.value||0)+Number(qs('#respuestasContra')?.value||0)+Number(qs('#sinRespuesta')?.value||0);if(t>a)throw new Error('La suma de respuestas no puede ser mayor que las encuestas aplicadas.')}


function apiRows(response) {
  if (Array.isArray(response)) return response
  for (const key of ['data','datos','records','registros','rows','items','result','resultados']) if (Array.isArray(response?.[key])) return response[key]
  return []
}
async function findExisting(table, predicate) {
  const response=await API.list(table,{limit:10000,offset:0})
  return apiRows(response).filter(predicate).sort((a,b)=>Number(b.id)-Number(a.id))[0]||null
}
async function savePhaseRecord(data) {
  const payload={id_caso:Number(id),fase:phase,estatus:'CONCLUIDA',observaciones:data.observaciones||'',datos_json:JSON.stringify(data),fecha_fin:localDateTime()}
  const existing=await findExisting(CONFIG.tables.phases,row=>Number(row.id_caso)===Number(id)&&Number(row.fase)===phase)
  return existing?.id?API.update(CONFIG.tables.phases,existing.id,payload):API.create(CONFIG.tables.phases,payload)
}
async function savePhase3Summary(data) {
  const favor=Number(data.respuestas_favor||0),contra=Number(data.respuestas_contra||0),sinRespuesta=Number(data.sin_respuesta||0)
  const fechaAplicacion=data.fecha_fin||data.fecha_inicio||new Date().toISOString().slice(0,10)
  const respuesta=favor>contra?'A_FAVOR':contra>favor?'EN_CONTRA':'SIN_RESPUESTA'
  const payload={id_caso:Number(id),modelo_encuesta:qs('input[name="modelo_encuesta"]:checked')?.value||'',situacion_encuesta:data.situacion_encuesta||'',clave_ut:data.clave_ut_encuesta||'',fecha_aplicacion:fechaAplicacion,fecha_inicio:data.fecha_inicio||null,fecha_fin:data.fecha_fin||null,encuestas_programadas:Number(data.encuestas_programadas||0),encuestas_aplicadas:Number(data.encuestas_aplicadas||0),respuestas_favor:favor,respuestas_contra:contra,sin_respuesta:sinRespuesta,resultado:data.resultado||'Sin resultado',estatus_levantamiento:data.estatus_levantamiento||'',respuesta,comentarios:data.comentarios||'',observaciones:data.observaciones||''}
  const existing=await findExisting(CONFIG.tables.phase3Surveys,row=>Number(row.id_caso)===Number(id))
  return existing?.id?API.update(CONFIG.tables.phase3Surveys,existing.id,payload):API.create(CONFIG.tables.phase3Surveys,payload)
}

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
    if (phase === 3) initializePhase3(currentCase)

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
        validatePhase3()
        const data = formObject(event.currentTarget)
        delete data.archivos
        if (phase === 3) await savePhase3Summary(data)
        await savePhaseRecord(data)

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
