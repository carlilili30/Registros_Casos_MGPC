import {CONFIG} from './config.js';

async function request(path, {method = 'GET', body = null, headers = {}} = {}) {
  const options = {
    method,
    headers: {...headers}
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== null) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  // La API key no se envía desde JavaScript.
  // api-proxy.php selecciona la llave de lectura o escritura según la ruta.
  const response = await fetch(
    `${CONFIG.proxyUrl}?path=${encodeURIComponent(path)}`,
    options
  );

  const contentType = response.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.blob();
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && !(data instanceof Blob)
        ? (data.error || data.message || `Error API ${response.status}`)
        : `Error API ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export const API = {
  list: (table, {limit = 100, offset = 0} = {}) =>
    request(`/data/${table}?limit=${limit}&offset=${offset}`),

  record: (table, id) =>
    request(`/record/${table}/${encodeURIComponent(id)}`),

  filter: (table, params = {}) =>
    request(`/filter/${table}?${new URLSearchParams(params).toString()}`),

  search: (table, body) =>
    request(`/search/${table}`, {
      method: 'POST',
      body
    }),

  info: table =>
    request(`/info/${table}`),

  create: (table, properties) =>
    request(`/create/${table}`, {
      method: 'POST',
      body: {properties}
    }),

  update: (table, id, properties) =>
    request(`/update/${table}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: {properties}
    }),

  patch: (table, id, properties) =>
    request(`/patch/${table}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: {properties}
    }),

  remove: (table, id) =>
    request(`/delete/${table}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),

  upload: (table, formData) =>
    request(`/upload/${table}`, {
      method: 'POST',
      body: formData
    }),

  fileUrl: (table, id) =>
    `${CONFIG.proxyUrl}?path=${encodeURIComponent(`/file/${table}/${id}`)}`
};
