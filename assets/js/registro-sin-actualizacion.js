import {API} from './api.js';
import {CONFIG} from './config.js';
import {qs, notify, initShell, getSession, localDateTime} from './common.js';

initShell();
const form=qs('#sinActualizacionForm');
const distritoInput=qs('#distrito');
const fechaInput=qs('#fecha_registro');
const confirmacion=qs('#confirmacion');
const boton=qs('#submitButton');
const resultado=qs('#resultado');
const folioGenerado=qs('#folioGenerado');
let enviado=false;

function valor(obj,...keys){for(const k of keys){if(obj?.[k]!==undefined&&obj?.[k]!==null)return obj[k];}return '';}
function numeroDistrito(){const s=getSession()||{};const raw=valor(s,'distrito','claveDT','numeroDistrito','id_distrito');const m=String(raw).match(/\d+/);const n=m?Number(m[0]):0;return n>=1&&n<=33?n:0;}
function fechaLegible(){return new Intl.DateTimeFormat('es-MX',{dateStyle:'long',timeStyle:'medium'}).format(new Date());}
function crearFolio(numero,id){return `SCA-D${String(numero).padStart(2,'0')}-${new Date().getFullYear()}-${String(id).padStart(6,'0')}`;}

function escaparPdf(texto){return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function descargarAcusePDF(datos){
 const lineas=['ACUSE DE REGISTRO SIN CASOS DE ACTUALIZACION','',`Folio: ${datos.folio}`,`Distrito: ${datos.distrito}`,`Fecha y hora de registro: ${datos.fechaLegible}`,'','Se confirma que, a la fecha y hora indicadas, no existen','casos de actualizacion para reportar en el distrito asignado.','',`Identificador interno: ${datos.idCaso}`,'','Registro recibido y concluido correctamente.'];
 let y=760;const ops=['BT','/F1 16 Tf','72 800 Td',`(${escaparPdf(lineas[0])}) Tj`,'/F1 11 Tf'];
 for(const l of lineas.slice(1)){y-=24;ops.push(`0 -24 Td (${escaparPdf(l)}) Tj`);}ops.push('ET');
 const stream=ops.join('\n');const objs=[null,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let pdf='%PDF-1.4\n',offsets=[0];for(let i=1;i<objs.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}
 const xref=pdf.length;pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<objs.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 const blob=new Blob([pdf],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`acuse-${datos.folio}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function iniciar(){const n=numeroDistrito();distritoInput.value=n?`Distrito ${n}`:'';fechaInput.value=fechaLegible();if(!n)notify('La sesión no contiene un distrito válido.','error');}
confirmacion.addEventListener('change',()=>{boton.disabled=!confirmacion.checked||!numeroDistrito()||enviado;});
form.addEventListener('submit',async e=>{e.preventDefault();if(enviado)return;if(!form.reportValidity())return;const numero=numeroDistrito();if(!numero){notify('El distrito de la sesión no es válido.','error');return;}enviado=true;boton.disabled=true;boton.textContent='Registrando...';
 try{
  const fecha=localDateTime();
  const caso=await API.create(CONFIG.tables.cases,{folio:null,distrito:`Distrito ${numero}`,tipo_caso:'SIN_CASOS_ACTUALIZACION',fecha_solicitud:fecha.slice(0,10),clasificacion:'SIN CASOS DE ACTUALIZACION',involucra_otra_ut:'No',descripcion:'Confirmación de inexistencia de casos de actualización.',fase_actual:0,estatus:'CONCLUIDO',fecha_registro:fecha});
  const idCaso=Number(caso.id||caso.id_caso);if(!idCaso)throw new Error('La API no devolvió el identificador del registro.');
  const folio=crearFolio(numero,idCaso);
  await API.update(CONFIG.tables.cases,idCaso,{folio,estatus:'CONCLUIDO',fase_actual:0});
  await API.create(CONFIG.tables.casesWithoutUpdates,{id_caso:idCaso,folio,distrito:`Distrito ${numero}`,confirmacion:1,fecha_registro:fecha});
  const datos={tipo_registro:'SIN_CASOS_ACTUALIZACION',distrito:`Distrito ${numero}`,confirmacion:true,folio,fecha_registro:fecha};
  await API.create(CONFIG.tables.phases,{id_caso:idCaso,fase:0,estatus:'CONCLUIDA',observaciones:'Reporte sin casos de actualización',datos_json:JSON.stringify(datos),fecha_fin:fecha});
  folioGenerado.textContent=folio;resultado.classList.remove('hidden');boton.textContent='Registro enviado';confirmacion.disabled=true;
  descargarAcusePDF({folio,distrito:`Distrito ${numero}`,fechaLegible:fechaInput.value,idCaso});
 }catch(error){enviado=false;boton.disabled=!confirmacion.checked;boton.textContent='Confirmar, generar folio y descargar acuse';console.error(error);notify(error.message||'No fue posible guardar el reporte.','error');}
});
iniciar();