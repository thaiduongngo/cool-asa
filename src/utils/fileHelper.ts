import { ApiFileData, AppConfig, AttachedFile } from '@/lib/types';

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

export const prepareFilesDataForApi = async (attachedFiles: AttachedFile[], appConfig: AppConfig | null)
  : Promise<ApiFileData[]> => {
  const results = await Promise.all(attachedFiles.map(async (v) => {
    const validationError = validateFile(v.file, appConfig);
    if (validationError) {
      console.error("File validation failed:", validationError);
      return null;
    }
    try {
      const base64Data = await fileToBase64(v.file);
      return {
        mimeType: v.file.type,
        base64Data,
        name: v.file.name,
      };
    } catch (error) {
      console.error("Error converting file to Base64:", error);
      return null;
    }
  }));
  // Optionally filter out nulls if you want only valid files
  return results.filter((item): item is ApiFileData => item !== null);
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

export const getAudioBlobFromUrl = async (url: string): Promise<Blob | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'audio/mpeg' }); // Adjust the type if needed
  } catch (error) {
    console.error("Error fetching audio:", error);
    return null;
  }
}

export const MAX_NUM_ATTACHED = 5;