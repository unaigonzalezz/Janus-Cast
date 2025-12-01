import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";
import { constants } from "fs";
import { access, readFile } from "fs/promises";
import { SendPayloadSettings } from "../types/sendPayloadSettings";
import { TCPResponse } from "../types/TCPResponse";
import { UDPResponse } from "../types/UDPResponse";
import { createImageFromFile } from "../utils/createImageFromFile";
import { regenerateEmptyLogs, writeLog } from "../utils/fileLogger";
import { sendTCP } from "../utils/sendTCP";
import { sendUDP } from "../utils/sendUDP";
import { StreamDeckActionLike } from '../types/streamDeckActionLike';
import { LogType } from '../types/logType';



@action({ UUID: "com.unai-gonzalez.janus-cast.send-payload" })
export class SendPayload extends SingletonAction<SendPayloadSettings> {
  private loadingInterval?: NodeJS.Timeout;
  private uiFailSafeTimer?: NodeJS.Timeout;
  private isSending = false;

  private sendLogPI(ev: { action?: StreamDeckActionLike; context?: string }, message: string, type: LogType) {
    try {
      streamDeck.logger?.info?.(`[${type.toUpperCase()}] ${message}`);
    } catch {}

    writeLog(message, type).catch(() => {});

    try {
      (ev.action as StreamDeckActionLike | undefined)?.sendToPropertyInspector?.({ event: "log", message, type });
    } catch {}
    try {
      const ctx = ev?.context || (ev.action as StreamDeckActionLike | undefined)?.id;
      if (ctx) {
        const sd = streamDeck as unknown as {
          send?: (context: string, event: string, payload: { event: string; message: string; type: LogType }) => void;
        };
        sd.send?.(ctx, "sendToPropertyInspector", { event: "log", message, type });
      }
    } catch {}
  }

