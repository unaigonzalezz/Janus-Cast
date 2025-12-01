export type SendPayloadSettings = {
    name?: string;
    payload?: string;
    timeout?: number;
    type?: "UDP" | "TCP";
    ip?: string;
    port?: number;
    bgImage?: string;

    showName?: boolean;
    showIp?: boolean;
    showPort?: boolean;
};