export const CONFIG = {
  // Ruta del proxy
  proxyUrl: '/sitios/SCCMGPCCOPIA/api/api-proxy.php',

  // URL del sistema SAM que se mostrará dentro de la Fase 2
  phase2ExternalUrl: 'http://145.0.50.112/Sistema_encuestas_MGPC/index.html',

  tables: {
    cases: 'casos',
    phases: 'seguimiento_fases',
    files: 'archivos',
    users: 'usuarios',
    caseFiles: 'casos_archivos',
    caseApplicants: 'casos_solicitantes',
    territorial: 'seccxut',
    caseAdditionalUTs: 'casos_ut_adicionales',
    casesWithoutUpdates: 'casos_sin_actualizacion'
  },

  maxFileMB: 100,

  allowedFiles: [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ],

  classificationSkip: 'CAMBIO DE NOMENCLATURA'
};