import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,initShell,notify,esc,getCaseId} from './common.js'
initShell()
async function list(){try{const q=qs('#q')?.value.trim(),r=q?await API.search(CONFIG.tables.cases,{filters:{folio:{like:q}},limit:500}):await API.list(CONFIG.tables.cases,{limit:500})
qs('#casesBody').innerHTML=(r.data||[]).map(x=>`<tr><td>${esc(x.folio||x.id)}</td><td>${esc(x.distrito)}</td><td>${esc(x.unidad_territorial)}</td><td>${esc(x.estatus)}</td><td>Fase ${esc(x.fase_actual)}</td><td><a class="btn btn-outline" href="detalle.html?id=${x.id}">Ver</a></td></tr>`).join('')||'<tr><td colspan="6">Sin resultados</td></tr>'}catch(e){notify(e.message,'error')}}if(qs('#casesBody'))list()
qs('#searchForm')?.addEventListener('submit',e=>{e.preventDefault()
list()})
if(qs('#detail'))(async()=>{try{
const id=getCaseId(),x=await API.record(CONFIG.tables.cases,id)

const mostrar=v=>v===null||v===undefined||v===''?'No registrado':v
const campo=(titulo,valor,clase='col-4')=>`<div class="${clase}"><b>${esc(titulo)}</b><p>${esc(mostrar(valor))}</p></div>`
let solicitantes=[]
let otrasUT=[]
let archivos=[]
let fases=[]

async function consultarRelacion(tabla,fields){
  if(!tabla)return []
  try{
    const r=await API.search(tabla,{filters:{id_caso:Number(id)},operator:'AND',fields,limit:500,offset:0})
    return Array.isArray(r?.data)?r.data:[]
  }catch(e){
    console.warn('No fue posible consultar información relacionada:',tabla,e)
    return []
  }
}

[solicitantes,otrasUT,archivos,fases]=await Promise.all([
  consultarRelacion(CONFIG.tables.caseApplicants,['id','id_caso','nombre','telefono','correo','domicilio','principal']),
  consultarRelacion(CONFIG.tables.caseAdditionalUTs,['id','id_caso','id_seccxut']),
  consultarRelacion(CONFIG.tables.caseFiles,['id','id_caso','id_archivo','fase','nombre_original']),
  consultarRelacion(CONFIG.tables.phases,['id','id_caso','fase','estatus','observaciones','fecha_inicio','fecha_fin','datos_json'])
])

const idsOtrasUT=otrasUT.map(u=>Number(u.id_seccxut)).filter(Boolean)
let detalleOtrasUT=[]
if(idsOtrasUT.length&&CONFIG.tables.territorial){
  try{
    const r=await API.search(CONFIG.tables.territorial,{filters:{},operator:'AND',fields:['id_seccxut','dtto','nombreDT','claveUT','nombreUT','seccC','seccP'],limit:5000,offset:0})
    detalleOtrasUT=(Array.isArray(r?.data)?r.data:[]).filter(u=>idsOtrasUT.includes(Number(u.id_seccxut||u.id)))
  }catch(e){console.warn('No fue posible obtener el detalle de las UT adicionales.',e)}
}

let html=`
<h2 class="section-title">Datos generales</h2>
<div class="grid">
${campo('Folio',x.folio)}
${campo('Distrito',x.distrito)}
${campo('Demarcación Territorial',x.demarcacion_territorial)}
${campo('Unidad Territorial',x.unidad_territorial,'col-6')}
${campo('Tipo de caso',x.tipo_caso)}
${campo('Fecha de recepción del caso',x.fecha_solicitud)}
${campo('Clasificación',x.clasificacion)}
${campo('Área remitente',x.area_remitente)}
${campo('Procedencia de la solicitud',x.procedencia_solicitud)}
${campo('¿Involucra otra UT?',x.involucra_otra_ut)}
${campo('Descripción',x.descripcion,'col-12')}
</div>
`

if(solicitantes.length){
  html+=`<h2 class="section-title">Datos de Contacto</h2><div class="grid">`+
  solicitantes.map((s,i)=>`<div class="col-12"><div class="card"><h3>Solicitante ${i+1}${Number(s.principal)===1?' (principal)':''}</h3><div class="grid">${campo('Nombre',s.nombre,'col-6')}${campo('Teléfono',s.telefono)}${campo('Correo',s.correo)}${campo('Domicilio',s.domicilio,'col-12')}</div></div></div>`).join('')+
  `</div>`
}

if(x.involucra_otra_ut==='Sí'||otrasUT.length){
  html+=`<h2 class="section-title">Unidades Territoriales adicionales</h2>`
  if(detalleOtrasUT.length){
    html+=`<div class="grid">`+detalleOtrasUT.map((u,i)=>`<div class="col-12"><div class="card"><h3>UT adicional ${i+1}</h3><div class="grid">${campo('Clave UT',u.claveUT)}${campo('Nombre UT',u.nombreUT,'col-6')}${campo('Distrito',u.dtto)}${campo('Demarcación Territorial',u.nombreDT)}${campo('Secciones completas',u.seccC,'col-6')}${campo('Secciones parciales',u.seccP,'col-6')}</div></div></div>`).join('')+`</div>`
  }else if(otrasUT.length){
    html+=`<p>${otrasUT.map(u=>`UT ID ${esc(u.id_seccxut)}`).join(', ')}</p>`
  }else html+=`<p class="muted">No hay UT adicionales registradas.</p>`
}



const nombresFase={1:'Fase 1. Registro',2:'Fase 2. Cálculo de Encuestas',3:'Fase 3. Encuestas',4:'Fase 4. Portal SAM',5:'Fase 5. Integración de propuesta',6:'Fase 6. Conformación del expediente',7:'Fase 7. Revisión CG',8:'Fase 8. Cédula de notificación'}
html+=`<h2 class="section-title">Documentos por fase</h2>`
if(archivos.length){
  const archivosPorFase=archivos.reduce((grupos,archivo)=>{const fase=Number(archivo.fase)||0;(grupos[fase]??=[]).push(archivo);return grupos},{})
  html+=Object.keys(archivosPorFase).map(Number).sort((a,b)=>a-b).map(fase=>{
    const titulo=nombresFase[fase]||(fase?`Fase ${fase}`:'Sin fase asignada')
    return `<div class="card"><h3>${esc(titulo)}</h3><div class="grid">`+archivosPorFase[fase].map((a,i)=>`<div class="col-6"><div class="card"><b>Archivo ${i+1}</b><p>${esc(mostrar(a.nombre_original))}</p><small>ID archivo ${esc(mostrar(a.id_archivo))}</small></div></div>`).join('')+`</div></div>`
  }).join('')
}else html+=`<p class="muted">No hay documentos asociados al caso.</p>`

qs('#detail').innerHTML=html
const sl=['','registro','sistema-sam','encuestas','portal-sam','integracion-propuesta','conformacion-expediente','revision-cg','cedula-notificacion'],n=Number(x.fase_actual||1)
qs('#continue').href=`../fases/fase${n}-${sl[n]}.html?id=${id}`
localStorage.setItem('mgpc_current_case',id)
}catch(e){notify(e.message,'error')}})()
