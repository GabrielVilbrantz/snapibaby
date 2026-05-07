# Skill: Position Me — CRO Conversion Audit

## Quando usar
Mencione "Position me" no início de uma conversa para ativar esta análise.

## O que esta skill faz
Analisa o site SnapiBaby e identifica **exatamente por que visitantes não convertem** — com diagnóstico por seção, prioridade de impacto e fix imediato para cada problema.

---

## Protocolo de Execução

### Passo 1 — Leitura completa do funil
Ler nesta ordem:
1. `index.html` — Hero, proposta de valor, galeria, preços, blog
2. `checkout.html` — Formulário, order bump, fricção
3. `upsell.html` — Oferta pós-compra
4. `success.html` — Entrega de valor e próximo passo

### Passo 2 — Framework de análise (7 vetores)

Para cada seção do site, avaliar:

| Vetor | Pergunta-chave |
|---|---|
| **Clareza** | O visitante entende o que é em menos de 5 segundos? |
| **Proposta de valor** | O benefício principal está acima do fold? |
| **Prova social** | Existe credibilidade suficiente antes do CTA? |
| **Fricção** | Quantos cliques até o pagamento? Existe campo desnecessário? |
| **Urgência** | Existe razão para agir AGORA vs amanhã? |
| **Medo / Objeções** | As principais objeções estão respondidas antes do botão? |
| **Mobile UX** | O CTA principal é visível sem scroll no mobile? |

### Passo 3 — Output obrigatório

Retornar um relatório com:

```
## Position Me — Diagnóstico de Conversão

### Score Geral: X/10

### 🔴 Crítico (impacto imediato)
[Problema] → [Por que não converte] → [Fix específico]

### 🟡 Médio (impacto em 7-14 dias)
[Problema] → [Por que não converte] → [Fix específico]

### 🟢 Otimização (A/B test)
[Elemento] → [Hipótese] → [Variante a testar]

### Funil de conversão estimado
Visitante → [X]% chegam ao CTA → [X]% clicam → [X]% completam checkout

### Fix #1 (maior ROI)
[Implementar agora — impacto estimado em conversão]
```

### Passo 4 — Implementar o Fix #1 imediatamente
Após o diagnóstico, perguntar: "Quer que eu implemente o Fix #1 agora?"
Se sim, fazer a mudança no código sem esperar aprovação adicional.

---

## Benchmarks de referência
- Hero section: proposta de valor em ≤ 7 palavras
- CTA above the fold: visível sem scroll em mobile (375px)
- Número de campos no checkout: ≤ 3 antes do cartão
- Prova social: aparecer antes do primeiro CTA
- Tempo de carregamento: LCP < 2.5s
- Preço: aparecer junto da proposta de valor, não só na seção de preços
