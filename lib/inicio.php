<?php
declare(strict_types=1);
require_once __DIR__.'/../config/configuracion.php';
if(session_status()!==PHP_SESSION_ACTIVE)session_start();
mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
function bd():mysqli{static $c;if(!$c){$c=new mysqli(BD_HOST,BD_USUARIO,BD_CLAVE,BD_NOMBRE);$c->set_charset('utf8mb4');}return $c;}
function h(?string $v):string{return htmlspecialchars($v??'',ENT_QUOTES,'UTF-8');}
function ir(string $ruta):never{header('Location: '.URL_BASE.'/'.$ruta);exit;}
function usuario():?array{return $_SESSION['usuario']??null;}
function exigir_sesion():void{if(!usuario())ir('index.php');}
function es_control():bool{return in_array(usuario()['perfil']??'', ['CONTROL_GENERAL','DEOEYG'],true);}
function token():string{if(empty($_SESSION['token']))$_SESSION['token']=bin2hex(random_bytes(24));return $_SESSION['token'];}
function validar_token():void{if(!hash_equals($_SESSION['token']??'',$_POST['token']??''))throw new RuntimeException('La sesión del formulario expiró.');}
function mensaje(string $m,string $tipo='correcto'):void{$_SESSION['mensaje']=[$m,$tipo];}
function tomar_mensaje():array{$m=$_SESSION['mensaje']??['',''];unset($_SESSION['mensaje']);return $m;}
function folio(int $d,int $id):string{return sprintf('MGPC-2028-DD%02d-%05d',$d,$id);}
function requiere_actualizacion_externa(?string $t):bool{return in_array($t,['DIVISION','FUSION','INCLUSION_EXCLUSION_SECCIONES','INCLUSION_EXCLUSION_MANZANAS','COMBINACION'],true);}
function etiqueta_estado(string $e):string{return ['REGISTRADO'=>'Registrado','CLASIFICADO'=>'Clasificado','PLANEACION_COMPLETA'=>'Planeación completa','CAMPO_COMPLETO'=>'Campo y encuestas completos','ACTUALIZACION_EXTERNA_COMPLETA'=>'Actualización externa completa','PROPUESTA_COMPLETA'=>'Propuesta integrada','EN_REVISION'=>'En revisión técnica','CERRADO'=>'Cerrado','SIN_CASOS'=>'Sin casos de actualización'][$e]??$e;}
function bitacora(string $accion,?int $caso=null,string $detalle=''):void{$uid=usuario()['id_usuario']??null;$ip=$_SERVER['REMOTE_ADDR']??'';$s=bd()->prepare('INSERT INTO bitacora_sistema(id_usuario,id_caso,accion,detalle,direccion_ip) VALUES(?,?,?,?,?)');$s->bind_param('iisss',$uid,$caso,$accion,$detalle,$ip);$s->execute();}
function obtener_caso(int $id):array{$s=bd()->prepare('SELECT c.*,d.numero_distrito,d.nombre_distrito,u.nombre_completo AS usuario_registro FROM casos_actualizacion c JOIN distritos d ON d.id_distrito=c.id_distrito JOIN usuarios u ON u.id_usuario=c.id_usuario_registro WHERE c.id_caso=?');$s->bind_param('i',$id);$s->execute();$c=$s->get_result()->fetch_assoc();if(!$c)throw new RuntimeException('Caso inexistente.');if(!es_control()&&(int)$c['id_distrito']!==(int)usuario()['id_distrito'])throw new RuntimeException('No tiene acceso a este expediente.');return $c;}
