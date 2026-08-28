import {API} from './api.js'
import {CONFIG} from './config.js'
import {qs,initShell,notify,esc} from './common.js'
initShell()
(async()=>{try{const r=await API.list(CONFIG.tables.cases,{limit:500}),a=r.data||[]
qs('#total').textContent=a.length
qs('#process').textContent=a.filter(x=>x.estatus!=='CONCLUIDO').length
qs('#done').textContent=a.filter(x=>x.estatus==='CONCLUIDO').length
qs('#recent').innerHTML=a.slice(-10).reverse().map(x=>`<tr><td>${esc(x.folio||x.id)}</td>
<td>${esc(x.distrito)}</td>
<td>${esc(x.clasificacion)}</td>
<td>Fase ${esc(x.fase_actual)}</td>
<td><a href="casos/detalle.html?id=${x.id}">Ver</a>
</td>
</tr>
`).join('')}catch(e){notify(e.message,'error')}})()

