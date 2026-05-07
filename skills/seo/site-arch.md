# Skill: site-arch
## Depends on: product-marketing-context

## O que faz
Define e audita a arquitetura do site para maxima autoridade SEO — estrutura de silos, internal linking, hierarquia de paginas.

## Arquitetura atual do SnapiBaby
Homepage (DA principal)
  /themes/ (15 paginas de tema — Silo 1)
  /cities/ (26 paginas de cidade — Silo 2)
  /blog-post.html?post=slug (12 posts — Silo 3)

## Protocolo
1. Verificar que homepage linka para /themes/ e /cities/ (internal linking feito)
2. Verificar que cada /themes/ linka para /cities/ relacionadas (cross-silo)
3. Verificar que blog posts linkam para paginas de tema e homepage
4. Identificar paginas orfas (sem links chegando)
5. Propor paginas de hub faltantes

## Proxima expansao
- /themes/princess-new-york.html (tema x cidade — 15 x 26 = 390 paginas)
- /blog/ index page para consolidar autoridade dos posts