# PDF Converter Service

A Node.js service that converts PDF files to optimized JPEG images for processing by the DeckFix AI analysis pipeline.

## Features

- Converts PDF pages to JPEG images
- Optimizes images (1400px max dimension, 65% quality)
- Validates file size (15MB max) and page count (20 pages max)
- Returns base64-encoded image data
- Health check endpoint

## Prerequisites

- Node.js >= 18.0.0
- System dependencies for `pdf-poppler`:
  - On Ubuntu/Debian: `sudo apt-get install poppler-utils`
  - On macOS: `brew install poppler`
  - On Windows: Download poppler binaries and add to PATH

## Installation

```bash
cd services/pdf-converter
npm install
```

## Configuration

Create a `.env` file (optional):

```env
PORT=3001
```

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "pdf-converter"
}
```

### POST /convert

Converts a PDF file to JPEG images.

**Request:**
- Content-Type: `multipart/form-data`
- Body: PDF file (field name: `pdf`)
- Max file size: 15MB
- Max pages: 20

**Response:**
```json
{
  "success": true,
  "pageCount": 10,
  "images": [
    {
      "pageNumber": 1,
      "data": "base64-encoded-image-data...",
      "width": 1400,
      "height": 1050,
      "size": 125000
    },
    ...
  ]
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Deployment

### Option 1: Standalone Server

Deploy to any Node.js hosting service (Heroku, Railway, Render, etc.):

1. Set environment variables
2. Install system dependencies (poppler-utils)
3. Run `npm start`

### Option 2: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18

# Install poppler-utils
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3001
CMD ["npm", "start"]
```

### Option 3: Same Server as Edge Functions

If running on the same server as Supabase Edge Functions, ensure:
- Service is accessible via HTTP/HTTPS
- Port is not blocked by firewall
- Environment variable `PDF_CONVERTER_SERVICE_URL` points to the service

## Environment Variables

- `PORT` - Server port (default: 3001)

## Error Handling

The service handles:
- Invalid file types
- File size limits
- Page count limits
- PDF parsing errors
- Image processing errors
- Temporary file cleanup

## Security Considerations

- File size validation
- File type validation
- Temporary files are cleaned up after processing
- No persistent storage of PDFs or images

