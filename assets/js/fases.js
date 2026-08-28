import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,qsa,notify,getCaseId,formDataObject,initShell,esc} from './common.js'

const phase=Number(document.body.dataset.phase||0)
initShell()

const id=getCaseId()
if(phase>1&&!id){notify('Selecciona un caso antes de continuar.','error')
qsa('button[type=submit]').forEach(x=>x.disabled=true)}
const labels=['Registro','Sistema SAM','Encuestas','Portal SAM','Integración','Expediente','Revisión CG','Cédula']

async function load(){if(!id||phase===1){renderTimeline(1,false)
return}try{const c=await API.record(CONFIG.tables.cases,id)
document.title=`Fase ${phase} | ${c.folio||id}`
qs('#caseInfo')?.insertAdjacentHTML('beforeend',`<strong>${esc(c.folio||id)}</strong> · ${esc(c.clasificacion||'')}`)
renderTimeline(Number(c.fase_actual||phase),c.clasificacion===CONFIG.classificationSkip)
qsa('[data-case]').forEach(x=>x.value=c[x.dataset.case]??'')}catch(e){notify(e.message,'error')}}
function renderTimeline(current,skip){const el=qs('#timeline')
if(!el)return
el.innerHTML=labels.map((x,i)=>{const n=i+1
return `<div class="step ${n<current?'done':n===current?'active':''} ${skip&&n===4?'skipped':''}">${n}. ${x}</div>`}).join('')}
async function uploadFiles(caseId,files,phaseNo){if(!files?.length)return[]
const fd=new FormData()
[...files].forEach(f=>fd.append('files[]',f))
fd.append('descripcion',`Caso ${caseId}, fase ${phaseNo}`)
const r=await API.upload(CONFIG.tables.files,fd)
for(const f of (r.subidos||[])){await API.create('casos_archivos',{id_caso:caseId,id_archivo:f.id,fase:phaseNo,nombre_original:f.nombre_original})}return r.subidos||[]}
async function savePhase(e){e.preventDefault()
const form=e.currentTarget,btn=form.querySelector('[type=submit]')
btn.disabled=true
try{const data=formDataObject(form)
delete data.archivos
let caseId=id

 if(phase===1){const clas=data.clasificacion
const created=await API.create(CONFIG.tables.cases,{...data,fase_actual:1,estatus:'EN PROCESO',fecha_registro:new Date().toISOString().slice(0,19).replace('T',' ')})
caseId=created.id
localStorage.setItem('mgpc_current_case',caseId)
await uploadFiles(caseId,qs('#archivos')?.files,1)
await API.create(CONFIG.tables.phases,{id_caso:caseId,fase:1,estatus:'CONCLUIDA',fecha_fin:new Date().toISOString().slice(0,19).replace('T',' ')})
const next=2
await API.update(CONFIG.tables.cases,caseId,{fase_actual:next})
location.href=`fase2-sistema-sam.html?id=${caseId}`
return}
 await API.create(CONFIG.tables.phases,{id_caso:caseId,fase:phase,estatus:'CONCLUIDA',observaciones:data.observaciones||'',datos_json:JSON.stringify(data),fecha_fin:new Date().toISOString().slice(0,19).replace('T',' ')})
await uploadFiles(caseId,qs('#archivos')?.files,phase)

 const c=await API.record(CONFIG.tables.cases,caseId)
let next=phase+1
if(phase===3&&c.clasificacion===CONFIG.classificationSkip)next=5
if(phase===8){await API.update(CONFIG.tables.cases,caseId,{fase_actual:8,estatus:'CONCLUIDO'})
location.href=`../casos/detalle.html?id=${caseId}`
return}await API.update(CONFIG.tables.cases,caseId,{fase_actual:next})
location.href=`fase${next}-${['','registro','sistema-sam','encuestas','portal-sam','integracion-propuesta','conformacion-expediente','revision-cg','cedula-notificacion'][next]}.html?id=${caseId}`
 }catch(e){notify(e.message,'error')}finally{btn.disabled=false}}
qs('#phaseForm')?.addEventListener('submit',savePhase)
load()

