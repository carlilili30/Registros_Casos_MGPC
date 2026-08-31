import {API} from './api.js';
import {CONFIG} from './config.js';
import {qs,qsa,notify,initShell,getSession,localDateTime} from './common.js';

initShell();
const form=qs('#phaseForm'),dist=qs('#distrito'),nombre=qs('#nombreUT'),clave=qs('#claveUT'),idUT=qs('#id_seccxut');
const listaNombre=qs('#resultadosNombreUT'),listaClave=qs('#resultadosClaveUT'),otherBox=qs('#otrasUtSection'),other=qsa('.otra-ut');
let timer,seleccionada=null,units=[];
const fields='id_seccxut,claveUT,nombreUT,seccionesC,seccionesP';
const v=(o,...ks)=>{for(const k of ks)if(o?.[k]!=null)return o[k];return ''};

function numeroDistrito(){const s=getSession()||{};const raw=v(s,'distrito','claveDT','numeroDistrito','id_distrito');const m=String(raw).match(/\d+/);return m?Number(m[0]):0}
function fijarDistrito(){const n=numeroDistrito();dist.value=n?`Distrito ${n}`:'';if(!n)notify('La sesión mgpc_session no contiene un distrito válido.','error')}
function cerrar(){listaNombre.innerHTML='';listaClave.innerHTML=''}
function limpiarSeleccion(){seleccionada=null;idUT.value='';qs('#seccionesC').value='';qs('#seccionesP').value=''}
function seleccionar(row){seleccionada=row;idUT.value=v(row,'id_seccxut','id');clave.value=v(row,'claveUT');nombre.value=v(row,'nombreUT');qs('#seccionesC').value=v(row,'seccionesC');qs('#seccionesP').value=v(row,'seccionesP');cerrar();fillOthers()}

async function suggest(campo,texto,lista){
 lista.innerHTML='<li>Buscando...</li>';
 try{
  const params=new URLSearchParams({campo,q:texto,fields,limit:'10'});
  const path=`/suggest/${CONFIG.tables.territorial}?${params.toString()}`;
  const res=await fetch(`${CONFIG.proxyUrl}?path=${encodeURIComponent(path)}`);
  const json=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(json.error||json.message||`Error API ${res.status}`);
  lista.innerHTML='';const rows=Array.isArray(json.data)?json.data:[];
  if(!rows.length){lista.innerHTML='<li>Sin resultados</li>';return}
  rows.forEach(row=>{const li=document.createElement('li');li.className='ut-opcion';li.tabIndex=0;
   const a=document.createElement('span');a.className='ut-opcion-clave';a.textContent=v(row,'claveUT')||'Sin clave';
   const b=document.createElement('span');b.className='ut-opcion-nombre';b.textContent=v(row,'nombreUT')||'Sin nombre';li.append(a,b);
   li.onclick=()=>seleccionar(row);li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();seleccionar(row)}};lista.appendChild(li)});
 }catch(e){lista.innerHTML='';const li=document.createElement('li');li.textContent=`Error: ${e.message}`;lista.appendChild(li)}
}
function activar(input,campo,lista,otra){input.addEventListener('input',()=>{clearTimeout(timer);limpiarSeleccion();otra.innerHTML='';const t=input.value.trim();if(t.length<2){lista.innerHTML='';return}timer=setTimeout(()=>suggest(campo,t,lista),300)})}
activar(nombre,'nombreUT',listaNombre,listaClave);activar(clave,'claveUT',listaClave,listaNombre);
document.addEventListener('click',e=>{if(!e.target.closest('.ut-search-container'))cerrar()});

async function loadOthers(){const n=numeroDistrito();if(!n)return;try{const r=await API.search(CONFIG.tables.territorial,{filters:{claveDT:n},operator:'AND',limit:5000});units=r.data||[];fillOthers()}catch(e){console.error(e)}}
function fillOthers(){const main=String(idUT.value||''),chosen=other.map(x=>x.value).filter(Boolean);other.forEach(sel=>{const keep=sel.value;sel.innerHTML='<option value="">Seleccione una UT</option>';units.filter(x=>String(v(x,'id_seccxut','id'))!==main).forEach(x=>{const id=String(v(x,'id_seccxut','id')),o=document.createElement('option');o.value=id;o.textContent=`${v(x,'claveUT')} · ${v(x,'nombreUT')}`;o.disabled=chosen.includes(id)&&id!==keep;sel.appendChild(o)});sel.value=keep})}
function toggle(){const yes=qs('#involucra_otra_ut').value==='Sí';otherBox.classList.toggle('hidden',!yes);other.forEach(x=>{x.disabled=!yes;if(!yes)x.value='' });if(yes)fillOthers()}
function folio(n,id){return `D${String(n).padStart(2,'0')}-${new Date().getFullYear()}-${String(id).padStart(6,'0')}`}
qs('#involucra_otra_ut').addEventListener('change',toggle);other.forEach(x=>x.addEventListener('change',fillOthers));

