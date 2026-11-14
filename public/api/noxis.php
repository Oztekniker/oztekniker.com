<?php
// Ask NOXIS — server side.
// The browser sends the conversation here; this file adds the NOXIS persona, calls the Claude API
// with the secret key (which never reaches the browser) and returns the reply.
//
// The API key lives OUTSIDE public_html, in noxis-config.php one folder up:
//   <?php return ['key' => 'sk-ant-...'];
// Limits: 20 messages per visitor per hour, 400 per day for the whole site.

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 350;
const MAX_TURNS = 12;          // messages of history sent per request
const MAX_CHARS = 600;         // per visitor message
const PER_IP_PER_HOUR = 20;
const SITE_PER_DAY = 400;

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'POST only');

// ---- config ----
$configFile = dirname(__DIR__, 2) . '/noxis-config.php';
if (!is_file($configFile)) fail(500, 'NOXIS is not configured yet.');
$config = require $configFile;
$key = $config['key'] ?? '';
if (!$key) fail(500, 'NOXIS is not configured yet.');

// ---- input ----
$body = json_decode(file_get_contents('php://input'), true);
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

// ---- rate limits (small files in the server's temp folder) ----
$dir = sys_get_temp_dir() . '/noxis-rl';
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
$ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'noxis');
if (!bump("$dir/site", 86400, SITE_PER_DAY)) fail(429, 'NOXIS is resting for today. Please use the contact form.');
if (!bump("$dir/$ip", 3600, PER_IP_PER_HOUR)) fail(429, "That's plenty of questions for now. Try again in a little while.");

// ---- call Claude ----
$system = file_get_contents(__DIR__ . '/noxis-prompt.txt');
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
    ]),
]);
$res = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false || $status !== 200) fail(502, 'NOXIS could not be reached. Please try again.');
$data = json_decode($res, true);
$reply = '';
foreach ($data['content'] ?? [] as $block) {
    if (($block['type'] ?? '') === 'text') $reply .= $block['text'];
}
echo json_encode(['reply' => trim($reply)]);
