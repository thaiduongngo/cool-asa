import { ApiFileData, AppConfig } from '@/lib/types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Remove "data:mime/type;base64," prefix
    reader.onerror = (error) => reject(error);
  });
};

export const validateFile = (file: File, appConfig: AppConfig | null): string | null => {
  if (!appConfig) {
    throw new Error(`Application Config is not defined.`);
  }
  if (!appConfig.allowedFileTypes?.includes(file.type)) {
    return `Invalid file type. Allowed: ${appConfig?.allowedFileTypes?.join(', ')}`;
  }
  if (file.size > appConfig.maxFileSizeMB * 1024 * 1024) {
    return `File is too large. Max size: ${appConfig.maxFileSizeMB}MB`;
  }
  return null; // File is valid
}

export const prepareFileDataForApi = async (file: File, appConfig: AppConfig | null): Promise<ApiFileData | null> => {
  const validationError = validateFile(file, appConfig);
  if (validationError) {
    console.error("File validation failed:", validationError);
    // Optionally, throw an error or show a user message here
    return null;
  }

  try {
    const base64Data = await fileToBase64(file);
    return {
      mimeType: file.type,
      base64Data,
      name: file.name,
    };
  } catch (error) {
    console.error("Error converting file to Base64:", error);
    return null;
  }
}