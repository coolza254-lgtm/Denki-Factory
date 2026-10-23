/// <reference types="vite/client" />

interface Window {
  denkiHandleBack?: () => boolean;
  DenkiAndroid?: {
    saveJson: (name: string, json: string) => void;
    getUpdateState?: () => string;
    checkForUpdate?: () => void;
    downloadUpdate?: () => void;
    installUpdate?: () => void;
  };
}
