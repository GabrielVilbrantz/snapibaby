# Skill: Token Optimization

## Quando usar
Mencione "token optimization" no início de uma conversa longa ou quando perceber que o contexto está ficando grande.

## O que esta skill faz
Garante que conversas longas sobre o SnapiBaby não percam contexto crítico e que cada mensagem seja usada de forma eficiente — evitando retrabalho, respostas truncadas e perda de estado do projeto.

---

## Protocolo de Execução

### Regras para o assistente ao ativar esta skill

**1. Compressão de contexto**
- Antes de qualquer tarefa longa, ler o `CONTEXT.md` do projeto em vez de re-explorar arquivos
- Não re-ler arquivos que já foram vistos na mesma sessão
- Resumir o estado atual em ≤ 5 linhas antes de cada bloco de trabalho

**2. Respostas compactas**
- Respostas de confirmação: máximo 3 linhas
- Respostas de diagnóstico: usar tabelas em vez de parágrafos longos
- Código: mostrar apenas o diff, nunca o arquivo inteiro
- Nunca repetir o que o usuário acabou de dizer

**3. Batching de operações**
- Agrupar múltiplas edições em um único tool call quando possível
- Usar PowerShell para operações em lote (múltiplos arquivos)
- Nunca fazer 3 tool calls quando 1 script resolve

**4. Checkpoints**
A cada ~10 trocas de mensagem, emitir um mini-resumo:
```
## Checkpoint
✅ Feito: [lista compacta]
🔄 Em andamento: [tarefa atual]
⏳ Próximo: [próxima tarefa]
```

**5. Priorização de ações**
Sempre que houver múltiplas tarefas pendentes, perguntar:
"Quer continuar com [A] ou prefere [B]?" — nunca executar tudo de uma vez sem confirmar prioridade.

---

## Atalhos de contexto do SnapiBaby

Ao invés de re-explorar arquivos, use estas referências diretas:

| Precisa de | Onde está |
|---|---|
| Estrutura do site | `CONTEXT.md` — seção "Arquivos Principais" |
| Preços | `CONTEXT.md` — seção "Preços" |
| Slugs de blog | `CONTEXT.md` — seção "Blog Posts" |
| Cidades feitas | `CONTEXT.md` — seção "Páginas de Cidade" |
| Regras de encoding | `CONTEXT.md` — "Regra de encoding" |
| Status SEO | `CONTEXT.md` — seção "SEO — Status" |
| Gerar tema novo | Ler `theme-template.html` + rodar script PS1 |
| Gerar cidade nova | Ler `city-template.html` + rodar script PS1 |

---

## Quando o contexto estiver cheio (mensagem de erro de token)

1. Iniciar nova conversa
2. Anexar `CONTEXT.md`
3. Dizer: "Retomando de onde paramos — [tarefa atual]"
4. O assistente deve ler o CONTEXT.md e retomar sem precisar re-explorar o projeto

---

## Template de início de sessão eficiente

```
Contexto: [anexar CONTEXT.md]
Tarefa: [descrição em 1 linha]
Prioridade: [alta/média/baixa]
Já feito nesta sessão: [nada / lista compacta]
```
