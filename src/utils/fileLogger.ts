import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LogEntry } from "../types/logEntry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.resolve(__dirname, "../janus-cast-logs");
const LOG_HTML_FILE = path.join(LOGS_DIR, "janus-cast-requests.html");

const MAX_LOG_ENTRIES = 500;

let logEntries: LogEntry[] = [];
let writeChain: Promise<void> = Promise.resolve();

async function ensureLogsDir(): Promise<void> {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (error) {
        
    }
}

function buildLogHtml(entries: LogEntry[]): string {
    const safe = (s: string) => s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    const colors: Record<string, string> = {
        info: '#00ff00',
        error: '#ff0000',
        warning: '#ffaa00',
        success: '#00ffff'
    };
    
    const logLines = entries.map(entry => {
        const color = colors[entry.type] || colors.info;
        const time = new Date(entry.timestamp).toLocaleTimeString();
        return `<div class="line" style="color: ${color}; margin-bottom: 4px;">[${time}] ${safe(entry.message)}</div>`;
    }).join("\n");
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Janus Cast – Request Logs</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        const LS_KEYS = {
            paused: 'janusLogs_paused',
            interval: 'janusLogs_interval',
            wrap: 'janusLogs_wrap'
        };
        const DEFAULT_INTERVAL = 5000;

        let timerId = null;

        function getPaused() {
            return localStorage.getItem(LS_KEYS.paused) === '1';
        }
        function setPaused(v) {
            localStorage.setItem(LS_KEYS.paused, v ? '1' : '0');
        }
        function getInterval() {
            const v = parseInt(localStorage.getItem(LS_KEYS.interval) || '', 10);
            return Number.isFinite(v) && v > 0 ? v : DEFAULT_INTERVAL;
        }
        function setIntervalMs(ms) {
            localStorage.setItem(LS_KEYS.interval, String(ms));
        }
        function getWrap() {
            return localStorage.getItem(LS_KEYS.wrap) === '1';
        }
        function setWrap(v) {
            localStorage.setItem(LS_KEYS.wrap, v ? '1' : '0');
        }
        function scheduleRefresh() {
            clearTimeout(timerId);
            if (!getPaused()) {
                timerId = setTimeout(() => window.location.reload(), getInterval());
            }
            updateStatus();
        }
        function updateStatus() {
            const status = document.getElementById('status');
            if (!status) return;
            status.textContent = getPaused() 
                ? 'Status: Paused (no auto-refresh)'
                : 'Status: Auto-refresh • Interval ' + Math.round(getInterval()/1000) + 's';
        }
        function bindControls() {
            const pauseBtn = document.getElementById('toggle-pause');
            const select = document.getElementById('interval-select');
            const wrapChk = document.getElementById('toggle-wrap');

            if (pauseBtn) {
                pauseBtn.textContent = getPaused() ? '▶ Resume' : '⏸ Pause';
                pauseBtn.addEventListener('click', () => {
                    const next = !getPaused();
                    setPaused(next);
                    pauseBtn.textContent = next ? '▶ Resume' : '⏸ Pause';
                    scheduleRefresh();
                });
            }
            if (select) {
                const current = getInterval();
                const found = Array.from(select.options).find(o => parseInt(o.value, 10) === current);
                if (found) select.value = String(current);
                select.addEventListener('change', () => {
                    const ms = parseInt(select.value, 10);
                    if (Number.isFinite(ms) && ms > 0) {
                        setIntervalMs(ms);
                        scheduleRefresh();
                    }
                });
            }
            if (wrapChk) {
                // @ts-ignore
                wrapChk.checked = getWrap();
                wrapChk.addEventListener('change', () => {
                    // @ts-ignore
                    setWrap(!!wrapChk.checked);
                    applyWrapClasses();
                });
            }
        }
        function applyWrapClasses() {
            const container = document.getElementById('log-container');
            if (!container) return;
            container.classList.toggle('whitespace-pre', !getWrap());
            container.classList.toggle('whitespace-pre-wrap', getWrap());
            container.classList.toggle('break-words', getWrap());
        }
        document.addEventListener('DOMContentLoaded', () => {
            bindControls();
            applyWrapClasses();
            scheduleRefresh();
        });
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
    <style>
      :root { --gold: #d4af37; --bronze: #8b4513; }
      body { font-family: 'Spectral', ui-serif, Georgia, serif; }
      h1, h2, h3 { font-family: 'Cinzel', serif; letter-spacing: 0.02em; }
      .scroll-thin { scrollbar-width: thin; scrollbar-color: var(--gold) transparent; }
      .scroll-thin::-webkit-scrollbar { height: 10px; width: 10px; }
      .scroll-thin::-webkit-scrollbar-thumb { background: linear-gradient(180deg, var(--gold), #b08d2a); border-radius: 8px; }
      .scroll-thin::-webkit-scrollbar-track { background: transparent; }
      .line { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; font-size: 0.9rem; }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-[#1a0f0a] via-[#2d1810] to-[#1a0f0a] text-[#f4e8d8] p-5 relative">

    <div class="fixed inset-0 pointer-events-none bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(139,69,19,0.05)_2px,rgba(139,69,19,0.05)_4px)]"></div>

    <header class="relative z-10 bg-gradient-to-br from-[#8b4513] to-[#6b3410] border-4 border-[#d4af37] border-b-8 shadow-xl p-6 mb-6 text-center">
        <img src="../imgs/logos/main-logo.png" alt="Main Logo" class="mx-auto mb-2 h-16">
        <h1 class="text-2xl font-semibold tracking-wide">Request Logs</h1>
        <p class="text-xs italic opacity-90 mt-1">Rendered: ${new Date().toLocaleString()}</p>
    </header>

    <div class="relative z-20 sticky top-0 backdrop-blur-sm flex flex-wrap gap-3 justify-center items-center border border-[#8b6914] bg-black/40 p-3 mb-4 rounded-md">
        <button id="toggle-pause" class="bg-gradient-to-br from-[#8b4513] to-[#6b3410] border border-[#d4af37] text-[#f4e8d8] px-3 py-1 rounded">Pause</button>

        <label for="interval-select" class="text-sm text-[#d4af37]">Interval:</label>
        <select id="interval-select" class="bg-gradient-to-br from-[#8b4513] to-[#6b3410] border border-[#d4af37] text-[#f4e8d8] px-2 py-1 rounded">
            <option value="2000">2s</option>
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="30000">30s</option>
            <option value="60000">60s</option>
        </select>

        <label for="toggle-wrap" class="text-sm text-[#d4af37] ml-2">Wrap lines</label>
        <input id="toggle-wrap" type="checkbox" class="accent-[#d4af37]">

        <span id="status" class="text-xs text-[#d4af37]"></span>
    </div>

    <main class="relative z-10 bg-gradient-to-br from-[#8b451366] to-[#6b341066] border border-[#8b6914] p-4 max-h-[80vh] overflow-y-auto rounded shadow-inner scroll-thin">
        <div class="text-center text-[#d4af37] text-sm italic border border-[#d4af37] bg-[#8b451344] px-4 py-2 mb-4" id="hint">
            Showing ${entries.length} latest log${entries.length === 1 ? '' : 's'}${entries.length >= MAX_LOG_ENTRIES ? ' (max reached)' : ''}
        </div>

        <div class="overflow-x-auto scroll-thin">
        <div id="log-container" class="whitespace-pre">
            ${
                entries.length > 0
                ? logLines
                : '<div class="text-center opacity-60 py-20 text-lg text-[#d4af37] italic">No log entries yet. Waiting for requests...</div>'
            }
        </div>
        </div>
    </main>

</body>
</html>`;
}

export async function writeLog(message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info'): Promise<void> {
    try {
        await ensureLogsDir();
        
        logEntries.push({
            timestamp: new Date().toISOString(),
            type,
            message
        });
        
        if (logEntries.length > MAX_LOG_ENTRIES) {
            logEntries = logEntries.slice(-MAX_LOG_ENTRIES);
        }
        writeChain = writeChain.then(async () => {
            const html = buildLogHtml(logEntries);
            await atomicWrite(LOG_HTML_FILE, html);
        }).catch(async () => {
            const html = buildLogHtml(logEntries);
            await atomicWrite(LOG_HTML_FILE, html);
        });
        await writeChain;
    } catch (error) {
        console.error('Failed to write log HTML:', error);
    }
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tmp = path.join(dir, `.${base}.tmp`);
    await fs.writeFile(tmp, content, 'utf8');
    await fs.rename(tmp, filePath);
}

export async function regenerateEmptyLogs(): Promise<void> {
    try {
        await ensureLogsDir();
        logEntries = [];
        writeChain = writeChain.then(async () => {
            const html = buildLogHtml([]);
            await atomicWrite(LOG_HTML_FILE, html);
        }).catch(async () => {
            const html = buildLogHtml([]);
            await atomicWrite(LOG_HTML_FILE, html);
        });
        await writeChain;
    } catch (error) {
        console.error('Failed to regenerate empty log HTML:', error);
    }
}

