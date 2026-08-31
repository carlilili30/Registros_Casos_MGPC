import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,qsa,notify,initShell,getSession,localDateTime} from './common.js'

initShell()
const form=qs('#phaseForm'),dist=qs('#distrito'),ut=qs('#unidad_territorial'),otherBox=qs('#otrasUtSection'),other=qsa('.otra-ut')
let units=[]

const role=s=>String(s?.rol||'').trim().toUpperCase()
const isSuper=s=>['SUPERUSUARIO','SUPERADMINISTRADOR','SUPERADMIN','ADMINISTRADOR','CONTROL'].includes(role(s))

function v(o,...ks){for(const k of ks)if(o?.[k]!=null)return o[k]
return ''}
function clearUT(){['claveUT','nombreUT','seccionesC','seccionesP','tipoUT'].forEach(x=>qs('#'+x).value='')}
async function districts(){const s=getSession()
dist.innerHTML='<option value="">Seleccione</option>'
for(let n=1; n<=33; n++){const o=document.createElement('option')
o.value=`Distrito ${n}`
o.dataset.numero=n
o.textContent=`Distrito ${n}`
dist.appendChild(o)}if(isSuper(s)){dist.disabled=false
qs('#districtHelp').textContent='Como superusuario puede seleccionar cualquiera de los distritos del 1 al 33.'}else{const n=Number(s?.distrito||0)
if(n<1||n>33){notify('El usuario no tiene un distrito válido asignado.','error')
return}dist.value=`Distrito ${n}`
dist.disabled=true
qs('#districtHelp').textContent=`Distrito ${n} asignado al usuario que inició sesión.`
await loadUT()}}
async function loadUT(){clearUT()
units=[]
ut.disabled=true
const n=Number(dist.selectedOptions[0]?.dataset.numero||0)
if(!n){ut.innerHTML='<option value="">Seleccione un distrito</option>'
return}ut.innerHTML='<option>Cargando...</option>'
try{const r=await API.search(CONFIG.tables.territorial,{filters:{claveDT:n},operator:'AND',limit:5000})
units=r.data||[]
ut.innerHTML='<option value="">Seleccione una UT</option>'+units.map(x=>`<option value="${v(x,'id_seccxut')}">${v(x,'claveUT')} · ${v(x,'nombreUT')}</option>`).join('')
ut.disabled=false
fillOthers()}catch(e){notify(e.message,'error')}}
function showUT(){const x=units.find(y=>String(v(y,'id_seccxut'))===ut.value)||{}
qs('#claveUT').value=v(x,'claveUT')
qs('#nombreUT').value=v(x,'nombreUT')
qs('#seccionesC').value=v(x,'seccionesC')
qs('#seccionesP').value=v(x,'seccionesP')
qs('#tipoUT').value=v(x,'tipoUT')
fillOthers()}
function fillOthers(){const main=ut.value,chosen=other.map(x=>x.value).filter(Boolean)
other.forEach(sel=>{const keep=sel.value
sel.innerHTML='<option value="">Seleccione una UT</option>'+units.filter(x=>String(v(x,'id_seccxut'))!==main).map(x=>`<option value="${v(x,'id_seccxut')}">${v(x,'claveUT')} · ${v(x,'nombreUT')}</option>`).join('')
sel.value=keep
forEach(o=>{if(o.value)o.disabled=chosen.includes(o.value)&&o.value!==keep})})}
function toggle(){const yes=qs('#involucra_otra_ut').value==='Sí'
otherBox.classList.toggle('hidden',!yes)
other.forEach(x=>{x.disabled=!yes
if(!yes)x.value=''})}
function folio(n,id){return `D${String(n).padStart(2,'0')}-${new Date().getFullYear()}-${String(id).padStart(6,'0')}`}
form.addEventListener('submit',async e=>{e.preventDefault()
if(!form.reportValidity())return
const btn=qs('#submitButton')
btn.disabled=true
try{const s=getSession(),x=units.find(y=>String(v(y,'id_seccxut'))===ut.value)
if(!x)throw new Error('Seleccione una Unidad Territorial válida.')
const extra={id_seccxut:Number(v(x,'id_seccxut')),claveUT:v(x,'claveUT'),nombreUT:v(x,'nombreUT'),seccionesC:v(x,'seccionesC'),seccionesP:v(x,'seccionesP'),tipoUT:v(x,'tipoUT'),domicilio:qs('#domicilio').value.trim(),otras_ut:other.map(z=>z.value).filter(Boolean)}
const p={folio:null,distrito:dist.value,unidad_territorial:`${v(x,'claveUT')} · ${v(x,'nombreUT')}`,nombre_solicitante:qs('#nombre_solicitante').value.trim(),telefono:qs('#telefono').value.trim(),correo:qs('#correo').value.trim(),tipo_caso:qs('#tipo_caso').value,clasificacion:qs('#clasificacion').value,involucra_otra_ut:qs('#involucra_otra_ut').value,descripcion:qs('#descripcion').value.trim(),medio_solicitud:qs('#medio_solicitud').value,fase_actual:1,estatus:'REGISTRADO',fecha_registro:localDateTime()}
const cr=await API.create(CONFIG.tables.cases,p),id=cr.id
const n=Number(dist.selectedOptions[0].dataset.numero)
await API.update(CONFIG.tables.cases,id,{folio:folio(n,id),fase_actual:2})
await API.create(CONFIG.tables.phases,{id_caso:Number(id),fase:1,estatus:'CONCLUIDA',observaciones:'Registro inicial',datos_json:JSON.stringify(extra),fecha_fin:localDateTime()})
const files=qs('#archivos').files
if(files.length){const fd=new FormData()
forEach(f=>fd.append('files[]',f))
fd.append('descripcion',`Caso ${id}, fase 1`)
const up=await API.upload(CONFIG.tables.files,fd)
for(const f of up.subidos||[])await API.create(CONFIG.tables.caseFiles,{id_caso:Number(id),id_archivo:Number(f.id),fase:1,nombre_original:f.nombre_original})}localStorage.setItem('mgpc_current_case',id)
location.href=`fase2-sistema-sam.html?id=${id}`}catch(e){notify(e.message,'error')
btn.disabled=false}})

dist.addEventListener('change',loadUT)
ut.addEventListener('change',showUT)
qs('#involucra_otra_ut').addEventListener('change',toggle)
other.forEach(x=>x.addEventListener('change',fillOthers))
toggle()
districts()

