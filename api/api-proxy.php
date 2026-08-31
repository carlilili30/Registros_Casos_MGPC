<?php
declare(strict_types=1);

/*
 * Proxy REST SCCMGPC
 * API real local: http://145.0.50.112/apidata/index.php
 * La clave se elige por ENDPOINT, no solamente por metodo HTTP.
 */

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
const API_KEY_ESCRITURA = 'xyz123456789'; // Sustituir si esta no es la clave real de escritura.
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

$path = trim((string)($_GET['path'] ?? $_GET['endpoint'] ?? ''));
if ($path === '' || str_contains($path, '..')) {
    errorJson(400, 'Ruta no especificada o invalida');
}

$path = '/' . ltrim($path, '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$endpoint = strtolower(explode('/', trim($path, '/'))[0] ?? '');

// POST /search es LECTURA. Solo estos endpoints modifican informacion.
$writeEndpoints = ['create', 'update', 'patch', 'delete', 'upload'];
$isWrite = in_array($endpoint, $writeEndpoints, true);
$apiKey = $isWrite ? API_KEY_ESCRITURA : API_KEY_LECTURA;

// No permitir que el navegador reemplace las claves administradas por el proxy.
$query = $_GET;
unset($query['path'], $query['endpoint'], $query['modo'], $query['api_key']);
$query['api_key'] = $apiKey;

$apiUrl = rtrim(API_BASE_URL, '/') . $path;
$apiUrl .= (str_contains($apiUrl, '?') ? '&' : '?') . http_build_query($query);

$ch = curl_init($apiUrl);
if ($ch === false) {
    errorJson(500, 'No se pudo inicializar cURL');
}

$headers = [
    'Accept: */*',
    'X-Api-Key: ' . $apiKey
];

$options = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => $headers
];

if ($endpoint === 'upload' && $method === 'POST') {
    $postFields = $_POST;
    foreach ($_FILES as $field => $file) {
        if (is_array($file['name'])) {
            foreach ($file['name'] as $index => $name) {
                if (($file['error'][$index] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    // Conserva files[] para que la API reconozca la carga multiple.
                    $postFields[$field . '[' . $index . ']'] = new CURLFile(
                        $file['tmp_name'][$index],
                        $file['type'][$index] ?: 'application/octet-stream',
                        $name
                    );
                }
            }
        } elseif (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $postFields[$field] = new CURLFile(
                $file['tmp_name'],
                $file['type'] ?: 'application/octet-stream',
                $file['name']
            );
        }
    }
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
    errorJson(502, 'No fue posible conectar con la API', ['detalle' => $detail]);
}

$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($ch);

http_response_code($status ?: 502);
foreach (preg_split('/\r\n|\r|\n/', $responseHeaders) as $line) {
    if (stripos($line, 'Content-Type:') === 0 || stripos($line, 'Content-Disposition:') === 0) {
        header($line);
    }
}
if (stripos($responseHeaders, 'Content-Type:') === false) {
    header('Content-Type: application/json; charset=UTF-8');
}

echo $responseBody;
