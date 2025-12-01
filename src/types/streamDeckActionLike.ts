import { LogType } from './logType';
import { SendPayloadSettings } from './sendPayloadSettings';

export interface StreamDeckActionLike {
  sendToPropertyInspector?: (payload: { event: string; message: string; type: LogType }) => void;
  showOk?: () => Promise<void> | void;
  showAlert?: () => Promise<void> | void;
  setImage?: (image?: string) => Promise<void> | void;
  setTitle?: (title?: string) => Promise<void> | void;
  setSettings?: (settings: SendPayloadSettings) => Promise<void> | void;
  id?: string;
}