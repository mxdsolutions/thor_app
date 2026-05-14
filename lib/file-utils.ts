import { File as FileIcon, FileText as FileTextIcon, Image as PhotoIcon, FileText as PdfIcon, FileSpreadsheet as SpreadsheetIcon, FileArchive as ZipIcon, Video as VideoIcon, Music as AudioIcon } from "lucide-react";
import type { LucideIcon as Icon } from "lucide-react";

/** Format a byte count for display: 0 B, 12 KB, 3.4 MB, 1.2 GB. */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    const value = bytes / Math.pow(k, i);
    return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/** Pick a Tabler icon based on a file's mime type. Falls back to a generic file icon. */
export function fileIconForMime(mime: string | null | undefined): Icon {
    if (!mime) return FileIcon;
    if (mime.startsWith("image/")) return PhotoIcon;
    if (mime.startsWith("video/")) return VideoIcon;
    if (mime.startsWith("audio/")) return AudioIcon;
    if (mime === "application/pdf") return PdfIcon;
    if (mime.includes("spreadsheet") || mime === "text/csv" || mime.includes("excel")) return SpreadsheetIcon;
    if (mime.includes("zip") || mime.includes("compressed")) return ZipIcon;
    if (mime.startsWith("text/") || mime.includes("document") || mime.includes("word")) return FileTextIcon;
    return FileIcon;
}
