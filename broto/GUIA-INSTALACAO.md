# Como colocar o Brotô no ar

O site é estático na Hostinger. A parte segura funciona no Supabase: validar usuário/assinatura, chamar IA e conversar com a Stripe. Um HTML sozinho não pode guardar chaves secretas nem confirmar pagamentos com segurança.

## 1. Separe as contas

Crie ou acesse:

- Supabase: https://supabase.com/dashboard
- Stripe: https://dashboard.stripe.com
- OpenAI API: https://platform.openai.com/api-keys
- Hostinger: seu hPanel.

Comece com o modo de teste da Stripe. Não envie chaves secretas por conversa. Você poderá informar que já as configurou, junto com a URL pública do Supabase, domínio e ID público do preço, se precisar de ajuda.

## 2. Prepare o domínio e a Hostinger

1. No hPanel, crie/adicione o site no plano de hospedagem que permite arquivos próprios. Escolha um site vazio/HTML; não o Criador de Sites proprietário.
2. Associe seu domínio e siga os registros DNS informados no próprio painel. Não copie IP de outro site.
3. Ative/verifique o HTTPS. Escolha o endereço canônico (por exemplo `https://broto.com.br`, apenas ilustrativo) e use exatamente o mesmo endereço nos próximos passos. Se usar www, mantenha www em todas as configurações.
4. Você pode publicar a landing sem serviços conectados para revisar o visual; ela ficará em prévia no cadastro. Não anuncie a assinatura antes de concluir os testes.

## 3. Crie o Supabase e o banco

1. No Supabase Dashboard, crie um novo projeto. Guarde a senha do banco em local seguro.
2. Abra SQL Editor, crie uma consulta e cole TODO o arquivo `supabase/migrations/202610010001_base.sql`. Execute uma única vez num projeto novo.
3. Em Project Settings/API ou no diálogo Connect, obtenha a Project URL e a chave pública publishable. Também é suportada a chave legada `anon`. Nunca use `service_role` ou secret key no navegador.
4. Abra `site/config.js` em um editor de texto e preencha:

```js
window.BROTO_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_PUBLICA_PUBLISHABLE_OU_ANON',
  pixelId: '2366139740865827'
};
```

5. Em Authentication > URL Configuration, defina Site URL para seu domínio HTTPS. Cadastre os Redirect URLs do próprio domínio, incluindo `https://SEU-DOMINIO/**` para as rotas com fragmentos. Não use um curinga aberto para qualquer domínio.
6. Ative e-mail/senha, mantenha confirmação de e-mail e configure um provedor SMTP para entrega de e-mails de produção. O serviço padrão pode ter restrições de destinatários e limites.
7. Configure política de senha e limites de autenticação. Antes de campanhas, habilite proteção antiautomação compatível com seu projeto; se ativar CAPTCHA, integre o token no formulário antes de exigir a proteção no painel.

Não é necessário criar bucket Storage: esta versão envia a imagem diretamente para a análise e armazena apenas o resultado.

## 4. Configure o produto na Stripe

1. No ambiente de teste/sandbox, abra o catálogo de produtos e crie **Brotô — Plano mensal**.
2. Adicione um preço **recorrente**, **mensal**, em **BRL**, de **R$ 47,00**. Guarde seu ID `price_...`.
3. Em Developers/Workbench > API keys, obtenha a secret key do ambiente de teste (`sk_test_...`). A interface não precisa da publishable key da Stripe, porque redireciona para o Checkout hospedado.
4. Em Billing > Customer portal, ative o portal. Habilite gestão de forma de pagamento, faturas e cancelamento ao final do período. Salve.
5. Ative a configuração Stripe que limita clientes a uma assinatura quando disponível. O código também reaproveita sessões abertas e verifica assinaturas existentes.
6. Configure a identidade da empresa, nome no extrato, contato, políticas e recibos na Stripe antes de cobrar clientes reais.

## 5. Prepare a API de análise

