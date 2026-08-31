<?php
declare(strict_types=1);

// Proxy exclusivo para AMBIENTE LOCAL.
// Apunta a la API de desarrollo y usa dos API keys: lectura y escritura.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

define('API_BASE_URL', 'https://145.0.90.250/index.php');
define('API_HOST', 'devsiga.iecm.mx');
define('AMBIENTE', 'LOCAL');
define('API_KEY_LECTURA', 'a1b2c3d4e5f6g7h8i9j0');
define('API_KEY_ESCRITURA', 'xyz123456789');

function responderErrorLocal(int $codigo, string $mensaje, array $extra = []): void
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(array_merge(['error' => $mensaje, 'ambiente' => AMBIENTE], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

$endpoint = trim((string)($_GET['endpoint'] ?? $_GET['path'] ?? ''));
if ($endpoint === '' || strpos($endpoint, '..') !== false) {
    responderErrorLocal(400, 'Endpoint no especificado o invalido');
}

$endpoint = '/' . ltrim($endpoint, '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$primerSegmento = strtolower(explode('/', trim($endpoint, '/'))[0] ?? '');
$endpointsEscritura = ['create', 'update', 'patch', 'delete', 'upload'];
$esEscritura = $method !== 'GET' || in_array($primerSegmento, $endpointsEscritura, true);
$apiKey = $esEscritura ? API_KEY_ESCRITURA : API_KEY_LECTURA;

$queryParams = $_GET;
unset($queryParams['endpoint'], $queryParams['path'], $queryParams['modo'], $queryParams['api_key']);
$queryParams['api_key'] = $apiKey;
$apiUrl = rtrim(API_BASE_URL, '/') . $endpoint;
if ($queryParams) {
    $apiUrl .= (strpos($apiUrl, '?') === false ? '?' : '&') . http_build_query($queryParams);
}

$ch = curl_init($apiUrl);
if ($ch === false) {
    responderErrorLocal(500, 'No fue posible inicializar cURL');
}

$headers = ['Accept: */*', 'Host: ' . API_HOST, 'X-Api-Key: ' . $apiKey];
$options = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HEADER => true
];

if ($primerSegmento === 'upload' && $method === 'POST') {
    $postFields = $_POST;
    foreach ($_FILES as $field => $fileData) {
        if (is_array($fileData['name'])) {
            foreach ($fileData['name'] as $i => $name) {
                if (($fileData['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
                    $postFields[$field . '[' . $i . ']'] = new CURLFile($fileData['tmp_name'][$i], $fileData['type'][$i], $name);
                }
            }
        } elseif (($fileData['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK) {
            $postFields[$field] = new CURLFile($fileData['tmp_name'], $fileData['type'], $fileData['name']);
        }
    }
    $options[CURLOPT_POSTFIELDS] = $postFields;
} elseif (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $body = file_get_contents('php://input');
    if ($body !== false && $body !== '') {
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_POSTFIELDS] = $body;
    }
}

$options[CURLOPT_HTTPHEADER] = $headers;
curl_setopt_array($ch, $options);
$response = curl_exec($ch);
if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    responderErrorLocal(502, 'Error de conexion con la API', ['detalle' => $error]);
}

$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$rawHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
curl_close($ch);

http_response_code($httpCode ?: 502);
foreach (preg_split('/\r\n|\r|\n/', $rawHeaders) as $headerLine) {
    if (stripos($headerLine, 'Content-Type:') === 0 || stripos($headerLine, 'Content-Disposition:') === 0) {
        header($headerLine);
    }
}
if (stripos($rawHeaders, 'Content-Type:') === false) {
    header('Content-Type: application/json; charset=UTF-8');
}
echo $body;
