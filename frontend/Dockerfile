FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

EXPOSE 3000

CMD ["npm", "run", "dev"]
