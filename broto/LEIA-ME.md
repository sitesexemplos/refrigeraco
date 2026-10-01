# Brotô — microsaas de jardinagem

Base construída em 01/10/2026. Nome provisório: Brotô. Assinatura R$ 47,00/mês. Interface estática para Hostinger + Supabase Auth/Postgres/Edge Functions + Stripe Checkout/Portal + análise visual pela API OpenAI.

## O que está pronto

- Landing page verde/azul esverdeado, responsiva, com preço, benefícios, exemplo e perguntas frequentes.
- Cadastro por e-mail, confirmação, login, recuperação e troca de senha.
- Stripe Checkout de assinatura, portal para gestão/cancelamento e webhook assinado.
- Acesso à análise condicionado a assinatura válida no servidor; o endereço de retorno não libera acesso.
- Galeria, seleção de arquivo, arrastar foto e câmera do celular via capture.
- Redução para até 1600 px e conversão JPEG no navegador; fotos originais não são armazenadas pelo app.
- Orientações estruturadas: identificação provável, confiança, sinais, cuidados, causas possíveis, próximos passos e manejo/tratamento.
- Histórico persistente e exclusão individual com RLS por usuário.
- Franquia de 30 análises por mês de calendário UTC, reservada atomicamente no servidor; falhas normais estornam a reserva. Esse limite é uma decisão inicial para controlar custos e aparece na oferta. Para mudar, ajuste SQL e textos juntos.
- Pixel Meta 2366139740865827 com consentimento: PageView, CompleteRegistration e InitiateCheckout. Não envia fotos ou diagnósticos.
- Criativos Instagram: feed 4:5 e Stories 9:16, gerados com Imagegen.

## O que ainda depende de você

Não há contas conectadas, cobrança real, publicação na Hostinger nem análise real ativada nesta entrega. É preciso configurar Supabase, Stripe e a API de IA, publicar as funções e completar os dados do operador nos termos/privacidade. A prévia não simula pagamento aprovado nem oferece diagnóstico falso: contém apenas um exemplo identificado como ilustrativo.

A assinatura do ChatGPT não substitui a cobrança da API de IA. Hospedagem, domínio, Supabase, IA e taxas Stripe são custos operacionais separados do preço de R$ 47 cobrado ao cliente.

## Estrutura

- `site/`: SOMENTE estes arquivos vão para public_html da Hostinger.
- `supabase/migrations/202610010001_base.sql`: banco, políticas RLS e funções de franquia/webhook.
- `supabase/functions/`: código servidor; não enviar à Hostinger.
- `supabase/config.toml`: configuração de publicação das funções.
- `supabase/.env.example`: nomes das configurações secretas, sem valores reais.
- `criativos/`: imagens finais e orientação de uso.
- `GUIA-INSTALACAO.md`: passo a passo completo.
- `VALIDACAO.md`: verificações realizadas e pendentes.

## Abrir localmente

Com Python instalado, no terminal dentro da pasta broto:

```bash
python -m http.server 8080 --directory site
```

Acesse http://localhost:8080. Abrir index.html com duplo clique não é o fluxo suportado, pois o aplicativo usa módulos JavaScript. Nenhum npm/build é necessário para a interface. Antes da configuração é possível ver a landing e o exemplo. Cadastro e análise só funcionam depois de conectar os serviços.

## Segurança e decisões

Chaves secretas ficam exclusivamente no Supabase. O frontend só contém URL pública e chave publishable/anon, que é pública por definição e depende das políticas RLS para proteção. Todas as funções de usuário verificam o token pelo Supabase Auth; o webhook verifica a assinatura da Stripe. Escritas em assinaturas e criação de análises são proibidas para o navegador.

Não há fallback que transforma erro de IA em diagnóstico. O servidor valida o formato da resposta, limita imagem e texto e instrui a IA a tratar o conteúdo da imagem como dados. Mesmo assim, modelos podem errar; as orientações não confirmam doenças, toxicidade ou comestibilidade. Não há prescrição de doses, misturas caseiras ou garantia de cura.

Fotos não são gravadas no banco; a API de IA recebe a imagem para processar. `store:false` desativa armazenamento da resposta pela Responses API, mas não representa garantia de retenção zero dos registros do provedor. Revise o contrato e as configurações de retenção antes do lançamento.

A fonte visual vem do Google Fonts (com fallback local); o SDK Supabase é carregado do esm.sh com versão fixada. Esses serviços recebem dados técnicos de conexão. Caso deseje eliminar CDNs depois, hospede fontes e empacote o SDK localmente.

Webhooks são deduplicados e atualizam a assinatura numa transação, com proteção contra eventos mais antigos. O código também busca o estado atual na Stripe. Operação comercial deve monitorar falhas de webhook e realizar reconciliação de assinaturas, especialmente em interrupções prolongadas. Uma interrupção abrupta da função de IA pode deixar uma reserva de franquia pendente; corrija administrativamente após verificar os logs.
