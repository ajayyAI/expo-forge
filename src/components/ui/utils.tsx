import { showMessage } from "react-native-flash-message";
import { translate } from "@/lib/i18n";

export function showErrorMessage(message?: string) {
  showMessage({
    message: message ?? translate("common.error_generic"),
    type: "danger",
    duration: 4000,
  });
}

export function extractError(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    const messages = data.map((item) => {
      return `  ${extractError(item)}`;
    });

    return `${messages.join("")}`;
  }

  if (typeof data === "object" && data !== null) {
    const messages = Object.entries(data).map((item) => {
      const [key, value] = item;
      const separator = Array.isArray(value) ? ":\n " : ": ";

      return `- ${key}${separator}${extractError(value)} \n `;
    });
    return `${messages.join("")} `;
  }
  return translate("common.error_generic");
}