1. Na plataforma OpenAI, configure faturamento da API e crie uma chave em um projeto dedicado.
2. Estabeleça orçamento e alertas de uso no provedor.
3. Guarde como `OPENAI_API_KEY` nos Secrets do Supabase. O modelo inicial configurado é `gpt-4.1-mini`; se necessário, altere `OPENAI_MODEL` para um modelo disponível na sua conta que aceite imagens, Responses API e Structured Outputs.
4. Não coloque esta chave no JavaScript público. A conta do cliente nunca precisa conhecer a chave.

## 6. Publique as Edge Functions

Uma forma prática é usar a Supabase CLI no seu computador, com Node.js compatível instalado. Abra o terminal na pasta `broto` extraída do ZIP. Consulte a instalação oficial caso `npx` não esteja disponível.

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
```

`SEU_PROJECT_REF` é a referência do projeto mostrada pelo Supabase, não a senha. O comando pode solicitar a senha do banco. Não execute `supabase init` nesta pasta: a configuração já existe.

No Dashboard > Edge Functions > Secrets, cadastre:

| Nome | Valor |
|---|---|
| SITE_URL | Seu domínio HTTPS sem barra final |
| STRIPE_SECRET_KEY | Chave secreta Stripe de teste |
| STRIPE_PRICE_ID | ID do preço mensal de R$ 47 |
| OPENAI_API_KEY | Chave secreta da API de IA |
| OPENAI_MODEL | gpt-4.1-mini, ou modelo compatível escolhido |

As chaves internas do Supabase são injetadas nas funções. Não tente criar segredos com prefixo reservado `SUPABASE_`. O código aceita service-role legado ou as secret keys injetadas no novo formato.

Publique:

```bash
npx supabase functions deploy checkout
npx supabase functions deploy portal
npx supabase functions deploy analyze
npx supabase functions deploy stripe-webhook
```

O arquivo config.toml desativa a validação do gateway porque cada função de usuário valida explicitamente seu JWT via Auth. Isso é necessário para compatibilidade com as novas chaves públicas e para a Stripe chamar o webhook. **Não remova a autenticação existente nos arquivos TypeScript.**

## 7. Ligue o webhook da Stripe

No Workbench/Developers > Webhooks (ou Event destinations), adicione o endpoint:

```text
https://SEU-PROJECT-REF.supabase.co/functions/v1/stripe-webhook
```

Selecione estes eventos:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Copie o signing secret desse endpoint (`whsec_...`) e adicione nos Secrets do Supabase como `STRIPE_WEBHOOK_SECRET`. Ele não é a API secret key. Use o segredo do endpoint certo e do mesmo ambiente. O código usa Stripe SDK 18.5.0 e recupera o estado atual da assinatura; usa formato Basil para os itens e tolera o período no formato anterior.

Não libere acesso baseado no endereço `#pagamento`. A liberação só ocorre quando o webhook validado atualiza o banco.

## 8. Envie o site estático para a Hostinger

1. Abra Sites > Gerenciar > Gerenciador de Arquivos.
2. Entre em `public_html` do domínio certo. Se já houver outro site, faça backup antes de substituir os arquivos.
3. Envie **o conteúdo de `broto/site/`**, e não a pasta inteira como um nível extra. Pode compactar somente esse conteúdo e extrair pelo painel.
4. Confira a estrutura:

```text
public_html/
  index.html
  styles.css
  app.js
  config.js
  .htaccess
  assets/
    hero.png
```

5. Não envie `supabase/`, `.env`, arquivos com segredos ou o ZIP completo do projeto para uma pasta pública. Não é necessário Node.js, PHP ou MySQL na Hostinger para este frontend.
6. Abra seu domínio em HTTPS. Se aparecer uma página antiga, confira se o domínio aponta para a hospedagem correta e limpe o cache.
7. As rotas usam `#`, por exemplo `/#jardim`, então não precisam de regra de reescrita SPA.

## 9. Complete as informações do negócio

