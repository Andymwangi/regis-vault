declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: {
      PDFFormatVersion: string;
      IsAcroFormPresent: boolean;
      IsXFAPresent: boolean;
      [key: string]: unknown;
    };
    metadata: {
      [key: string]: unknown;
    } | null;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: {
      pageNum: number;
      pageIndex: number;
      pageContent: string;
    }) => string | null;
    max?: number;
    version?: string;
  }

  function PDFParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export = PDFParse;
} 