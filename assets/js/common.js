export const qs=(s,c=document)=>c.querySelector(s);export const qsa=(s,c=document)=>[...c.querySelectorAll(s)];
export function esc(v=''){const d=document.createElement('div');d.textContent=String(v??'');return d.innerHTML}
export function notify(m,t='info'){const b=qs('#message');if(!b)return alert(m);b.className=`alert alert-${t}`;b.textContent=m;b.classList.remove('hidden');scrollTo({top:0,behavior:'smooth'})}
export function getSession(){try{return JSON.parse(sessionStorage.getItem('mgpc_session'))||null}catch{return null}}
export function requireSession(){const s=getSession();if(!s){location.href=(location.pathname.includes('/fases/')||location.pathname.includes('/casos/')||location.pathname.includes('/catalogos/')?'../':'')+'login.html'}return s}
export function getCaseId(){return new URLSearchParams(location.search).get('id')||localStorage.getItem('mgpc_current_case')}
export function initShell(){const s=requireSession();if(!s)return;const nested=/\/(fases|casos|catalogos)\//.test(location.pathname),p=nested?'../':'';qs('#appHeader').innerHTML=`<header class="app-header"><div class="header-inner"><a class="brand" href="${p}dashboard.html">SCCMGPC <small>Registro y seguimiento</small>
</a>
<nav class="nav"><a href="${p}dashboard.html">Inicio</a>
<a href="${p}fases/fase1-registro.html">Nuevo caso</a>
<a href="${p}casos/consulta.html">Consulta</a>
<a href="${p}casos/expediente.html">Expediente</a>
<a href="#" id="logout">Salir</a>
</nav>
</div>
</header>
`;qs('#logout').onclick=e=>{e.preventDefault();sessionStorage.removeItem('mgpc_session');location.href=p+'login.html'}}
export function localDateTime(){const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,19).replace('T',' ')}
export function formObject(f){return Object.fromEntries(new FormData(f).entries())}
