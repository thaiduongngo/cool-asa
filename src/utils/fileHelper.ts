// src/utils/fileHelper.ts
import { ApiFileData } from '@/lib/types';

export const MAX_FILE_SIZE_MB = 20; // Example limit: 20MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]); // Remove "data:mime/type;base64," prefix
    reader.onerror = (error) => reject(error);
  });
};

export const validateFile = (file: File): string | null => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Max size: ${MAX_FILE_SIZE_MB}MB`;
  }
  return null; // File is valid
}

export const prepareFileDataForApi = async (file: File): Promise<ApiFileData | null> => {
  const validationError = validateFile(file);
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