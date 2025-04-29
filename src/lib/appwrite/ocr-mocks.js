// Mock implementation of jsPDF for server-side use

// Mock PDF class
export class MockPDF {
  constructor() {
    this.content = [];
    this.metadata = {};
    this.fontSize = 12;
    // Add internal property for better compatibility
    this.internal = {
      pageSize: {
        getWidth: () => 210, // A4 width in mm
        getHeight: () => 297, // A4 height in mm
      }
    };
  }

  setProperties(props) {
    this.metadata = { ...props };
    return this;
  }

  setFontSize(size) {
    this.fontSize = size;
    return this;
  }

  text(text, x, y, options) {
    this.content.push({ type: 'text', text, x, y, options, fontSize: this.fontSize });
    return this;
  }

  splitTextToSize(text, maxWidth) {
    // Simple mock that splits text by newlines and handles long lines
    const lines = text.split('\n');
    // Simulate wrapping of long lines
    return lines.reduce((acc, line) => {
      if (line.length > maxWidth / 5) { // Rough approximation of text width
        // Split long lines into multiple lines
        const chunks = [];
        for (let i = 0; i < line.length; i += Math.floor(maxWidth / 5)) {
          chunks.push(line.substring(i, i + Math.floor(maxWidth / 5)));
        }
        return [...acc, ...chunks];
      }
      return [...acc, line];
    }, []);
  }

  output(type) {
    if (type === 'arraybuffer') {
      // Create a buffer with some actual content for testing
      const textContent = this.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      
      // Convert text to ArrayBuffer
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(textContent);
      return uint8Array.buffer;
    }
    return '';
  }

  // Add any other methods you need to mock
}

// Export a factory function to match jsPDF's export
export const createJsPDF = () => new MockPDF(); 