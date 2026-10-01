# Brotô — teste rápido no GitHub Pages

Versão de demonstração estática. Sem instalação, npm ou credenciais.

## Publicar

1. No GitHub, crie um repositório público chamado `broto-teste`.
2. Extraia o ZIP no computador. No repositório, use **Add file > Upload files**.
3. Envie todo o conteúdo extraído, incluindo a pasta `assets`. O `index.html` precisa ficar na raiz do repositório, e não dentro de outra pasta. Não envie apenas o ZIP.
4. Clique em **Commit changes**.
5. Abra **Settings > Pages**. Em Source, escolha **Deploy from a branch**; em Branch, escolha **main** e **/(root)**. Clique em **Save**.
6. Aguarde a publicação. O endereço aparece na mesma tela: `https://SEU-USUARIO.github.io/broto-teste/`.
7. Abra o site e clique em **Testar agora**. No celular, experimente **Usar câmera**.

## O que funciona nesta demonstração

Landing page, navegação, layout responsivo, escolha de arquivo, câmera compatível, prévia local e exibição de um resultado ilustrativo. A foto fica no navegador. Não há diagnóstico da imagem enviada: o resultado é um exemplo fixo, identificado como tal.

Cadastro, assinatura, histórico remoto e análise real continuam dependendo do Supabase, Stripe e da API de IA. Esta versão não finge login ou pagamento. O código servidor do pacote completo anterior não deve ser colocado no GitHub Pages; ele pertence ao Supabase. A versão de produção permanece no pacote anterior.

O Pixel informado permanece presente, carregando apenas após consentimento de marketing. Para testar sem enviar eventos à Meta, escolha **Só essenciais**.

Os caminhos de CSS, scripts e imagens são relativos, para funcionar dentro de `/broto-teste/`. Não é necessário configurar domínio próprio.

GitHub Pages serve aqui como demonstração. Para o SaaS comercial, continue com Hostinger e Supabase conforme o guia original. Não coloque chaves secretas no repositório.

Referência oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
