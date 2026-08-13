# Deploy do Status numa VPS (Ubuntu)

Guia completo, do zero até o painel no ar com HTTPS. Tempo estimado: ~30–40 min.

Onde aparecer `status.seudominio.com`, troque pelo seu subdomínio.
Onde aparecer `SEU_IP`, troque pelo IP da sua VPS.

---

## 0. Recomendação de VPS

Qualquer uma barata resolve — o projeto é leve.

| Provedor | Plano sugerido | Preço aprox. |
|---|---|---|
| **Hetzner** (melhor custo) | CX22 (2 vCPU, 4 GB) | ~€4/mês |
| **DigitalOcean** | Basic (1 vCPU, 1 GB) | ~US$6/mês |
| **Contabo** | VPS S | ~€5/mês |

Escolha **Ubuntu 24.04 LTS** na criação. Até o menor plano (1 GB RAM) dá conta.

---

## 1. Aponte o domínio para a VPS

No painel DNS do seu domínio, crie um registro:

```
Tipo: A
Nome: status         (vira status.seudominio.com)
Valor: SEU_IP
TTL: automático
```

A propagação leva de minutos a algumas horas.

---

## 2. Primeiro acesso e segurança básica

Conecte via SSH (como root, com os dados que o provedor enviou):

```bash
ssh root@SEU_IP
```

Atualize o sistema e crie um usuário próprio para a aplicação:

```bash
apt update && apt upgrade -y
adduser status
usermod -aG sudo status
```

Firewall — libere só SSH e web:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## 3. Instale as ferramentas

Ainda como root:

```bash
# Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx sqlite3

# Certbot para HTTPS grátis
apt install -y certbot python3-certbot-nginx
```

Confirme: `node -v` deve mostrar v22.x.

---

## 4. Envie o código para a VPS

### Opção A — GitHub (recomendado, facilita atualizações)

No seu PC, dentro da pasta do projeto, crie um repositório **privado** e envie:

```bash
git init
git add .
git commit -m "Status - versao inicial"
# crie um repo privado em github.com e cole a URL abaixo:
git remote add origin https://github.com/SEU_USUARIO/status.git
git branch -M main
git push -u origin main
```

> O `.gitignore` já exclui `.env`, o banco e `node_modules` — seus segredos e dados **não** vão para o GitHub.

Na VPS, vire o usuário `status` e clone:

```bash
su - status
sudo mkdir -p /opt/status && sudo chown status:status /opt/status
git clone https://github.com/SEU_USUARIO/status.git /opt/status
cd /opt/status
```

### Opção B — Sem GitHub (envio direto)

No seu PC (Git Bash), envie a pasta ignorando o que não é necessário:

```bash
rsync -av --exclude node_modules --exclude .next --exclude .env \
  --exclude 'prisma/dev.db' ./ status@SEU_IP:/opt/status/
```

---

## 5. Configure o `.env` de produção

Na VPS, dentro de `/opt/status`:

```bash
# Gere um segredo de sessão NOVO e forte:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Crie o arquivo `.env` (use `nano .env`) com:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="COLE_AQUI_O_SEGREDO_GERADO_ACIMA"

ADMIN_EMAIL="promovasenet@gmail.com"
ADMIN_PASSWORD="UMA_SENHA_FORTE_SO_SUA"

CHECK_INTERVAL_MINUTES="5"

# Alertas Telegram (opcional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
```

---

## 6. Instale, prepare o banco e faça o build

```bash
cd /opt/status
npm ci
npx prisma generate
npx prisma db push      # cria o banco e as tabelas
npm run seed            # cria o admin único (usa ADMIN_EMAIL/ADMIN_PASSWORD)
npm run build
```

Teste rápido (Ctrl+C para parar): `npm start` — deve subir na porta 3000.

---

## 7. Rode como serviço (liga sozinho e reinicia se cair)

Copie os arquivos de serviço já prontos na pasta `deploy/`:

```bash
sudo cp /opt/status/deploy/status-app.service /etc/systemd/system/
sudo cp /opt/status/deploy/status-worker.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now status-app
sudo systemctl enable --now status-worker
```

Verifique:

```bash
systemctl status status-app --no-pager
systemctl status status-worker --no-pager
```

Logs ao vivo (útil para o worker): `journalctl -u status-worker -f`

---

## 8. Nginx + HTTPS

```bash
sudo cp /opt/status/deploy/nginx.conf /etc/nginx/sites-available/status
# edite e troque status.seudominio.com pelo seu subdominio:
sudo nano /etc/nginx/sites-available/status

sudo ln -s /etc/nginx/sites-available/status /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Emita o certificado HTTPS (grátis, renova sozinho):

```bash
sudo certbot --nginx -d status.seudominio.com
```

Escolha redirecionar HTTP → HTTPS quando perguntar.

---

## 9. Pronto! Acesse

Abra **https://status.seudominio.com**, faça login e cadastre seus sites. 🌸

---

## 10. Backups automáticos do banco

```bash
chmod +x /opt/status/deploy/backup.sh
crontab -e
# adicione a linha (backup todo dia às 3h):
0 3 * * * /opt/status/deploy/backup.sh
```

Os backups ficam em `/opt/status/backups/` (mantém os últimos 14 dias).

---

## 11. Atualizar o sistema depois (quando eu mexer no código)

Se usou GitHub:

```bash
cd /opt/status
git pull
npm ci
npx prisma db push        # só se o banco mudou
npm run build
sudo systemctl restart status-app status-worker
```

---

## Alternativa: acesso só por IP (sem domínio, temporário)

Só se você **não** for usar domínio agora. Menos seguro (sem cadeado).

1. No `.env`, adicione: `COOKIE_SECURE="false"`
2. Pule os passos 1, 8 e 9 (DNS, Nginx e certbot).
3. Libere a porta: `sudo ufw allow 3000`
4. Acesse `http://SEU_IP:3000`

Recomendo migrar para domínio + HTTPS assim que possível.
