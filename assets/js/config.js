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
    caseApplicants: 'casos_solicitantes',
    territorial: 'seccxut',
    caseAdditionalUTs: 'casos_ut_adicionales'
  },

  maxFileMB: 100,

  allowedFiles: [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ],

  classificationSkip: 'CAMBIO DE NOMENCLATURA'
};
