# Deploy na VPS KingHost

## Pré-requisitos na VPS

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PostgreSQL
apt-get install -y postgresql postgresql-contrib

# PM2 (gerenciador de processos)
npm install -g pm2

# Caddy já instalado na VPS KingHost
```

---

## 1 — Banco de dados

```bash
# Criar banco e usuário
sudo -u postgres psql <<SQL
CREATE DATABASE dashboard;
CREATE USER dashboard_user WITH PASSWORD 'senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE dashboard TO dashboard_user;
SQL
```

---

## 2 — Clonar e configurar

```bash
cd /root
git clone https://github.com/SEU_USUARIO/painel_gestao_110.git dashboard
cd dashboard

# Instalar dependências do frontend
npm install

# Instalar dependências do servidor
cd server && npm install && cd ..

# Criar arquivo de variáveis do servidor
cp server/.env.example server/.env
nano server/.env
# Preencher: DATABASE_URL, JWT_SECRET (gere com o comando abaixo), ADMIN_PASSWORD
```

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3 — Criar tabelas e popular dados iniciais

```bash
cd /root/dashboard

# Criar tabelas no PostgreSQL
npm run db:push

# Inserir dados iniciais (equipe + fixos da agência)
npm run db:seed
```

---

## 4 — Build do frontend

```bash
cd /root/dashboard

# Criar .env.local com as variáveis do Vite
cat > .env.local <<EOF
VITE_SPREADSHEET_ID=1buoFSc95mpVEXQ00DguKZLDudVnyo3IGVlVsvhLEqvs
VITE_SHEETS_API_KEY=sua_api_key_aqui
EOF

# Buildar para /var/www/dashboard
npm run build
mkdir -p /var/www/dashboard
cp -r dist/* /var/www/dashboard/
```

---

## 5 — Iniciar o servidor Express com PM2

```bash
cd /root/dashboard

# Build do servidor TypeScript
npm run build:server

# Iniciar com PM2
pm2 start server/dist/index.js --name "gestao-api" --env production

# Salvar para reiniciar automaticamente com o servidor
pm2 save
pm2 startup
```

---

## 6 — Configurar Caddy

```bash
# Opção A: arquivo separado (recomendado, não mexe nos outros sites)
mkdir -p /etc/caddy/sites
cp /root/dashboard/Caddyfile /etc/caddy/sites/gestaopainel.conf

# Adicionar ao Caddyfile principal se ainda não tiver:
echo 'import /etc/caddy/sites/*.conf' >> /etc/caddy/Caddyfile

# Testar e recarregar
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

---

## 7 — Atualizar o painel (deploys futuros)

```bash
cd /root/dashboard

git pull origin main

# Atualizar dependências se necessário
npm install
cd server && npm install && cd ..

# Rebuild frontend
npm run build
cp -r dist/* /var/www/dashboard/

# Rebuild e reiniciar servidor (se mudou código do backend)
npm run build:server
pm2 restart gestao-api

# Aplicar migrações de banco (se mudou o schema)
npm run db:push
```

---

## Estrutura de portas

| Serviço      | Porta | Acesso externo                  |
|-------------|-------|---------------------------------|
| Express API  | 3005  | Apenas interno (Caddy faz proxy)|
| Frontend     | —     | /var/www/dashboard (arquivos estáticos) |
| Caddy HTTPS  | 443   | gestaopainel.agencia110.com.br  |

---

## Variáveis de ambiente

### `server/.env` (servidor, nunca commitar)
```
PORT=3005
DATABASE_URL=postgresql://dashboard_user:senha@localhost:5432/dashboard
JWT_SECRET=64_chars_aleatorios_aqui
ADMIN_PASSWORD=senha_painel_aqui
```

### `.env.local` (frontend, nunca commitar)
```
VITE_SPREADSHEET_ID=id_da_planilha
VITE_SHEETS_API_KEY=chave_da_api_google
```
