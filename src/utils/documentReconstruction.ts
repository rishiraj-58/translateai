import { TranslationResult } from './translationService';

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
}

/**
 * Reconstruct document from translated chunks
 */
export class DocumentReconstructor {
  private translatedResults: TranslationResult[];
  private metadata: DocumentMetadata;

  constructor(translatedResults: TranslationResult[], metadata: DocumentMetadata = {}) {
    this.translatedResults = translatedResults;
    this.metadata = metadata;
  }

  /**
   * Generate combined text content
   */
  getCombinedText(): string {
    return this.translatedResults
      .map(result => result.translatedText)
      .join('\n\n');
  }

  /**
   * Generate HTML content for document creation
   */
  getHTMLContent(): string {
    const title = this.metadata.title || 'Translated Document';
    const content = this.getCombinedText()
      .split('\n\n')
      .map(paragraph => `<p>${this.escapeHtml(paragraph)}</p>`)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(title)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 40px;
            color: #333;
          }
          h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
          }
          p {
            margin-bottom: 16px;
          }
          .metadata {
            background-color: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="metadata">
          <strong>Original Language:</strong> ${this.getDetectedLanguage()}<br>
          <strong>Translation Date:</strong> ${new Date().toLocaleString()}<br>
          ${this.metadata.author ? `<strong>Author:</strong> ${this.escapeHtml(this.metadata.author)}<br>` : ''}
          ${this.metadata.subject ? `<strong>Subject:</strong> ${this.escapeHtml(this.metadata.subject)}` : ''}
        </div>

        <h1>${this.escapeHtml(title)}</h1>

        ${content}
      </body>
      </html>
    `.trim();
  }

  /**
   * Create downloadable text file
   */
  async createTextFile(): Promise<Blob> {
    const content = this.getCombinedText();
    return new Blob([content], { type: 'text/plain;charset=utf-8' });
  }

  /**
   * Create downloadable HTML file
   */
  async createHTMLFile(): Promise<Blob> {
    const content = this.getHTMLContent();
    return new Blob([content], { type: 'text/html;charset=utf-8' });
  }

  /**
   * Create Word document (DOCX) using docx library
   */
  async createWordDocument(): Promise<Blob> {
    try {
      // Dynamic import to avoid SSR issues
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

      const title = this.metadata.title || 'Translated Document';
      const content = this.getCombinedText();

      // Create document sections
      const sections = [];

      // Title
      sections.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 300 }
        })
      );

      // Metadata
      const metadataText = `Original Language: ${this.getDetectedLanguage()}\nTranslation Date: ${new Date().toLocaleString()}`;
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadataText,
              italics: true,
              size: 20
            })
          ],
          spacing: { after: 300 }
        })
      );

      // Content paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      for (const paragraph of paragraphs) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                size: 24
              })
            ],
            spacing: { after: 200 }
          })
        );
      }

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: sections
        }]
      });

      // Generate and return blob
      const buffer = await Packer.toBuffer(doc);
      return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

    } catch (error) {
      console.error('DOCX creation failed:', error);
      // Fallback to HTML-based DOCX
      const htmlContent = this.getHTMLContent();
      const wordTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>Translated Document</title>
          <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
          <style>
            body { font-family: Arial, sans-serif; margin: 1in; }
            p { margin: 0 0 12pt 0; line-height: 1.2; }
          </style>
        </head>
        <body>
          ${htmlContent.replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>/gi, '')}
        </body>
        </html>
      `;

      return new Blob([wordTemplate], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    }
  }

  /**
   * Create PDF document using jsPDF
   */
  async createPDFDocument(): Promise<Blob> {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;

      const title = this.metadata.title || 'Translated Document';
      const content = this.getCombinedText();

      // Create PDF document
      const doc = new jsPDF();

      // Set up document properties
      doc.setProperties({
        title: title,
        subject: this.metadata.subject || 'Translated Document',
        author: this.metadata.creator || 'TranslateAI',
        creator: this.metadata.creator || 'TranslateAI'
      });

      // Add title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(title, 180);
      doc.text(titleLines, 15, 25);

      // Add metadata
      let yPosition = 35 + (titleLines.length * 7);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const metadataText = `Original Language: ${this.getDetectedLanguage()}\nTranslation Date: ${new Date().toLocaleString()}`;
      const metadataLines = doc.splitTextToSize(metadataText, 180);
      doc.text(metadataLines, 15, yPosition);

      // Add content
      yPosition += (metadataLines.length * 5) + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const paragraphs = content.split('\n\n').filter(p => p.trim());
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const lineHeight = 7;

      for (const paragraph of paragraphs) {
        const lines = doc.splitTextToSize(paragraph.trim(), 180);

        for (const line of lines) {
          if (yPosition + lineHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        }

        // Add some space between paragraphs
        yPosition += lineHeight * 0.5;
      }

      // Return as blob
      const pdfOutput = doc.output('blob');
      return pdfOutput;

    } catch (error) {
      console.error('PDF creation failed:', error);
      // Fallback to HTML-based PDF
      const htmlContent = this.getHTMLContent();
      return new Blob([htmlContent], { type: 'application/pdf' });
    }
  }

  /**
   * Get detected source language from translations
   */
  private getDetectedLanguage(): string {
    const languages = this.translatedResults
      .map(result => result.sourceLanguage)
      .filter(lang => lang && lang !== 'auto');

    // Return most common language or 'Unknown'
    const languageCounts = languages.reduce((acc, lang) => {
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(languageCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostCommon ? mostCommon[0] : 'Unknown';
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Create document reconstructor instance
 */
export function createDocumentReconstructor(
  translatedResults: TranslationResult[],
  metadata?: DocumentMetadata
): DocumentReconstructor {
  return new DocumentReconstructor(translatedResults, metadata);
}

/**
 * Download helper function
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(originalName: string, extension: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${baseName}_translated_${timestamp}.${extension}`;
}

