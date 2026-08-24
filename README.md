# Open Dungeon VR

Projeto conceitual de um dungeon crawler cooperativo em realidade virtual, desenhado para Meta Quest via WebXR e também jogável em tela.

Documentos do projeto:

- [Game Design Document](GDD.md) — visão, sistemas e escopo do jogo.
- [Plano de entregas](DELIVERY-PLAN.md) — sequência incremental de versões completamente funcionais.
- [Produção FULL IA](AI-PRODUCTION.md) — pipeline de conceitos, texturas, modelos, rigs, animações e QA sem modelagem manual do usuário.
- [Benchmark](BENCHMARK.md) — análise das referências e fontes consultadas.

## Estado

- D0 e D1 concluídas; D2.1 com primeira bolsa da aventura executável
- Portal discreto na cintura e menu transparente com seis slots, mantendo armazenamento autoritativo no desktop/WebXR
- Nome de trabalho: **Open Dungeon VR**
- Produção: **FULL IA**, com aprovação visual e de produto pelo usuário
- Estratégia: entregas pequenas, executáveis e verticalmente completas
- GDD: versão 0.2, 24 de agosto de 2026

## Executar a fundação

O runtime fica em `game/`:

```bash
cd game
npm run dev
```

Validação completa:

```bash
npm run check
```

Na versão desktop, use `E` para pegar ou soltar o cubo, `F` para arremessar, `B` para guardar ou retirar da bolsa, `R` para recuperá-lo e `H` para visualizar as hitboxes.

## Meta Quest pelo GitHub Pages

Cada atualização da branch `main` publica automaticamente o build estático em:

<https://lochesystem.github.io/open-dungeon-vr/>

Abra essa URL no navegador do Quest e escolha **Entrar em VR**. O HTTPS fornecido pelo GitHub Pages atende ao contexto seguro exigido pelo WebXR.
