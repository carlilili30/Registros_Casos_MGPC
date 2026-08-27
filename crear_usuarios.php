<?php
declare(strict_types=1);
require_once __DIR__.'/config/configuracion.php';
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$mensaje=''; $error=''; $creados=[];
if($_SERVER['REQUEST_METHOD']==='POST'){
 try{
  $bd=new mysqli(BD_HOST,BD_USUARIO,BD_CLAVE,BD_NOMBRE);
  $bd->set_charset('utf8mb4');
  $bd->begin_transaction();
  for($i=1;$i<=33;$i++){
   $nombre='Distrito Local '.sprintf('%02d',$i);
   $s=$bd->prepare('INSERT INTO distritos(numero_distrito,nombre_distrito) VALUES(?,?) ON DUPLICATE KEY UPDATE nombre_distrito=VALUES(nombre_distrito)');
   $s->bind_param('is',$i,$nombre); $s->execute();
  }
  $cuentas=[
   ['control01','Control General 1','CONTROL_GENERAL',null,'ControlMGPC2028!'],
   ['control02','Control General 2','CONTROL_GENERAL',null,'ControlMGPC2028!']
  ];
  for($i=1;$i<=33;$i++){
   $cuentas[]=[sprintf('distrito%02d',$i),'Usuario Distrito Local '.sprintf('%02d',$i),'DISTRITO',$i,sprintf('Distrito%02d!',$i)];
  }
  foreach($cuentas as [$nombreUsuario,$nombreCompleto,$perfil,$numeroDistrito,$clavePlano]){
   $idDistrito=null;
   if($numeroDistrito!==null){
    $q=$bd->prepare('SELECT id_distrito FROM distritos WHERE numero_distrito=?');
    $q->bind_param('i',$numeroDistrito); $q->execute();
    $idDistrito=(int)$q->get_result()->fetch_row()[0];
   }
   $hash=password_hash($clavePlano,PASSWORD_DEFAULT);
   $s=$bd->prepare("INSERT INTO usuarios(nombre_usuario,clave_hash,nombre_completo,perfil,id_distrito,activo,debe_cambiar_clave) VALUES(?,?,?,?,?,1,1) ON DUPLICATE KEY UPDATE clave_hash=VALUES(clave_hash),nombre_completo=VALUES(nombre_completo),perfil=VALUES(perfil),id_distrito=VALUES(id_distrito),activo=1,debe_cambiar_clave=1");
   $s->bind_param('ssssi',$nombreUsuario,$hash,$nombreCompleto,$perfil,$idDistrito);
   $s->execute();
   $creados[]=['usuario'=>$nombreUsuario,'clave'=>$clavePlano,'perfil'=>$perfil,'distrito'=>$numeroDistrito];
  }
  $total=(int)$bd->query('SELECT COUNT(*) FROM usuarios WHERE activo=1')->fetch_row()[0];
  if($total<35) throw new RuntimeException('La verificación detectó menos de 35 usuarios activos.');
  $bd->commit();
  $mensaje="Usuarios generados y verificados correctamente. Total activo: $total";
 }catch(Throwable $e){
  if(isset($bd)) try{$bd->rollback();}catch(Throwable $ignorar){}
  $error=$e->getMessage();
 }
}
?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Crear usuarios SCCMGPC</title><link rel="stylesheet" href="public/css/estilos.css"></head><body><div class="contenedor"><section class="tarjeta"><h1>Crear y reparar usuarios</h1><?php if($error):?><div class="aviso error"><?=htmlspecialchars($error)?></div><?php endif?><?php if($mensaje):?><div class="aviso"><?=htmlspecialchars($mensaje)?></div><div class="acciones"><a class="boton" href="index.php">Ir al inicio de sesión</a></div><br><table><tr><th>Usuario</th><th>Contraseña inicial</th><th>Perfil</th><th>Distrito</th></tr><?php foreach($creados as $u):?><tr><td><?=htmlspecialchars($u['usuario'])?></td><td><?=htmlspecialchars($u['clave'])?></td><td><?=htmlspecialchars($u['perfil'])?></td><td><?=htmlspecialchars((string)($u['distrito']??'General'))?></td></tr><?php endforeach?></table><?php else:?><p>Este proceso inserta o repara las 35 cuentas en la tabla <b>usuarios</b>. Si una cuenta ya existe, restablece su contraseña inicial y la activa.</p><form method="post"><button class="boton">Crear y verificar 35 usuarios</button></form><?php endif?></section></div></body></html>
