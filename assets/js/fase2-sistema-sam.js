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
  if (Array.isArray(response)) return response
  for (const key of ['data','datos','records','registros','rows','items','result','resultados']) {
    if (Array.isArray(response?.[key])) return response[key]
  }
  return []
}
function parseJson(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch (error) { console.error('datos_json de Fase 1 no es válido:', error); return {} }
}
function renderCase(c) {
  if (qs('#caseInfo')) qs('#caseInfo').innerHTML = `Caso: <strong>${esc(c.folio || id)}</strong>`
  if (qs('#timeline')) qs('#timeline').innerHTML = labels.map((label,index) => {
    const number=index+1
    const state=number<Number(c.fase_actual)?'done':number===Number(c.fase_actual)?'active':''
    const skipped=c.clasificacion===CONFIG.classificationSkip&&number===4?'skipped':''
    return `<div class="step ${state} ${skipped}">${number}. ${label}</div>`
  }).join('')
}
async function loadPhase1Data() {
  const response=await API.search(CONFIG.tables.phases,{filters:{id_caso:Number(id),fase:1},operator:'AND',fields:['id','id_caso','fase','datos_json'],limit:10,offset:0})
  phase1Data=parseJson(rows(response)[0]?.datos_json)
}
async function loadInvolvedUTs() {
  const response=await API.search(CONFIG.tables.caseAdditionalUTs,{filters:{id_caso:Number(id)},operator:'AND',fields:['id','id_caso','id_seccxut'],limit:100,offset:0})
  const ids=[...new Set(rows(response).map(item=>Number(item.id_seccxut)).filter(value=>Number.isInteger(value)&&value>0))]
  involvedUTs=[]
  for (const idSeccxut of ids) {
    try {
      const found=await API.search(CONFIG.tables.territorial,{filters:{id_seccxut:idSeccxut},operator:'AND',fields:['id_seccxut','claveUT'],limit:1,offset:0})
      const territorial=rows(found)[0]
      if (territorial?.claveUT) involvedUTs.push({idSeccxut,claveUT:String(territorial.claveUT)})
    } catch(error) { console.error(`No fue posible consultar la UT ${idSeccxut}:`,error) }
  }
}
function payload() {
  return {tipo:'INIT_FASE_2',idCaso:Number(id),claveUT:phase1Data.claveUT||'',clasificacion:currentCase?.clasificacion||'',utInvolucradas:involvedUTs}
}
function sendData() {
  const frame=qs('#externalPhaseFrame')
  if (frame?.contentWindow&&externalOrigin) frame.contentWindow.postMessage(payload(),externalOrigin)
}
function showContinueButton() {
  const button=qs('#continuePhase3')
  if (!button) return
  button.href=`fase3-encuestas.html?id=${encodeURIComponent(id)}`
  button.classList.remove('hidden')
}
function base64ToFile(value,filename) {
  const clean=String(value||'').replace(/^data:.*?;base64,/,'')
  const binary=atob(clean),bytes=new Uint8Array(binary.length)
  for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i)
  return new File([bytes],filename,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
}
async function excelToFile(excel) {
  const filename=String(excel?.filename||excel?.nombre||`fase2_caso_${id}.xlsx`).trim()
  if (excel?.base64) return base64ToFile(excel.base64,filename)
  if (excel?.data && typeof excel.data==='string') return base64ToFile(excel.data,filename)
  if (excel?.blob instanceof Blob) return new File([excel.blob],filename,{type:excel.blob.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
  if (excel?.url) {
    const response=await fetch(excel.url)
    if (!response.ok) throw new Error('No fue posible recuperar el archivo Excel exportado.')
    return new File([await response.blob()],filename,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
  }
  return null
}
async function saveExcel(excel) {
  const file=await excelToFile(excel)
  if (!file) throw new Error('La Fase 2 informó el nombre del Excel, pero no envió su contenido. El sistema externo debe incluir excel.base64, excel.blob o excel.url.')
  const fd=new FormData()
  fd.append('files[]',file,file.name)
  fd.append('descripcion',`Resultado Excel del caso ${id}, fase 2`)
  const upload=await API.upload(CONFIG.tables.files,fd)
  const uploaded=upload.subidos||upload.data||[]
  if (!uploaded.length) throw new Error('La API no devolvió el identificador del archivo Excel guardado.')
  for (const item of uploaded) {
    await API.create(CONFIG.tables.caseFiles,{id_caso:Number(id),id_archivo:Number(item.id),fase:2,nombre_original:item.nombre_original||file.name})
  }
  return file.name
}
async function existingPhase2() {
  const response=await API.search(CONFIG.tables.phases,{filters:{id_caso:Number(id),fase:2},operator:'AND',fields:['id','id_caso','fase'],limit:10,offset:0})
  return rows(response).sort((a,b)=>Number(b.id)-Number(a.id))[0]||null
}
async function finish(result={},excel={}) {
  if (completed) return
  completed=true
  try {
    const savedName=await saveExcel(excel)
    const data={...result,excel:{nombre:savedName}}
    const phasePayload={id_caso:Number(id),fase:2,estatus:'CONCLUIDA',observaciones:data.observaciones||'',datos_json:JSON.stringify(data),fecha_fin:localDateTime()}
    const existing=await existingPhase2()
    if (existing?.id) await API.update(CONFIG.tables.phases,existing.id,phasePayload)
    else await API.create(CONFIG.tables.phases,phasePayload)
    await API.update(CONFIG.tables.cases,id,{fase_actual:3})
    currentCase={...currentCase,fase_actual:3}
    renderCase(currentCase)
    showContinueButton()
    notify('El archivo Excel se guardó y la Fase 2 concluyó. Puede continuar a la Fase 3.','success')
  } catch(error) {
    completed=false
    notify(error.message||'No fue posible concluir la Fase 2.','error')
  }
}
async function init() {
  if (!id) throw new Error('Selecciona un caso para continuar.')
  currentCase=await API.record(CONFIG.tables.cases,id)
  renderCase(currentCase)
  if (Number(currentCase.fase_actual)>=3) showContinueButton()
  await Promise.all([loadPhase1Data(),loadInvolvedUTs()])
  if (!CONFIG.phase2ExternalUrl) throw new Error('Falta configurar CONFIG.phase2ExternalUrl en assets/js/config.js.')
  const url=new URL(CONFIG.phase2ExternalUrl,location.href)
  externalOrigin=url.origin
  const frame=qs('#externalPhaseFrame'),loading=qs('#phaseLoading')
  if (!frame) throw new Error('No se encontró el iframe externalPhaseFrame.')
  window.addEventListener('message',async event=>{
    if (event.origin!==externalOrigin||event.source!==frame.contentWindow) return
    const message=event.data
    if (!message||typeof message!=='object') return
    if (message.tipo==='READY'||message.tipo==='FASE_2_LISTA') { sendData(); return }
    if (message.tipo==='RESIZE') { const height=Number(message.height); if(Number.isFinite(height)) frame.style.height=`${Math.max(500,Math.min(height,3000))}px`; return }
    if (message.tipo==='MGPC_FASE_2_COMPLETADA'||message.tipo==='FASE_2_COMPLETADA'||message.tipo==='ETAPA_COMPLETADA') {
      const messageCaseId=Number(message.idCaso||message.caseId||id)
      if (messageCaseId!==Number(id)) return
      const excel=message.excel||message.archivoExcel||message.archivo||{}
      if (!String(excel.filename||excel.nombre||'').trim()) return
      await finish(message.resultado||message.result||{},excel)
      return
    }
    if (message.tipo==='FASE_2_ERROR') notify(message.mensaje||'El Sistema de Cálculo de Encuestas reportó un error.','error')
  })
  frame.addEventListener('load',()=>{frame.classList.remove('hidden');loading?.classList.add('hidden');sendData()})
  frame.src=url.toString()
}
init().catch(error=>{notify(error.message||'No fue posible cargar la Fase 2.','error');qs('#phaseLoading')?.classList.add('hidden')})
