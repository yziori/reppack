import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Upload } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { importAudio } from "../lib/tauriCommands";

export function FileImport() {
  const setSourceFile = useAppStore((s) => s.setSourceFile);
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const [isDragging, setIsDragging] = useState(false);

  const handleOpen = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Audio", extensions: ["mp3"] }],
    });
    if (selected) {
      const info = await importAudio(selected);
      setSourceFile(info.path, info.name);
    }
  }, [setSourceFile]);

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        isDragging
          ? "border-blue-400 bg-blue-950/30"
          : "border-gray-700 hover:border-gray-500"
      }`}
      onClick={handleOpen}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
    >
      <Upload className="mb-3 h-10 w-10 text-gray-500" />
      {sourceFileName ? (
        <p className="text-sm text-gray-300">{sourceFileName}</p>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            Click to select an MP3 file
          </p>
          <p className="mt-1 text-xs text-gray-600">or drag and drop</p>
        </>
      )}
    </div>
  );
}
