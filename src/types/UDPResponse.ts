export type UDPResponse = {
    success: boolean;
    message: string;
    bytesSent?: number;
    data?: string;
    remote?: string;
    remotePort?: number;
};