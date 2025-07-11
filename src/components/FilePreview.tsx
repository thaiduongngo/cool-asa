import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AttachedFile } from '@/lib/types';
import { FaFilePdf, FaFileAudio, FaFileVideo, FaFile, FaTimes, } from 'react-icons/fa';

interface Props {
  attachedFile: AttachedFile | null;
  onRemove: () => void;
}

const FilePreview: React.FC<Props> = ({ attachedFile, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (attachedFile && attachedFile.file.type.startsWith('image/')) {
      objectUrl = URL.createObjectURL(attachedFile.file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null); // Reset for non-image types
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachedFile]); // Re-run when the attachedFile changes

  if (!attachedFile) return null;

  const { file } = attachedFile;
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isAudio = file.type.startsWith('audio/');
  const isVideo = file.type.startsWith('video/');

  return (
    <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isImage && previewUrl ? (
          <Image
            src={previewUrl}
            alt="Preview"
            width={40}
            height={40}
            className="w-10 h-10 object-cover rounded"
            style={{ objectFit: 'cover', borderRadius: '0.25rem' }}
          />
        ) : isPdf ? (
          <FaFilePdf className="w-6 h-6 text-red-500 flex-shrink-0" />
        ) : isAudio ? (
          <FaFileAudio className="w-6 h-6 text-red-500 flex-shrink-0" />
        ) : isVideo ? (
          <FaFileVideo className="w-6 h-6 text-red-500 flex-shrink-0" />
        ) : (
          <FaFile className="w-6 h-6 text-red-500 flex-shrink-0" />
        )}
        <span className="text-gray-500 line-clamp-1 flex-1 min-w-0" title={file.name}>
          {file.name}
        </span>
        <span className="text-gray-500 text-xs whitespace-nowrap">
          ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </span>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-gray-500 hover:text-red-700 focus:outline-none"
        aria-label="Remove file"
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
};

export default FilePreview;