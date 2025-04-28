declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFParseOptions {
    max?: number;
    version?: string;
    pagerender?: (pageData: any) => string;
  }

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function PDFParse(
    dataBuffer: Buffer, 
    options?: PDFParseOptions
  ): Promise<PDFParseResult>;
  
  export = PDFParse;
} 