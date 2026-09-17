<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const API_BASE_URL = 'http://145.0.50.112/apidata/index.php';
const API_KEY_LECTURA = 'a1b2c3d4e5f6g7h8i9j0';
const API_KEY_ESCRITURA = 'xyz123456789';
const AMBIENTE = 'LOCAL';

function errorJson(int $status, string $message, array $extra = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(array_merge([
        'error' => $message,
        'ambiente' => AMBIENTE
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function uploadErrorText(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_OK => 'Carga recibida correctamente por PHP.',
        UPLOAD_ERR_INI_SIZE => 'El archivo supera upload_max_filesize.',
        UPLOAD_ERR_FORM_SIZE => 'El archivo supera MAX_FILE_SIZE del formulario.',
        UPLOAD_ERR_PARTIAL => 'El archivo se recibió parcialmente.',
        UPLOAD_ERR_NO_FILE => 'No se recibió ningún archivo.',
        UPLOAD_ERR_NO_TMP_DIR => 'PHP no tiene carpeta temporal disponible.',
        UPLOAD_ERR_CANT_WRITE => 'PHP no pudo escribir el archivo temporal.',
        UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la carga.',
        default => 'Código de carga desconocido: ' . $code
    };
}

function firstUploadedFile(array $files): array
{
    foreach ($files as $field => $file) {
        if (!is_array($file) || !array_key_exists('name', $file)) {
            continue;
        }

        if (is_array($file['name'])) {
            foreach ($file['name'] as $index => $name) {
                $error = (int)($file['error'][$index] ?? UPLOAD_ERR_NO_FILE);
                if ($error !== UPLOAD_ERR_OK) {
                    continue;
                }
                return [
                    'field' => (string)$field,
                    'name' => (string)$name,
                    'tmp_name' => (string)($file['tmp_name'][$index] ?? ''),
                    'type' => (string)($file['type'][$index] ?? 'application/octet-stream'),
                    'size' => (int)($file['size'][$index] ?? 0),
                    'error' => $error
                ];
            }
        } else {
            $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
            if ($error !== UPLOAD_ERR_OK) {
                continue;
            }
            return [
                'field' => (string)$field,
                'name' => (string)($file['name'] ?? ''),
                'tmp_name' => (string)($file['tmp_name'] ?? ''),
                'type' => (string)($file['type'] ?? 'application/octet-stream'),
                'size' => (int)($file['size'] ?? 0),
                'error' => $error
            ];
        }
    }
    return [];
}

function uploadDiagnostics(array $files): array
{
    $result = [];
    foreach ($files as $field => $file) {
        if (!is_array($file)) continue;
        $errors = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        $result[$field] = [
            'name' => $file['name'] ?? null,
            'size' => $file['size'] ?? null,
            'error' => $errors,
            'detalle' => is_array($errors)
                ? array_map(fn($code) => uploadErrorText((int)$code), $errors)
                : uploadErrorText((int)$errors),
            'tmp_name_presente' => !empty($file['tmp_name'])
        ];
    }
    return $result;
}

$path = trim((string)($_GET['path'] ?? $_GET['endpoint'] ?? ''));
if ($path === '' || str_contains($path, '..')) {
    errorJson(400, 'Ruta no especificada o inválida.');
}
$path = '/' . ltrim($path, '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$endpoint = strtolower(explode('/', trim($path, '/'))[0] ?? '');
$writeEndpoints = ['create', 'update', 'patch', 'delete', 'upload'];
$apiKey = in_array($endpoint, $writeEndpoints, true) ? API_KEY_ESCRITURA : API_KEY_LECTURA;
$query = $_GET;
unset($query['path'], $query['endpoint'], $query['modo'], $query['api_key']);
$query['api_key'] = $apiKey;
$apiUrl = rtrim(API_BASE_URL, '/') . $path;
$apiUrl .= (str_contains($apiUrl, '?') ? '&' : '?') . http_build_query($query);

$ch = curl_init($apiUrl);
if ($ch === false) errorJson(500, 'No se pudo inicializar cURL.');

$headers = ['Accept: */*', 'X-Api-Key: ' . $apiKey];
$options = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 180,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => $headers
];

if ($endpoint === 'upload' && $method === 'POST') {
    $archivo = firstUploadedFile($_FILES);
    if (!$archivo) {
        errorJson(400, 'PHP recibió el campo, pero no encontró un archivo con carga correcta.', [
            'campos_recibidos' => array_keys($_FILES),
            'diagnostico_archivos' => uploadDiagnostics($_FILES),
            'content_length' => $_SERVER['CONTENT_LENGTH'] ?? null,
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'upload_tmp_dir' => ini_get('upload_tmp_dir') ?: sys_get_temp_dir()
        ]);
    }

    $tmpName = $archivo['tmp_name'];
    if ($tmpName === '' || !is_file($tmpName) || !is_readable($tmpName)) {
        errorJson(400, 'El archivo temporal no existe o no puede leerse.', [
            'campo' => $archivo['field'],
            'nombre' => $archivo['name'],
            'tamano' => $archivo['size'],
            'temporal_presente' => $tmpName !== '',
            'es_archivo_subido' => $tmpName !== '' && is_uploaded_file($tmpName),
            'es_archivo' => $tmpName !== '' && is_file($tmpName),
            'es_legible' => $tmpName !== '' && is_readable($tmpName),
            'upload_tmp_dir' => ini_get('upload_tmp_dir') ?: sys_get_temp_dir()
        ]);
    }

    $detectedMime = 'application/octet-stream';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $detectedMime = finfo_file($finfo, $tmpName) ?: $detectedMime;
            finfo_close($finfo);
        }
    }

    $postFields = $_POST;
    // La API de destino recibe un solo archivo bajo la clave file.
    $postFields['file'] = new CURLFile($tmpName, $detectedMime, basename($archivo['name']));
    $headers[] = 'Expect:';
    $options[CURLOPT_HTTPHEADER] = $headers;
    $options[CURLOPT_POSTFIELDS] = $postFields;
} elseif (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $body = file_get_contents('php://input');
    if ($body !== false && $body !== '') {
        $headers[] = 'Content-Type: application/json; charset=UTF-8';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = $body;
    }
}

curl_setopt_array($ch, $options);
$response = curl_exec($ch);
if ($response === false) {
    $detail = curl_error($ch);
    curl_close($ch);
    errorJson(502, 'No fue posible conectar con la API.', ['detalle' => $detail]);
}
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($ch);
http_response_code($status ?: 502);
foreach (preg_split('/\r\n|\r|\n/', $responseHeaders) as $line) {
    if (stripos($line, 'Content-Type:') === 0 || stripos($line, 'Content-Disposition:') === 0) header($line);
}
if (stripos($responseHeaders, 'Content-Type:') === false) header('Content-Type: application/json; charset=UTF-8');
echo $responseBody;
