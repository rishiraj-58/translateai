# TranslateAI - AI-Powered Document Translation

A modern, beautiful web application for translating PDF and Word documents from 35+ languages (including Malayalam, Hindi, Arabic, Chinese, Japanese, Korean, Russian, and more) to English using Google Gemini AI. Features real PDF and Word document generation with intelligent text processing. Built with Next.js, TypeScript, and Tailwind CSS.

## ✨ Features

- **🌍 Multi-Language Support**: Supports 35+ languages including Malayalam, Hindi, Arabic, Chinese, Japanese, Korean, Russian, and more
- **📄 Multi-format Support**: Upload PDF (.pdf) and Word (.docx, .doc) documents
- **🤖 AI-Powered Translation**: Advanced AI translation with Google Gemini integration
- **📏 Large Document Support**: Intelligent text chunking for documents up to 500-1000 pages
- **⚡ Real-time Progress**: Live progress tracking with detailed status updates
- **📥 Multiple Export Formats**: Download translated documents as PDF, Word, HTML, or plain text
- **🎨 Modern UI**: Beautiful, responsive design with smooth animations
- **🛡️ Error Handling**: Comprehensive error handling with retry mechanisms
- **📱 Mobile Friendly**: Fully responsive design that works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd translateai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Document Generation

TranslateAI provides **real document generation** capabilities:

**PDF Generation:**
- Uses jsPDF library for native PDF creation
- Professional formatting with proper typography
- Automatic page breaks and margins
- Metadata embedding (title, author, creation date)
- Multi-page document support

**Word Document Generation:**
- Uses docx library for native .docx file creation
- Professional document formatting
- Proper paragraph spacing and styling
- Metadata and properties support
- Microsoft Word compatible

**Additional Formats:**
- HTML export for web viewing
- Plain text export for simple use cases
- Automatic filename generation with timestamps

### AI Service Integration

The application currently uses **Google's Gemini 2.5 Flash model** for translation, which provides excellent translation quality for documents.

**Current Configuration (Gemini 2.5 Flash):**
```typescript
const translationService = createTranslationService(process.env.GEMINI_API_KEY!, {
  maxRetries: 3,
  chunkDelay: 1000
});
```

#### Alternative AI Service Integration

The application architecture supports other AI services. To switch to a different provider:

1. **Open `/src/utils/translationService.ts`**
2. **Update the `callTranslationAPI` method** with your preferred AI service
3. **Configure the service parameters** in the main page component

**OpenAI GPT Integration:**
```typescript
// Add to translationService.ts
private async callOpenAI(text: string): Promise<{
  translatedText: string;
  sourceLanguage: string;
  confidence?: number;
}> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the following text to English. Only return the translated text, nothing else.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });

  const data = await response.json();
  return {
    translatedText: data.choices[0]?.message?.content?.trim(),
    sourceLanguage: 'auto',
    confidence: 0.9
  };
}
```

**Google Translate API Integration:**
```typescript
// Add to translationService.ts
private async callGoogleTranslate(text: string): Promise<{
  translatedText: string;
  sourceLanguage: string;
  confidence?: number;
}> {
  const response = await fetch(`${this.config.apiUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    },
    body: JSON.stringify({
      q: text,
      target: 'en',
      format: 'text'
    })
  });

  const data = await response.json();
  return {
    translatedText: data.translatedText || data.data?.translations?.[0]?.translatedText,
    sourceLanguage: data.detectedSourceLanguage || 'auto',
    confidence: 0.95
  };
}
```

### Supported Languages

TranslateAI supports **35+ languages** including:

**European Languages:**
- English, Spanish, French, German, Portuguese, Italian, Dutch
- Swedish, Danish, Norwegian, Finnish, Polish, Czech, Turkish, Greek

**Asian Languages:**
- Hindi, Malayalam, Tamil, Telugu, Kannada, Bengali, Gujarati, Punjabi, Odia
- Chinese, Japanese, Korean, Thai, Vietnamese, Sinhala

**Middle Eastern Languages:**
- Arabic, Persian (Farsi), Urdu

**Other Languages:**
- Russian, Marathi

**Language Detection:**
The system automatically detects the source language using Unicode character analysis and word pattern recognition, ensuring accurate translation for documents in any supported language.

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Application Settings
NEXT_PUBLIC_APP_NAME=TranslateAI
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB in bytes
```

