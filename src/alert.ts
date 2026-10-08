import { Alert as NativeAlert, AlertButton, Platform } from 'react-native';

// react-native-web ships an Alert that does nothing, so on the web fall back to the browser's own dialogs.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, buttons);
    const text = message ? `${title}\n\n${message}` : title;
    const action = buttons?.find((b) => b.style !== 'cancel');
    if (buttons && buttons.length > 1) {
      if (window.confirm(text)) action?.onPress?.();
    } else {
      window.alert(text);
      action?.onPress?.();
    }
  },
};
