import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';

interface Props {
  auBlob: Blob | null;
  onVoicePrompt: (auBlob: Blob | null) => void;
}

const AudioRecorder: React.FC<Props> = ({
  auBlob,
  onVoicePrompt,
}) => {
  const [recording, setRecording] = useState(false);
  const [auURL, setAuURL] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (auBlob) {
      setAuURL(URL.createObjectURL(auBlob))
    }
    else {
      setAuURL("");
    }
  }, [auBlob]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);

    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorder.current.onstop = () => {
      const auBlob = new Blob(
        audioChunks.current,
        {
          type: "audio/webm"
        }
      );
      onVoicePrompt(auBlob);
      audioChunks.current = [];
    };

    mediaRecorder.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
    }
    setRecording(false);
  };

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <button onClick={stopRecording} className="p-2 text-gray-500 hover:text-red-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0" >
          <FaStop size={20} />
        </button>
      ) : (
        <button onClick={startRecording} className="p-2 text-gray-500 hover:text-red-700 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
          <FaMicrophone size={20} />
        </button>
      )}
      {auURL ?
        <audio src={auURL}
          controls
          controlsList="noplaybackrate nodownload"
          hidden />
        : " "}
    </div>

  );
};

export default AudioRecorder;