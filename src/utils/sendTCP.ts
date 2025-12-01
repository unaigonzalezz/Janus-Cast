
import net from "net";
import { TCPResponse } from "../types/TCPResponse";

export function sendTCP(
    ip: string,
    port: number,
    payload: string | Buffer,
    timeout: number,
    options?: { expectResponse?: boolean; endAfterSend?: boolean; encoding?: BufferEncoding }
): Promise<TCPResponse> {
    const { expectResponse = false, endAfterSend = true, encoding = 'utf8' } = options ?? {};

    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let done = false;
        let receivedData = '';
        let idleTimer: NodeJS.Timeout | undefined;
        let connectTimer: NodeJS.Timeout | undefined;

        const safeResolve = (res: TCPResponse) => {
            if (done) return; done = true;
            try { client.destroy(); } catch {}
            resolve(res);
        };
        const safeReject = (msg: string) => {
            if (done) return; done = true;
            try { client.destroy(); } catch {}
            reject({ success: false, message: msg });
        };

        client.setNoDelay(true);
        
        let globalTimeout = setTimeout(() => {
            if (!done && receivedData.length === 0) {
                safeReject(`TCP timeout after ${timeout}ms - no response received`);
            }
        }, timeout);

        client.once('error', (err) => {
            clearTimeout(globalTimeout);
            if (connectTimer) { clearTimeout(connectTimer); connectTimer = undefined; }
            safeReject(`TCP error: ${err.message}`);
        });

        if (expectResponse) {
            let hasReceivedData = false;
            
            client.on('data', (data) => {
                receivedData += data.toString(encoding);
                if (!hasReceivedData) {
                    hasReceivedData = true;
                    clearTimeout(globalTimeout);
                }
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    safeResolve({ 
                        success: true, 
                        message: `TCP idle timeout after ${timeout}ms`, 
                        data: receivedData, 
                        bytesSent: client.bytesWritten 
                    });
                }, timeout);
            });
            
            client.once('close', () => {
                clearTimeout(globalTimeout);
                if (idleTimer) { clearTimeout(idleTimer); idleTimer = undefined; }
                if (!done) {
                    if (receivedData.length > 0) {
                        safeResolve({ 
                            success: true, 
                            message: 'TCP response received', 
                            data: receivedData, 
                            bytesSent: client.bytesWritten 
                        });
                    } else {
                        safeResolve({ 
                            success: true, 
                            message: 'TCP connection closed without response', 
                            bytesSent: client.bytesWritten 
                        });
                    }
                }
            });
        }

        connectTimer = setTimeout(() => {
            safeReject(`Failed to connect to ${ip}:${port} within ${timeout} ms. Connection timed out`);
        }, timeout);

        client.connect(port, ip, () => {
            if (connectTimer) { clearTimeout(connectTimer); connectTimer = undefined; }
            const dataToSend = typeof payload === 'string' ? Buffer.from(payload, encoding) : payload;
            client.write(dataToSend as unknown as Uint8Array, () => {
                if (!expectResponse) {
                    if (endAfterSend) {
                        client.end();
                        client.once('finish', () => {
                            safeResolve({ success: true, message: 'TCP payload sent', bytesSent: client.bytesWritten });
                        });
                    } else {
                        safeResolve({ success: true, message: 'TCP payload sent (connection left open)', bytesSent: client.bytesWritten });
                    }
                } else {
                    if (endAfterSend) {
                        try { client.end(); } catch {}
                    }
                }
            });
        });
    });
}
