export type TCPResponse = {
    success: boolean;
    message: string;
    data?: string;
    bytesSent?: number;
};