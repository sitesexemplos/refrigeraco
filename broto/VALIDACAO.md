# Validação desta entrega

## Executado e aprovado

- Sintaxe do JavaScript do frontend com Node.
- Transpilação sintática dos cinco módulos TypeScript do servidor com Node 24 (não equivale a `deno check`).
- Nove testes automatizados com serviços simulados: autenticação obrigatória, imagem inválida, bloqueio de franquia, estorno em falha de IA, persistência de resposta estruturada, portal para assinatura existente, rejeição de preço incorreto, webhook sem assinatura e webhook com assinatura inválida.
- Testes de DOM: landing/preço, carregamento do Pixel condicionado ao consentimento, cadastro bloqueado enquanto não configurado, exemplo identificado, redirecionamento de visitante sem login e política de privacidade.
- Chromium real, desktop 1440 px e mobile 390 px: navegação, cadastro, exemplo, privacidade, ausência de erros JavaScript e de rolagem horizontal. Capturas inspecionadas visualmente.
- Chromium mobile com Supabase/IA simulados: área autenticada, seleção de imagem real, decodificação e conversão JPEG, consentimento, envio e apresentação da resposta sem overflow.
- Artes geradas inspecionadas visualmente quanto ao texto, marca, preço e proporções.

## Ainda não executado

- Migração SQL num Supabase real, RLS com duas contas reais e chamadas das funções no runtime Deno/Supabase.
- Cadastro/e-mail/SMTP reais, cobrança Stripe, cancelamento/renovação real e entrega de webhook assinado pela Stripe.
- API OpenAI real, avaliação da qualidade botânica e custos reais.
- Upload físico de câmera Android/iPhone e Pixel confirmado no Gerenciador de Eventos Meta.
- Publicação e validação no domínio Hostinger.

Esses testes dependem das contas, credenciais e domínio que serão configurados depois. O sistema não deve ser anunciado como ativo antes de passar pelo checklist do guia. Os mocks de teste ficam fora do site entregue; a interface de produção nunca apresenta esses resultados de teste.

Para repetir os testes de servidor com Node 24 ou superior:

```bash
node --test tests/backend.test.cjs
```
