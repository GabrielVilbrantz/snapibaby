# Skill: programmatic-seo
## Depends on: product-marketing-context, site-arch

## O que faz
Gera e expande paginas pSEO do SnapiBaby — temas, cidades, e combinacoes tema x cidade.

## Paginas existentes
- 15 paginas de tema em /themes/
- 26 paginas de cidade em /cities/

## Proximas expansoes
### Fase 2 — Cidades restantes (~174)
Usar city-template.html + generate-cities.ps1
Batch: EUA restantes, UK, AU, CA

### Fase 3 — Tema x Cidade (390 paginas)
URL: /themes/princess-newborn-photos-new-york-ny.html
Keyword: "princess newborn photos new york"
Template: combinar theme-template + dados de cidade

### Fase 4 — Comparativos (30+ paginas)
URL: /vs/snapibaby-vs-newborn-photographer-new-york.html
Keyword: "newborn photographer new york alternative"

## Regras de encoding
- Sempre: New-Object System.Text.UTF8Encoding(\False)
- Emojis: HTML entities (&#x1F451; nao 'crown emoji')
- Substituicoes: apenas ASCII nos scripts PS1

## Output
Script PS1 pronto para rodar
Lista de URLs geradas