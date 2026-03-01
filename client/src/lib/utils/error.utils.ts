import axios from "axios";

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (!data) return "Something went wrong. Please try again.";

    // Django field errors — { email: ["..."], username: ["..."] }
    if (typeof data === "object" && !data.detail) {
      const messages = Object.entries(data)
        .map(([field, errors]) => {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
          const errorText = Array.isArray(errors) ? errors[0] : errors;
          return `${fieldName}: ${errorText}`;
        })
        .join("\n");
      return messages;
    }

    // Django detail error — { detail: "..." }
    if (data.detail) return data.detail;
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};