Os termos e a privacidade estão como base inicial, dentro de `legal()` em `site/app.js`. Antes da venda, preencha identificação do operador, e-mail/canal de suporte, procedimentos de solicitação/exclusão de dados e política comercial adequada ao seu negócio. Inclua Google Fonts e esm.sh entre fornecedores técnicos ou hospede essas dependências localmente. Valide os textos para a operação real. Depois retire o aviso de versão-base.

## 10. Teste ponta a ponta no ambiente de teste

- Criar conta, receber confirmação, entrar, sair e recuperar senha.
- Cliente sem pagamento não pode analisar, nem chamando a API diretamente.
- Assinar com cartão de teste Stripe `4242 4242 4242 4242`, validade futura e CVC de teste; nunca use cartão de teste no modo real.
- Confirmar webhook 200 na Stripe e assinatura `active` no Supabase.
- Atualizar status na tela de retorno quando necessário.
- Enviar uma foto real pelo computador e outra pela câmera de um celular físico. A câmera depende do navegador; o seletor de arquivos é o fallback.
- Verificar histórico, abrir resultado e excluir; usuário A não deve consultar dados de B.
- Enviar arquivo inválido/grande e observar erro útil. HEIC deve ser convertido para JPG.
- Testar falha de IA, franquia, assinatura cancelada, vencida e pagamento falho.
- Cancelar no portal, confirmar o webhook e conferir acesso até o fim do período quando agendado.
- Reenviar o mesmo evento Stripe; não deve duplicar liberação nem criar assinatura adicional.
- Recusar cookies: nenhum fbevents.js deve carregar. Aceitar: PageView deve chegar ao teste de eventos Meta.

O modelo pode responder que a foto é inconclusiva; isso é uma análise válida. Compare respostas com fotos representativas antes de liberar a campanha.

## 11. Coloque a cobrança real em funcionamento

Após os testes, ative a conta Stripe para pagamentos reais. Crie o produto/preço no ambiente real, use `sk_live_...`, crie o webhook real e troque `STRIPE_PRICE_ID` e `STRIPE_WEBHOOK_SECRET` nos Secrets. Configure o portal também no ambiente real.

**Recomendado:** use projetos Supabase separados para teste e produção. IDs de clientes Stripe de teste não podem ser usados no ambiente real; não apenas troque as chaves num banco cheio de dados de teste. Para começar produção no mesmo projeto, faça uma migração administrada dos registros de teste antes, sem apagar dados reais.

Revise custos, mensagens, atendimento e os testes novamente. Monitore erros de webhook, logs de funções e consumo de IA. Não ative anúncios enquanto o checkout e a análise real não passarem no teste.

## 12. Pixel e anúncios

O ID enviado já está instalado: **2366139740865827**. O trecho original foi corrigido para JavaScript válido e encapsulado em consentimento. O beacon noscript não foi colocado porque ele enviaria PageView mesmo sem a escolha de marketing. Não há evento Purchase baseado apenas no retorno do checkout, para evitar conversões falsas.

No Gerenciador de Eventos da Meta, use Testar eventos/Meta Pixel Helper para verificar PageView, CompleteRegistration e InitiateCheckout. Uma etapa futura de Conversions API pode registrar compras confirmadas pelo servidor, com deduplicação e consentimento adequado; ela não está implementada nesta base.

Envie os arquivos de `criativos/` para os respectivos posicionamentos. A campanha não foi criada nem publicada nesta entrega.

## Referências oficiais consultadas

- Hostinger, envio para public_html: https://www.hostinger.com/pt/tutoriais/como-fazer-o-upload-do-seu-website/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Auth redirects: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase CLI: https://supabase.com/docs/guides/local-development/cli/getting-started
- Stripe keys: https://docs.stripe.com/keys
- Stripe webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe portal: https://docs.stripe.com/customer-management
- OpenAI visão: https://developers.openai.com/api/docs/guides/images-vision

Os rótulos dos painéis podem mudar. O conceito é o mesmo: frontend público na Hostinger, credenciais privadas nas funções do Supabase.
