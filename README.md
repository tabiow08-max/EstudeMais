# EstudeMais

App de estudos para vestibular com duas IAs:

1. **Planejadora** — você escolhe o vestibular, o curso, o período (ou a data da prova) e os dias/horários em que vai estudar. A IA escolhe os temas que mais caem nessa prova, define a prioridade (alta, média ou baixa) e a incidência estimada de cada um, e o app distribui tudo num cronograma de aulas de 1 hora. Os temas de prioridade alta vêm primeiro e as matérias são intercaladas. Há um bloco semanal de redação, e o tempo que sobra no fim vira revisão.
2. **Tutora** — depois de estudar um tema, toque em **Estudei!** (numa aula do cronograma ou em "Estudei algo agora"). A IA gera flashcards e um simuladinho de múltipla escolha no estilo da banca. Se você colar suas anotações da aula, a revisão fica mais parecida com o que você estudou.

Também tem:

- revisão de flashcards com repetição espaçada (o que você errou volta no mesmo dia, o que acertou volta mais tarde);
- calendário mensal, visão semanal e lista;
- estatísticas: acerto, dias de estudo, cronograma cumprido e desempenho por matéria;
- perfil.

O visual foi inspirado no layout de referência (tons creme e títulos com serifa). É um app web *mobile-first*: no celular, dá para usar "Adicionar à tela inicial" e ele abre como aplicativo.

## Instalar no tablet ou celular (app)

O app é publicado automaticamente em **https://tabiow08-max.github.io/EstudeMais/** (GitHub Pages, branch `gh-pages`).

1. Abra esse endereço no Chrome do tablet.
2. Toque em **⋮ → Instalar app** (ou **Adicionar à tela inicial**). Aparece o ícone do EstudeMais, que abre em tela cheia e funciona até sem internet.
3. No primeiro uso, cole sua chave da API da Anthropic (crie em <https://console.anthropic.com/settings/keys>). Ela fica guardada só no aparelho. Cada plano ou revisão gerada gasta alguns centavos dos seus créditos da API.

Os dados ficam guardados no próprio aparelho. Em **Perfil → Configurações** dá para salvar e restaurar uma cópia de segurança.

## Versão publicada no Claude

O app também é publicado como uma página no claude.ai. Lá, as IAs usam a própria conta do Claude de quem abre a página (sem chave de API), e os dados ficam salvos na conta, então aparecem em qualquer aparelho. Para gerar a página de novo depois de mudar o código:

```bash
npm run build:artifact    # gera dist-artifact/estudemais.html
```

## Como rodar no computador

Pré-requisito: [Node.js](https://nodejs.org) 20 ou mais recente.

```bash
npm install
cp .env.example .env      # e coloque sua chave em ANTHROPIC_API_KEY
npm run dev               # abre em http://localhost:5173
```

Pegue a chave em <https://console.anthropic.com>. As IAs usam o modelo `claude-opus-5-5`. A chave fica só no servidor e nunca vai para o navegador.

**Sem chave**, o app funciona em modo offline:

- o plano é gerado por regras, com uma base própria de incidência histórica dos temas (`src/data/syllabus.ts`), ajustada pelo peso de cada matéria no curso;
- flashcards e simulados não são gerados nesse modo, porque precisam da IA.

Para usar em produção (um único servidor serve o app e a API):

```bash
npm run build
npm start                 # http://localhost:8787
```

## Estrutura

| Pasta / arquivo | O que é |
|---|---|
| `server/index.ts` | API Express (`/api/plan`, `/api/review`, `/api/health`) |
| `server/ai.ts` | Os *prompts* e as chamadas às duas IAs (saída em JSON validada com Zod) |
| `src/lib/scheduler.ts` | Monta o cronograma a partir dos temas e da sua disponibilidade |
| `src/lib/offlinePlanner.ts` | Planejador por regras (sem IA) |
| `src/data/` | Matérias, vestibulares, cursos e conteúdos mais cobrados |
| `src/screens/` | Telas: onboarding, Início, Flashcards, Cronograma, Estatísticas, Perfil |

Os dados (plano, cronograma, cards, simulados) ficam salvos no navegador do aparelho.
