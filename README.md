# Status — Monitor de Sites

Painel **privado** para monitorar domínios e subdomínios: se estão no ar,
histórico de disponibilidade/latência, SSL, presença das tags do Google
(Analytics e Search Console) e incidentes críticos. Login único de admin.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS** (tema rosa)
- **Prisma** + **SQLite** (arquivo único, histórico persistente)
- **Argon2id** para senha, sessão em cookie httpOnly
- Worker de monitoramento (fase 3)

## Rodando localmente

```bash
npm install
npm run db:push      # cria/atualiza o banco SQLite
npm run seed         # cria o admin único (usa ADMIN_EMAIL/ADMIN_PASSWORD do .env)
npm run dev          # http://localhost:3000
```

## Variáveis de ambiente (`.env`)

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Caminho do banco SQLite |
| `SESSION_SECRET` | Segredo das sessões (gere um novo em produção) |
| `ADMIN_EMAIL` | Email do admin (usado só no seed) |
| `ADMIN_PASSWORD` | Senha inicial (usada só no seed; troque depois) |

Gerar um novo segredo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Segurança

- **Sem rota de cadastro** — o admin é criado só pelo `npm run seed`; um segundo
  admin nunca é criado (login único).
- Senha com **Argon2id**; nunca guardada em texto.
- Sessão em cookie **httpOnly + Secure + SameSite=Strict**.
- **Rate-limit** no login (5 falhas / 15 min por IP).
- Headers de segurança (X-Frame-Options, nosniff, Referrer-Policy).
- Página marcada como `noindex` (não aparece no Google).

## Monitoramento (worker)

O worker checa todos os sites ativos no intervalo de `CHECK_INTERVAL_MINUTES`:
disponibilidade, status HTTP, latência, validade do SSL e presença das tags
GA4/Search Console. Abre/fecha incidentes e (se configurado) avisa no Telegram.

```bash
npm run worker
```

No VPS, rode o worker como serviço (PM2 ou systemd) junto do `npm start`.

## Progresso

- [x] **Fase 0** — Fundação (Next.js, Tailwind, Prisma/SQLite, seed)
- [x] **Fase 1** — Login seguro do admin único
- [x] **Fase 2** — Cadastro de sites (CRUD + checar agora + pausar)
- [x] **Fase 3** — Worker de monitoramento (online, latência, SSL, tags Google, incidentes)
- [x] **Fase 4** — Dashboard e detalhe com gráfico de histórico
- [x] **Alertas** — Telegram opcional (via `.env`)
- [ ] **Fase 5** — Deploy no VPS (Nginx + HTTPS) — próximo passo
- [ ] **Extra** — 2FA no login (opcional)
