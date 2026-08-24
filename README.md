# Open Dungeon VR

Projeto conceitual de um dungeon crawler cooperativo em realidade virtual, desenhado para Meta Quest via WebXR e também jogável em tela.

Documentos do projeto:

- [Game Design Document](GDD.md) — visão, sistemas e escopo do jogo.
- [Plano de entregas](DELIVERY-PLAN.md) — sequência incremental de versões completamente funcionais.
- [Produção FULL IA](AI-PRODUCTION.md) — pipeline de conceitos, texturas, modelos, rigs, animações e QA sem modelagem manual do usuário.
- [Benchmark](BENCHMARK.md) — análise das referências e fontes consultadas.

## Estado

- D0 e D1 concluídas; D2.3 com bolsa multi-item, chave, porta, poção consumível e vida no pulso
- Portal discreto na cintura: solte cubo ou chave sobre o anel para guardar automaticamente; `X` na mão esquerda abre o menu transparente com seis slots
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

No Meta Quest, solte o gatilho com o item sobre o anel da cintura para guardá-lo no primeiro slot livre. O botão `X` do controle esquerdo abre ou fecha o inventário.
Para pegar sem se agachar, aponte a mão para o item a até 3,5 m e pressione o gatilho; ele será atraído suavemente até a pegada.
Retire a chave do inventário e solte-a junto à fechadura do portal para abrir fisicamente a passagem.
Após sofrer dano na runa, leve a poção à boca, incline o frasco e mantenha a pose brevemente para recuperar vida e liberar o slot.

## Meta Quest pelo GitHub Pages

Cada atualização da branch `main` publica automaticamente o build estático em:

<https://lochesystem.github.io/open-dungeon-vr/>

Abra essa URL no navegador do Quest e escolha **Entrar em VR**. O HTTPS fornecido pelo GitHub Pages atende ao contexto seguro exigido pelo WebXR.
