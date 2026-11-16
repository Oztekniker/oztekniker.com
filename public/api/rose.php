<?php
// Ask Rose — server side.
// The browser sends the conversation here; this file adds Rose's persona, calls the Claude API
// with the secret key (which never reaches the browser) and returns the reply.
//
// Who may talk to Rose
//  1. Origin: requests must come from the site itself (ALLOWED_ORIGINS).
//  2. Session: the chat first asks for a session ({"action":"start"}). If Cloudflare Turnstile is
//     configured, it must pass a valid Turnstile token to get one. The session is a signed ticket,
//     tied to the visitor's IP, valid for SESSION_TTL seconds and good for SESSION_MESSAGES messages.
//     Every message must carry a valid session.
//  3. Limits: per visitor per hour and per day for the whole site.
// Plus a monthly spend limit on the API key's workspace in the Claude Console.
//
// Secrets live OUTSIDE public_html, in rose-config.php one folder up:
//   <?php return [
//     'key'              => 'sk-ant-...',          // Claude API key
//     'session_secret'   => 'a long random string', // signs session tickets
//     'turnstile_secret' => '0x...',               // Cloudflare Turnstile secret key (optional)
//   ];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 350;
const MAX_TURNS = 12;          // messages of history sent per request
const MAX_CHARS = 600;         // per visitor message
const PER_IP_PER_HOUR = 15;
const SITE_PER_DAY = 200;
const SESSION_TTL = 1800;      // 30 minutes
const SESSION_MESSAGES = 15;   // messages per session
const ALLOWED_ORIGINS = ['https://oztekniker.com', 'https://www.oztekniker.com'];

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'POST only');

// ---- 1. origin: only the site itself ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!in_array($origin, ALLOWED_ORIGINS, true)) fail(403, 'Forbidden.');

// ---- config ----
$configFile = dirname(__DIR__, 2) . '/rose-config.php';
if (!is_file($configFile)) fail(500, 'Rose is not configured yet.');
$config = require $configFile;
$key = $config['key'] ?? '';
$sessionSecret = $config['session_secret'] ?? '';
$turnstileSecret = $config['turnstile_secret'] ?? '';
if (!$key || strlen($sessionSecret) < 24) fail(500, 'Rose is not configured yet.');

$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ipHash = substr(hash('sha256', $ip . $sessionSecret), 0, 16);
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// ---- small helpers: rate-limit counters in the server's temp folder ----
$dir = sys_get_temp_dir() . '/rose-rl';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
function bump(string $file, int $window, int $limit): bool {
    $now = time();
    $fh = @fopen($file, 'c+');
    if (!$fh) return true; // if we cannot track, do not block
    flock($fh, LOCK_EX);
    $hits = array_filter(array_map('intval', explode(',', stream_get_contents($fh) ?: '')), fn($t) => $t > $now - $window);
    $ok = count($hits) < $limit;
    if ($ok) $hits[] = $now;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, implode(',', $hits));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

// ---- session tickets: "<id>.<expiry>.<iphash>.<signature>" ----
function sign(string $payload, string $secret): string {
    return hash_hmac('sha256', $payload, $secret);
}

// ---- 2a. start: hand out a session (after Turnstile, if configured) ----
if (($body['action'] ?? '') === 'start') {
    if (!bump("$dir/start-$ipHash", 3600, 10)) fail(429, 'Too many new chats. Try again in a little while.');
    if ($turnstileSecret) {
        $cf = (string)($body['turnstile'] ?? '');
        if ($cf === '') fail(403, 'Verification failed. Please refresh the page.');
        $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_POSTFIELDS => http_build_query(['secret' => $turnstileSecret, 'response' => $cf, 'remoteip' => $ip]),
        ]);
        $verify = json_decode((string)curl_exec($ch), true);
        curl_close($ch);
        if (empty($verify['success'])) fail(403, 'Verification failed. Please refresh the page.');
    }
    $payload = bin2hex(random_bytes(8)) . '.' . (time() + SESSION_TTL) . '.' . $ipHash;
    echo json_encode(['session' => $payload . '.' . sign($payload, $sessionSecret)]);
    exit;
}

// ---- 2b. every message needs a valid session ----
$parts = explode('.', (string)($body['session'] ?? ''));
if (count($parts) !== 4) fail(401, 'Session expired. Please reopen the chat.');
[$sid, $exp, $sessIp, $sig] = $parts;
$payload = "$sid.$exp.$sessIp";
if (!hash_equals(sign($payload, $sessionSecret), $sig)) fail(401, 'Session expired. Please reopen the chat.');
if ((int)$exp < time() || !hash_equals($ipHash, $sessIp)) fail(401, 'Session expired. Please reopen the chat.');
if (!preg_match('/^[a-f0-9]{16}$/', $sid)) fail(401, 'Session expired. Please reopen the chat.');
if (!bump("$dir/s-$sid", SESSION_TTL, SESSION_MESSAGES)) fail(429, "That's plenty of questions for now. Try again in a little while.");

// ---- input ----
$messages = $body['messages'] ?? null;
if (!is_array($messages) || !$messages) fail(400, 'No messages.');
$messages = array_slice($messages, -MAX_TURNS);
$clean = [];
foreach ($messages as $m) {
    $role = $m['role'] ?? '';
    $content = trim((string)($m['content'] ?? ''));
    if (!in_array($role, ['user', 'assistant'], true) || $content === '') continue;
    if ($role === 'user' && mb_strlen($content) > MAX_CHARS) fail(400, 'Message too long.');
    $clean[] = ['role' => $role, 'content' => mb_substr($content, 0, 2000)];
}
// the API needs the conversation to start with the visitor
while ($clean && $clean[0]['role'] !== 'user') array_shift($clean);
if (!$clean || end($clean)['role'] !== 'user') fail(400, 'Bad conversation.');

// ---- 3. limits ----
if (!bump("$dir/site", 86400, SITE_PER_DAY)) fail(429, 'Rose is off duty for today. Please use the contact form.');
if (!bump("$dir/$ipHash", 3600, PER_IP_PER_HOUR)) fail(429, "That's plenty of questions for now. Try again in a little while.");

// ---- call Claude ----
$system = file_get_contents(__DIR__ . '/rose-prompt.txt');
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'content-type: application/json',
        'x-api-key: ' . $key,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => MODEL,
        'max_tokens' => MAX_TOKENS,
        'system' => $system,
        'messages' => $clean,
        // short chat answers: no thinking (it would also eat into max_tokens), low effort
        'thinking' => ['type' => 'disabled'],
        'output_config' => ['effort' => 'low'],
    ]),
]);
$res = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false || $status !== 200) fail(502, 'Rose could not be reached. Please try again.');
$data = json_decode($res, true);
$reply = '';
foreach ($data['content'] ?? [] as $block) {
    if (($block['type'] ?? '') === 'text') $reply .= $block['text'];
}
echo json_encode(['reply' => trim($reply)]);
