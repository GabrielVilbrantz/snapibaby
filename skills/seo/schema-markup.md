# Skill: schema-markup
## Depends on: product-marketing-context

## O que faz
Implementa e audita structured data (schema.org) para maximizar rich results no Google.

## Schemas implementados no SnapiBaby
- index.html: Product + AggregateOffer + AggregateRating + HowTo + FAQPage
- /themes/: Product + AggregateRating + FAQPage
- /cities/: Service + FAQPage

## Schemas a implementar
- BreadcrumbList em todas as paginas de tema e cidade
- Article em blog posts
- WebSite + SearchAction na homepage (sitelinks search box)
- Organization com logo e redes sociais

## Validacao
Testar em: https://search.google.com/test/rich-results
Checar em: https://validator.schema.org/

## Output
JSON-LD pronto para injetar nas paginas