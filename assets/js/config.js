export const CONFIG = {
  // Ruta del proxy
  proxyUrl: '/sitios/SCCMGPCCOPIA/api/api-proxy.php',
  // URL del Sistema de Calculo de Encuestas que se mostrara dentro de la Fase 2
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
    casesWithoutUpdates: 'casos_sin_actualizacion',
    phase3Surveys: 'fase3_encuestas'
  },
  maxFileMB: 100,
  allowedFiles: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ],
  classificationSkip: 'CAMBIO DE NOMENCLATURA'
};
