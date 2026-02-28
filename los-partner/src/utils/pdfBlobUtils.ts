/**
 * Utility functions for handling PDF blob data from various formats
 */

type SerializedBuffer = { type: "Buffer"; data: number[] };
type NumericIndexObject = { [key: string]: number };
type PdfBlobType = Buffer | SerializedBuffer | NumericIndexObject | ArrayBuffer | number[];

/**
 * Check if the object is a serialized Buffer (from JSON)
 */
export const isSerializedBuffer = (obj: unknown): obj is SerializedBuffer => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    (obj as { type?: string }).type === "Buffer" &&
    Array.isArray((obj as { data?: unknown }).data)
  );
};

/**
 * Check if the object is a numeric index object like {"0": 37, "1": 80, ...}
 */
export const isNumericIndexObject = (obj: unknown): boolean => {
  if (obj === null || typeof obj !== "object") return false;
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
};

/**
 * Get the size of a PDF blob in bytes
 */
export const getPdfBlobSize = (pdfBlob: PdfBlobType | null): number => {
  if (!pdfBlob) return 0;

  if (isSerializedBuffer(pdfBlob)) {
    return pdfBlob.data.length;
  } else if (isNumericIndexObject(pdfBlob)) {
    return Object.keys(pdfBlob).length;
  } else if (pdfBlob && "length" in pdfBlob) {
    return (pdfBlob as ArrayLike<number>).length;
  }
  return 0;
};

/**
 * Convert various PDF blob formats to Uint8Array
 */
export const pdfBlobToUint8Array = (pdfBlob: PdfBlobType): Uint8Array => {
  if (isSerializedBuffer(pdfBlob)) {
    return new Uint8Array(pdfBlob.data);
  } else if (isNumericIndexObject(pdfBlob)) {
    const keys = Object.keys(pdfBlob)
      .map(Number)
      .sort((a, b) => a - b);
    const values = keys.map((key) => (pdfBlob as Record<number, number>)[key]);
    return new Uint8Array(values);
  } else if (pdfBlob instanceof ArrayBuffer) {
    return new Uint8Array(pdfBlob);
  } else if (Array.isArray(pdfBlob)) {
    return new Uint8Array(pdfBlob);
  } else {
    return new Uint8Array(pdfBlob as unknown as ArrayLike<number>);
  }
};

/**
 * Download a PDF blob as a file
 */
export const downloadPdfBlob = (
  pdfBlob: PdfBlobType,
  filename: string
): void => {
  const uint8Array = pdfBlobToUint8Array(pdfBlob);
  const blob = new Blob([uint8Array], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Open a PDF blob in a new tab
 */
export const openPdfBlobInNewTab = (pdfBlob: PdfBlobType): void => {
  const uint8Array = pdfBlobToUint8Array(pdfBlob);
  const blob = new Blob([uint8Array], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  // Note: We don't revoke the URL immediately as the new tab needs it
  // The browser will clean it up when the tab is closed
};
