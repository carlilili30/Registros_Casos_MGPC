export const CONFIG = {
  // Ruta absoluta porque el sistema esta en /sitios/SCCMGPCCOPIA/
  // y hay HTML dentro de subcarpetas como /fases y /casos.
  proxyUrl: '/sitios/SCCMGPCCOPIA/api/api-proxy.php',

  tables: {
    cases: 'casos',
    phases: 'seguimiento_fases',
    files: 'archivos',
    users: 'usuarios',
    caseFiles: 'casos_archivos',
    territorial: 'seccxut'
  },

  maxFileMB: 25,

  allowedFiles: [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ],

  classificationSkip: 'CAMBIO DE NOMENCLATURA'
};