  override async onWillAppear(ev: WillAppearEvent<SendPayloadSettings>) {
    const s = ev.payload.settings;

    s.name ??= "Payload";
    s.ip ??= "192.168.1.100";
    s.port ??= 1234;
    s.type ??= "TCP";
    s.timeout ??= 2000;
    s.showName ??= true;
    s.showIp ??= true;
    s.showPort ??= true;

    try {
      const p = s.payload as unknown as string | undefined;
      if (p && (!s.name || !String(s.name).trim())) {
        const file =
          String(p)
            .split(/[\/\\]/)
            .pop() || "";
        const base = file.replace(/\.[^.]*$/, "");
        if (base) s.name = base;
      }
    } catch {}

    await ev.action.setSettings(s);

    if (s.bgImage) {
      const img = await createImageFromFile(s.bgImage);
      await ev.action.setImage(img);
    }

    const titleParts: string[] = [];
    if (s.showName) titleParts.push(s.name || "");
    if (s.showIp) titleParts.push(s.ip || "");
    if (s.showPort) titleParts.push(`${s.port}`);
    const title = titleParts.join("\n");

    if (title) {
      await ev.action.setTitle(title);
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SendPayloadSettings>) {
    const s = ev.payload.settings;

    if (s.bgImage) {
      const img = await createImageFromFile(s.bgImage);
      await ev.action.setImage(img);
    } else {
      await ev.action.setImage();
    }

    let updated = false;
    try {
      const p = s.payload as unknown as string | undefined;
      if (p && (!s.name || !String(s.name).trim())) {
        const file =
          String(p)
            .split(/[\/\\]/)
            .pop() || "";
        const base = file.replace(/\.[^.]*$/, "");
        if (base) {
          s.name = base;
          updated = true;
        }
      }
    } catch {}

    const titleParts: string[] = [];
    if (s.showName) titleParts.push(s.name || "");
    if (s.showIp) titleParts.push(s.ip || "");
    if (s.showPort) titleParts.push(`${s.port}`);
    const title = titleParts.join("\n");

    await ev.action.setTitle(title || "Payload");
    if (updated) {
      try {
        await ev.action.setSettings(s);
      } catch {}
    }
  }

  override async onSendToPlugin(ev: SendToPluginEvent<{ event?: string }, SendPayloadSettings>) {
    try {
      const eventName = ev?.payload?.event;
      if (eventName === "clearLogsPersistent") {
        await regenerateEmptyLogs();
        try {
          await (ev.action as StreamDeckActionLike | undefined)?.showOk?.();
        } catch {}
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendLogPI(ev, `Failed to clear logs: ${msg}`, "error");
      try {
        await (ev.action as StreamDeckActionLike | undefined)?.showAlert?.();
      } catch {}
    }
  }

  private async startLoadingAnimation(action: Pick<StreamDeckActionLike, "setTitle">) {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = undefined;
    }
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let frameIndex = 0;

    this.loadingInterval = setInterval(async () => {
      action.setTitle?.(`${frames[frameIndex]}\nSending...`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);
  }

  private stopLoadingAnimation() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = undefined;
    }
    if (this.uiFailSafeTimer) {
      clearInterval(this.uiFailSafeTimer!);
      this.uiFailSafeTimer = undefined;
    }
  }

  private buildTitleFromSettings(s: SendPayloadSettings): string {
    const titleParts: string[] = [];
    if (s.showName) titleParts.push(s.name || "");
    if (s.showIp) titleParts.push(s.ip || "");
    if (s.showPort) titleParts.push(`${s.port}`);
    return titleParts.join("\n") || "";
  }

  override async onKeyDown(ev: KeyDownEvent<SendPayloadSettings>) {
    const { ip, port, payload, type, bgImage } = ev.payload.settings;
    const portNumber = Number(port);
    const typeValue = (type || "").toUpperCase();
    const payloadProvided = typeof payload === "string" ? payload.trim().length > 0 : Boolean(payload);
    const timeoutSetting = ev.payload.settings.timeout;
    const timeout =
      Number.isFinite(Number(timeoutSetting)) && Number(timeoutSetting) > 0 ? Number(timeoutSetting) : 2000;

    if (this.isSending) {
      this.sendLogPI(ev, "Request ignored: already sending", "warning");
      return;
    }

    const missing: string[] = [];
    if (!ip) missing.push("IP address");
    if (!port && port !== 0) missing.push("Port");
    if (!payloadProvided) missing.push("Payload");
    if (!type) missing.push("Type");

    const fieldErrors: string[] = [];
    if (
      port !== undefined &&
      (Number.isNaN(portNumber) || !Number.isFinite(portNumber) || portNumber <= 0 || portNumber > 65535)
    ) {
      fieldErrors.push(`Invalid port '${String(port)}' (must be 1-65535)`);
    }
    if (type && typeValue !== "TCP" && typeValue !== "UDP") {
      fieldErrors.push(`Invalid type '${type}' (must be TCP or UDP)`);
    }

    if (missing.length > 0 || fieldErrors.length > 0) {
      const details: string[] = [];
      if (missing.length > 0) details.push(`Missing: ${missing.join(", ")}`);
      if (fieldErrors.length > 0) details.push(...fieldErrors);
      const message = `Cannot send: ${details.join(" | ")}`;
      try {
        await ev.action.showAlert();
      } catch {}
      this.sendLogPI(ev, message, "error");
      return;
    }

    const payloadStr = payload as string;
    let actualPayload: string | Buffer = payloadStr;
    let sentFileName: string | undefined;
    let sentFileBytes: number | undefined;
    const looksLikeFilePath = /^[A-Za-z]:[/\\]/.test(payloadStr) || /^[./~]/.test(payloadStr);
    if (looksLikeFilePath) {
      try {
        await access(payloadStr, constants.R_OK);
        const buf = await readFile(payloadStr);
        actualPayload = buf;
        sentFileName = payloadStr.split(/[/\\]/).pop();
        sentFileBytes = buf.byteLength;
        this.sendLogPI(ev, `Reading file content from ${payloadStr}...`, "info");
        this.sendLogPI(ev, `File ready: ${sentFileName} (${sentFileBytes} bytes)`, "info");
      } catch (err: unknown) {
        try {
          await ev.action.showAlert();
        } catch {}
        const msg = err instanceof Error ? err.message : String(err);
        this.sendLogPI(ev, `Failed to read file: ${msg}`, "error");
        return;
      }
    }

    this.isSending = true;
    let finished = false;

    const restoreState = async () => {
      try {
        this.stopLoadingAnimation();
        if (bgImage) {
          const img = await createImageFromFile(bgImage);
          await ev.action.setImage(img);
        } else {
          await ev.action.setImage();
        }
        const s = ev.payload.settings;
        const titleParts: string[] = [];
        if (s.showName) titleParts.push(s.name || "");
        if (s.showIp) titleParts.push(s.ip || "");
        if (s.showPort) titleParts.push(`${s.port}`);
        const title = titleParts.join("\n");
        await ev.action.setTitle(title || "Done");
      } catch {}
    };

    try {
      this.startLoadingAnimation(ev.action);
      if (typeValue === "TCP") {
        this.sendLogPI(ev, `Connecting to ${ip}:${port}....`, "info");
      } else {
        this.sendLogPI(ev, `Initiating ${typeValue} connection to ${ip}:${port} (timeout: ${timeout}ms)...`, "info");
      }

      const pingEvery = Math.max(1500, Math.min(timeout, 10000));
      this.uiFailSafeTimer = setInterval(() => {
        if (!finished) {
          this.sendLogPI(ev, `${typeValue} waiting response...`, "info");
        }
      }, pingEvery);

      const response:
        | UDPResponse
        | TCPResponse
        | { success: false; message: string; data?: string; bytesSent?: number } = await (typeValue === "UDP"
        ? sendUDP(
            ip!,
            portNumber,
            typeof actualPayload === "string" ? actualPayload : (actualPayload as Buffer).toString("utf8"),
            timeout,
            { waitForResponse: true }
          )
        : sendTCP(ip!, portNumber, actualPayload, timeout, { expectResponse: true }));
      finished = true;

      if (response.success === false) {
        this.stopLoadingAnimation();
        try {
          await ev.action.showAlert();
        } catch {}
        this.sendLogPI(ev, `${typeValue} request failed: ${response.message}`, "error");
        const restoreTitle = this.buildTitleFromSettings(ev.payload.settings);
        if (restoreTitle) {
          try {
            await ev.action.setTitle(restoreTitle);
          } catch {}
        }
        setTimeout(restoreState, 2000);
        return;
      }

      if (typeValue === "UDP") {
        this.sendLogPI(ev, `📡 ${response.message}`, "info");
        const udp = response as UDPResponse;
        if (udp.bytesSent) {
          this.sendLogPI(ev, `Bytes sent: ${udp.bytesSent}`, "info");
        }
        if ("data" in udp && udp.data) {
          this.sendLogPI(ev, `Response data: ${udp.data}`, "info");
        }
      } else {
        if (sentFileName) {
          this.sendLogPI(ev, `Successfully sent file '${sentFileName}' to ${ip}:${port}`, "success");
        }
        this.sendLogPI(ev, `${response.message}`, "info");
        if ("bytesSent" in response && response.bytesSent) {
          this.sendLogPI(ev, `Bytes sent: ${response.bytesSent}`, "info");
        }
        if ("data" in response && response.data) {
          this.sendLogPI(ev, `Response data: ${response.data}`, "info");
        }
      }

      this.stopLoadingAnimation();
      try {
        await ev.action.showOk();
      } catch {}
      this.sendLogPI(ev, `${typeValue} request completed successfully`, "success");
      const restoreTitle = this.buildTitleFromSettings(ev.payload.settings);
      if (restoreTitle) {
        try {
          await ev.action.setTitle(restoreTitle);
        } catch {}
      }
      setTimeout(restoreState, 1500);
    } catch (error: unknown) {
      finished = true;
      this.stopLoadingAnimation();
      try {
        await ev.action.showAlert();
      } catch {}
      const errorMessage = (() => {
        if (error instanceof Error) return error.message;
        if (typeof error === "object" && error !== null) return JSON.stringify(error);
        return String(error);
      })();
      if (typeValue === "TCP") {
        this.sendLogPI(ev, `An error occurred: ${errorMessage}`, "error");
        if (error instanceof Error && error.stack) {
          this.sendLogPI(ev, String(error.stack), "error");
        }
      } else {
        this.sendLogPI(ev, `${typeValue} request failed: ${errorMessage}`, "error");
      }
      const restoreTitle = this.buildTitleFromSettings(ev.payload.settings);
      if (restoreTitle) {
        try {
          await ev.action.setTitle(restoreTitle);
        } catch {}
      }
      setTimeout(restoreState, 2000);
    } finally {
      this.stopLoadingAnimation();
      this.isSending = false;
    }
  }
}
