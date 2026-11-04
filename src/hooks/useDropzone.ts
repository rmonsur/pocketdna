/** Minimal drag/drop + file state for the upload card (raw DNA exports only). */

import { useRef, useState } from "react";

export function useDropzone() {
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const bindDrop = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped !== undefined) {
        setFile(dropped);
        setNotice("File ready. Generate to build your episode.");
      }
    },
  };

  return {
    file,
    notice,
    setNotice,
    fileInput,
    bindDrop,
    pickFile: () => {
      fileInput.current?.click();
    },
    onFiles: (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files?.[0];
      if (picked !== undefined) {
        setFile(picked);
        setNotice("File ready. Generate to build your episode.");
      }
      e.target.value = "";
    },
  };
}
