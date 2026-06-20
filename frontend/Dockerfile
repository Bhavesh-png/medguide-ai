FROM node:18-alpine

WORKDIR /app

# Copy package.json and install
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose Vite dev port
EXPOSE 5173

# Start Vite dev server accessible from outside container
CMD ["npm", "run", "dev", "--", "--host"]