### Gemini API Setup

This application uses Google's Gemini 2.5 Flash model for translation. To get your API key:

1. **Visit Google AI Studio**: [https://ai.google.dev/gemini-api/docs/quickstart](https://ai.google.dev/gemini-api/docs/quickstart)
2. **Create an API Key**: Follow the instructions to generate a free API key
3. **Add to Environment**: Add your API key to the `.env.local` file as shown above

The application will automatically use Gemini 2.5 Flash for all translations with optimized settings for document translation.

## 📁 Project Structure

```
translateai/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with error boundary
│   │   ├── page.tsx            # Main application page
│   │   └── globals.css         # Global styles and animations
│   ├── components/
│   │   ├── ErrorBoundary.tsx   # Error boundary component
│   │   ├── FileUpload.tsx      # File upload component
│   │   ├── TranslationProgress.tsx  # Progress tracking component
│   │   └── DownloadSection.tsx # Download options component
│   └── utils/
│       ├── textExtraction.ts   # PDF/Word text extraction utilities
│       ├── translationService.ts   # AI translation service
│       └── documentReconstruction.ts   # Document creation utilities
├── public/                     # Static assets
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## 🛠️ Technical Details

### Text Extraction
- **PDF Files**: Uses `pdf-parse` library for text extraction
- **Word Files**: Uses `mammoth` library for .docx parsing
- **Intelligent Chunking**: Automatically splits large documents into manageable chunks
- **Language Detection**: Basic language detection for source language identification

### Translation Process
1. **Text Extraction**: Extract text content from uploaded documents
2. **Intelligent Chunking**: Split text into optimal chunks for AI processing
3. **Parallel Translation**: Translate chunks concurrently with progress tracking
4. **Document Reconstruction**: Combine translated chunks into final document
5. **Format Conversion**: Generate multiple output formats (PDF, Word, HTML, Text)

### Error Handling
- **Comprehensive Error Boundaries**: Catch and handle React errors gracefully
- **Retry Mechanisms**: Automatic retry for failed translation attempts
- **User-Friendly Messages**: Clear error messages with actionable suggestions
- **Fallback Options**: Graceful degradation when features aren't available

## 🎨 Design Features

- **Modern UI**: Clean, professional design with subtle animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Accessibility**: Proper ARIA labels, keyboard navigation, and focus management
- **Loading States**: Smooth loading animations and progress indicators
- **Interactive Elements**: Hover effects, micro-interactions, and visual feedback

## 🔒 Security Considerations

- **File Validation**: Strict file type and size validation
- **Client-Side Processing**: Sensitive document processing happens client-side
- **API Key Security**: Never expose API keys in client-side code
- **Input Sanitization**: All user inputs are properly sanitized
- **Error Handling**: Sensitive error information is not exposed to users

## 📊 Performance Optimizations

- **Lazy Loading**: Dynamic imports for heavy utilities
- **Chunk Processing**: Intelligent text chunking for large documents
- **Memory Management**: Efficient memory usage for large file processing
- **Progressive Loading**: Real-time progress updates during processing
- **Caching**: Smart caching of translation results

## 🚀 Deployment

### Vercel (Recommended)
1. **Connect your repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy automatically** on every push

### Other Platforms
The application can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- Render
- Self-hosted with Docker

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. **Check the FAQ** in this README
2. **Open an issue** on GitHub
3. **Contact the maintainers**

## 🙏 Acknowledgments

- **Next.js** - The React framework for production
- **Tailwind CSS** - A utility-first CSS framework
- **Lucide React** - Beautiful & consistent icon toolkit
- **pdf-parse** - PDF text extraction library
- **mammoth** - Word document processing library

---

**Made with ❤️ for seamless document translation**