"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PhotoItem } from "@/lib/report-templates/types";
import { uploadReportPhoto } from "@/lib/report-photos";
import { uploadReportPhotoViaToken } from "@/lib/report-photos";

export type ReportPhotoUploader = (
    file: File,
    sectionId: string,
    fieldId: string,
) => Promise<PhotoItem>;

const UploadContext = createContext<ReportPhotoUploader | null>(null);

export function UploadProvider({ uploader, children }: { uploader: ReportPhotoUploader; children: ReactNode }) {
    return <UploadContext.Provider value={uploader}>{children}</UploadContext.Provider>;
}

/** Returns the photo uploader scoped to the current report context. Returns
 *  null if no provider is present (e.g. read-only side-sheet preview). */
export function usePhotoUploader(): ReportPhotoUploader | null {
    return useContext(UploadContext);
}

/** Build an internal (session-authenticated) uploader. */
export function makeInternalUploader(tenantId: string, reportId: string): ReportPhotoUploader {
    return (file, sectionId, fieldId) => uploadReportPhoto(file, tenantId, reportId, sectionId, fieldId);
}

/** Build an external (token-authenticated) uploader. */
export function makeExternalUploader(token: string): ReportPhotoUploader {
    return (file, sectionId, fieldId) => uploadReportPhotoViaToken(file, token, sectionId, fieldId);
}
