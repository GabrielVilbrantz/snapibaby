# Skill: analytics-audit
## Depends on: product-marketing-context

## O que faz
Audita e configura tracking de analytics do SnapiBaby para garantir dados confiantes.

## Ferramentas ativas
- Meta Pixel (ID: 977138755178682) — GDPR-condicionado
- Google Search Console — verificado, sitemap submetido

## Ferramentas a adicionar
- Google Analytics 4 (GA4) — sem custo, essencial
- Microsoft Clarity — heatmaps e session recordings gratis
- Hotjar (alternativa paga) — para heatmaps avancados

## Eventos a trackear
- page_view (todas as paginas)
- begin_checkout (clique em qualquer CTA)
- upload_photo (usuario fez upload)
- preview_viewed (usuario viu o preview)
- purchase (checkout completo)
- upsell_accepted / upsell_declined

## Como instalar GA4 no SnapiBaby
1. Criar property em analytics.google.com
2. Copiar Measurement ID (G-XXXXXXXXXX)
3. Adicionar script no <head> de todas as paginas
4. Configurar eventos de conversao

## Output
Script GA4 pronto para todas as paginas
Lista de eventos customizados com codigo