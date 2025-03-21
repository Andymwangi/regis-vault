declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: {
      [key: string]: any;
    };
    metadata: {
      [key: string]: any;
    };
    version: string;
  }

  function pdf(buffer: Buffer): Promise<PDFData>;
  export = pdf;
} 