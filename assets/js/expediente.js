import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,initShell,notify,esc,getCaseId} from './common.js'
initShell()
(async()=>{const id=getCaseId()
if(!id){qs('#files').innerHTML='<p>Seleccione un caso desde Consulta.</p>'
return}try{const r=await API.search(CONFIG.tables.caseFiles,{filters:{id_caso:Number(id)},limit:500})
qs('#files').innerHTML=(r.data||[]).map(x=>`<div class="file-item"><span>${esc(x.nombre_original)} · Fase ${esc(x.fase)}</span><a class="btn btn-outline" target="_blank" href="${API.fileUrl(CONFIG.tables.files,x.id_archivo)}">Ver / descargar</a></div>`).join('')||'<p>No hay documentos.</p>'}catch(e){notify(e.message,'error')}})()

