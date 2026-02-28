  import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from "pdfjs-dist";

  // Set workerSrc to the correct version for your setup
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

  export interface PdfMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
    pageCount: number;
    pdfVersion?: string;
    xmpMetadata?: object | string;
  }

  // Helper: ensure value is string or undefined
  function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  // Parse PDF date format (D:YYYYMMDDHHmmSS)
  function parsePdfDate(pdfDate?: string): string | undefined {
    if (!pdfDate) return undefined;

    const match = pdfDate.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!match) return pdfDate;

    const [, year, month, day, hour, min, sec] = match;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(min),
      Number(sec)
    );

    return date.toLocaleString(); // e.g., "MM/DD/YYYY, HH:MM:SS"
  }

  // Fetch PDF header for version info
  async function fetchPdfVersion(url: string): Promise<string | undefined> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const header = new TextDecoder().decode(buffer.slice(0, 20)).split("\n")[0].trim();
    const match = header.match(/%PDF-(\d\.\d)/);
    return match ? match[1] : undefined;
  }
  export async function extractPdfMetadata(
    url: string,
    password?: string
  ): Promise<PdfMetadata | "PASSWORD_PROTECTED" | null> {
    try {
      const loadingTask = getDocument({ url, password });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
  
      const meta = (await pdf.getMetadata()) as { info: any; metadata?: any };
  
      let xmp: any = null;
      if (meta.metadata?.getAll) {
        try {
          xmp = meta.metadata.getAll();
        } catch {}
      } else if (meta.metadata?.get) {
        try {
          xmp = meta.metadata.get("xmpmeta") || meta.metadata.get("xml");
        } catch {}
      }
  
      // Get PDF version
      let pdfVersion: string | undefined;
      try {
        // @ts-ignore
        pdfVersion = pdf.pdfInfo?.pdfFormatVersion;
      } catch {}
      if (!pdfVersion) pdfVersion = await fetchPdfVersion(url);
  
      return {
        title: toStringOrUndefined(meta.info.Title),
        author: toStringOrUndefined(meta.info.Author),
        subject: toStringOrUndefined(meta.info.Subject),
        keywords: toStringOrUndefined(meta.info.Keywords),
        creator: toStringOrUndefined(meta.info.Creator),
        producer: toStringOrUndefined(meta.info.Producer),
        creationDate: parsePdfDate(meta.info.CreationDate ?? meta.info.CreateDate),
        modificationDate: parsePdfDate(meta.info.ModDate),
        pageCount: pdf.numPages,
        pdfVersion,
        xmpMetadata: xmp ?? undefined,
      };
    } catch (error: any) {
      // Even if password-protected, try to fetch PDF version and page count
      if (error?.name === "PasswordException") {
        console.warn("PDF is password-protected:", url);
  
        // Fetch PDF version manually
        const pdfVersion = await fetchPdfVersion(url);
  
        // Fetch number of pages without opening the full document
        try {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const loadingTask = getDocument({ data: buffer, password: "" }); // empty password
          const pdf: PDFDocumentProxy = await loadingTask.promise;
          return {
            pageCount: pdf.numPages,
            pdfVersion,
          } as PdfMetadata;
        } catch {
          // If that fails, return at least version
          return { pageCount: 0, pdfVersion } as PdfMetadata;
        }
      }
  
      console.error("Error extracting PDF metadata:", error);
      return null;
    }
  }
  