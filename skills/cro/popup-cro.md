# Skill: popup-cro
## Depends on: product-marketing-context

## O que faz
Otimiza ou cria popups de exit intent, scroll-triggered e time-delayed para recuperar visitantes.

## Status atual
Exit intent popup implementado no checkout.html com scratch card de 40% desconto.

## Protocolo
1. Trigger: exit intent (mouse sai do viewport) OU 60 segundos sem acao
2. Oferta: desconto claro e unico (nao disponivel na pagina principal)
3. CTA: um unico botao (sem opcao "nao obrigado" visivel demais)
4. Mobile: swipe-up ou tap-to-close (nao mouse)
5. Frequencia: max 1x por sessao, nao mostrar apos conversao

## Templates a criar
- Homepage: "Before you go — see your baby's portrait free (no credit card)"
- Checkout: "Wait! Here's 40% off your first portrait" (scratch card existente)
- Temas: "Want to see the Astronaut portrait with your baby? It's free to preview"

## Output
HTML/CSS/JS do popup pronto para implementar