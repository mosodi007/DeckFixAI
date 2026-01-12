FROM node:18

# Install poppler-utils (provides pdftoppm and pdfinfo commands)
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]

