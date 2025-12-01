import { LogType } from './logType';

export interface LogEntry {
    timestamp: string;
    type: LogType;
    message: string;
}
