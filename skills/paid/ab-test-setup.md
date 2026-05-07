# Skill: ab-test-setup
## Depends on: product-marketing-context

## O que faz
Planeja e configura testes A/B no site e nos ads do SnapiBaby.

## Testes prioritarios (por impacto estimado)

### Homepage
1. Hero headline: "Studio-Quality AI Newborn Photos" vs "Turn Your Phone Photo Into a Studio Portrait"
2. CTA primario: "Start Free" vs "See Your Baby's Portrait Free"
3. Preco above fold: mostrar  no hero vs nao mostrar
4. Ordem de secoes: Galeria antes ou depois de Como Funciona?

### Checkout
1. Order bump: checkbox vs card destacado
2. CTA: "Complete Order" vs "Get My Portraits"
3. Numero de campos: com vs sem campo de nome do bebe

### Blog / Tema pages
1. CTA ao final: botao vs banner CTA vs popup de saida

## Como implementar sem framework
Usar URL params para A/B manual:
?v=a (controle) vs ?v=b (variante)
JavaScript le o param e muda o elemento

## Metricas
- Tamanho de amostra minimo: 100 conversoes por variante
- Significancia estatistica: 95%
- Duracao minima: 2 semanas

## Output
Plano de teste completo + codigo JS para implementar