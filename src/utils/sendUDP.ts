import dgram from "dgram";
import { UDPResponse } from "../types/UDPResponse";

export function sendUDP(
    ip: string,
    port: number,
    payload: string,
    timeout: number,
    options?: { waitForResponse?: boolean; encoding?: BufferEncoding; localPort?: number }
): Promise<UDPResponse> {
    const { waitForResponse = false, encoding = 'utf8', localPort } = options ?? {};

    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket("udp4");
        let done = false;
        let bytesSent: number | undefined;

        const finishOk = (res: UDPResponse) => {
            if (done) return;
            done = true;
            try { socket.close(); } catch {}
            resolve(res);
        };
        const finishErr = (message: string) => {
            if (done) return;
            done = true;
            try { socket.close(); } catch {}
            reject({ success: false, message });
        };

        const timer = setTimeout(() => {
            if (waitForResponse) {
                finishOk({ success: true, message: `UDP no response within ${timeout}ms`, bytesSent });
            } else {
                finishErr(`UDP timeout after ${timeout}ms`);
            }
        }, timeout);

        const doSend = () => {
            socket.send(payload, port, ip, (err, bytes) => {
                if (err) {
                    clearTimeout(timer);
                    finishErr(`UDP error: ${err.message}`);
                    return;
                }
                bytesSent = bytes;
                if (!waitForResponse) {
                    clearTimeout(timer);
                    finishOk({ success: true, message: `UDP packet sent to ${ip}:${port}`, bytesSent });
                }
            });
        };

        if (waitForResponse) {
            socket.once('message', (msg, rinfo) => {
                clearTimeout(timer);
                finishOk({
                    success: true,
                    message: `UDP response from ${rinfo.address}:${rinfo.port}`,
                    bytesSent,
                    data: msg.toString(encoding),
                    remote: rinfo.address,
                    remotePort: rinfo.port,
                });
            });
            socket.bind(localPort ?? 0, () => doSend());
        } else {
            doSend();
        }
    });
}
