FROM node:20-alpine

WORKDIR /usr/src/app

# Copia os arquivos do package.json e package-lock.json
COPY package*.json ./

# Instala apenas as dependências de produção
RUN npm install --only=production

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta 8080 definida no Express
EXPOSE 8080

# Inicia o servidor backend
CMD [ "npm", "start" ]