function obtenerDatosContacto() {
  return {
    nombre_solicitante:
      qs('#nombre_solicitante').value.trim(),

    telefono:
      qs('#telefono').value.trim(),

    correo:
      qs('#correo').value.trim(),

    domicilio:
      qs('#domicilio').value.trim()
  };
}

function validarDatosContacto(datos) {
  if (!datos.nombre_solicitante) {
    throw new Error(
      'Escriba el nombre del solicitante.'
    );
  }

  if (
    datos.correo &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)
  ) {
    throw new Error(
      'Escriba un correo electrónico válido.'
    );
  }

  if (
    datos.telefono &&
    !/^[0-9+\s()\-]{7,20}$/.test(datos.telefono)
  ) {
    throw new Error(
      'El teléfono contiene caracteres no válidos.'
    );
  }
}
``
form.addEventListener('submit', async event => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const boton = qs('#submitButton');
  boton.disabled = true;
  boton.textContent = 'Guardando...';

  try {
    const n = numeroDistrito();

    if (!n) {
      throw new Error(
        'El distrito de la sesión no es válido.'
      );
    }

    if (!seleccionada || !idUT.value) {
      throw new Error(
        'Seleccione una Unidad Territorial de la lista.'
      );
    }

    const contacto = obtenerDatosContacto();

    validarDatosContacto(contacto);

    const extra = {
      id_seccxut: Number(idUT.value),

      claveUT:
        clave.value.trim(),

      nombreUT:
        nombre.value.trim(),

      seccionesC:
        qs('#seccionesC').value.trim(),

      seccionesP:
        qs('#seccionesP').value.trim(),

      domicilio:
        contacto.domicilio,

      otras_ut:
        other
          .map(select => select.value)
          .filter(Boolean)
    };

    /*
     * Datos que se enviarán mediante POST.
     *
     * API.create() llama a:
     * POST /create/casos
     *
     * api.js transforma este objeto en:
     * {
     *   properties: datosCaso
     * }
     */
    const datosCaso = {
      folio: null,

      distrito:
        dist.value,

      unidad_territorial:
        `${clave.value.trim()} · ${nombre.value.trim()}`,

      nombre_solicitante:
        contacto.nombre_solicitante,

      telefono:
        contacto.telefono,

      correo:
        contacto.correo,

      domicilio:
        contacto.domicilio,

      tipo_caso:
        qs('#tipo_caso').value,

      clasificacion:
        qs('#clasificacion').value,

      involucra_otra_ut:
        qs('#involucra_otra_ut').value,

      descripcion:
        qs('#descripcion').value.trim(),

      medio_solicitud:
        qs('#medio_solicitud').value,

      fase_actual: 1,

      estatus: 'REGISTRADO',

      fecha_registro:
        localDateTime()
    };

    /*
     * Este método realiza el POST.
     */
    const respuestaCreacion = await API.create(
      CONFIG.tables.cases,
      datosCaso
    );

    const idCaso = respuestaCreacion.id;

    if (!idCaso) {
      throw new Error(
        'La API no devolvió el identificador del caso.'
      );
    }

    /*
     * Después de crear el caso, se genera el folio
     * y se actualiza mediante PUT.
     */
    await API.update(
      CONFIG.tables.cases,
      idCaso,
      {
        folio: folio(n, idCaso),
        fase_actual: 2
      }
    );

    /*
     * Guarda los datos adicionales de la fase 1.
     */
    await API.create(
      CONFIG.tables.phases,
      {
        id_caso: Number(idCaso),
        fase: 1,
        estatus: 'CONCLUIDA',
        observaciones: 'Registro inicial',
        datos_json: JSON.stringify(extra),
        fecha_fin: localDateTime()
      }
    );

    /*
     * Carga de documentos.
     */
    const archivos = Array.from(
      qs('#archivos').files || []
    );

    if (archivos.length) {
      const formData = new FormData();

      archivos.forEach(archivo => {
        formData.append(
          'files[]',
          archivo
        );
      });

      formData.append(
        'descripcion',
        `Caso ${idCaso}, fase 1`
      );

      const respuestaCarga = await API.upload(
        CONFIG.tables.files,
        formData
      );

      for (
        const archivo of respuestaCarga.subidos || []
      ) {
        await API.create(
          CONFIG.tables.caseFiles,
          {
            id_caso: Number(idCaso),
            id_archivo: Number(archivo.id),
            fase: 1,
            nombre_original:
              archivo.nombre_original
          }
        );
      }
    }

    localStorage.setItem(
      'mgpc_current_case',
      idCaso
    );

    location.href =
      `fase2-sistema-sam.html?id=${idCaso}`;

  } catch (error) {
    console.error(
      'Error al registrar el caso:',
      error
    );

    notify(
      error.message ||
      'No fue posible guardar el registro.',
      'error'
    );

    boton.disabled = false;
    boton.textContent = 'Guardar y siguiente';
  }
});
``


fijarDistrito();toggle();loadOthers();
