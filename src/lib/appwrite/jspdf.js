// Complete mock replacement for jspdf module for Vercel deployment

export class jsPDF {
  constructor() {
    this.content = [];
    this.metadata = {};
    this.fontSize = 12;
    this.internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
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
    return text.split('\n');
  }

  output(type) {
    if (type === 'arraybuffer') {
      return new ArrayBuffer(1024);
    }
    return '';
  }
} 