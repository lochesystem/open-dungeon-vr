# Open Dungeon VR

Projeto conceitual de um dungeon crawler cooperativo em realidade virtual, desenhado para Meta Quest via WebXR e também jogável em tela.

Documentos do projeto:

- [Game Design Document](GDD.md) — visão, sistemas e escopo do jogo.
- [Plano de entregas](DELIVERY-PLAN.md) — sequência incremental de versões completamente funcionais.
- [Produção FULL IA](AI-PRODUCTION.md) — pipeline de conceitos, texturas, modelos, rigs, animações e QA sem modelagem manual do usuário.
- [Benchmark](BENCHMARK.md) — análise das referências e fontes consultadas.

## Estado

- D0, D1 e D2 concluídas; D3.3 adiciona escudo e bloqueio direcional ao treino de espada livre
- Portal discreto na cintura: solte um item sobre o anel para guardar automaticamente; `X` esquerdo ou `A` direito abre o menu conforme a mão dominante
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

No Meta Quest, solte o gatilho com o item sobre o anel da cintura para guardá-lo no primeiro slot livre. Antes de entrar em VR, abra **Conforto e acessibilidade** para escolher postura, mão dominante, modo de uma mão, altura da cintura e distância do menu. A bolsa abre com `X` na mão esquerda ou `A` na direita, conforme a configuração.
Durante a sessão VR, pressione o botão de menu do controle esquerdo para abrir o painel espacial de pausa. Caso o Quest Browser reserve esse botão para o sistema, clique o analógico esquerdo. Use o analógico para navegar e ajustar, e o gatilho para confirmar.
No painel VR, aponte qualquer controle: uma linha e um cursor indicam a opção que será ativada pelo gatilho.
Para pegar sem se agachar, aponte a mão para o item a até 3,5 m e pressione o gatilho; ele será atraído suavemente até a pegada.
Retire a chave do inventário e solte-a junto à fechadura do portal para abrir fisicamente a passagem.
Após sofrer dano na runa, leve a poção à boca, incline o frasco e mantenha a pose brevemente para recuperar vida e liberar o slot.
Se um item sair dos limites da sala, ele retorna ao último slot válido; se isso não for possível, usa outro slot livre ou volta ao pedestal.
Para o treino D3.2, puxe a espada da lateral esquerda e atravesse o volume do boneco com golpes rápidos e deliberados. O boneco é imortal e contabiliza os acertos indefinidamente. Pegue diretamente qualquer trecho da espada para escolher o ponto e o ângulo; mantenha o gatilho da outra mão sobre um segundo trecho para manipulação bimanual. No desktop, segure a espada, aproxime-se e pressione `J`.
Para o treino D3.3, puxe o escudo do suporte à direita. Ele encaixa automaticamente pela alça em uma posição ergonômica, sempre com a face decorada para a frente; depois disso, o pulso orienta a defesa normalmente. Um projétil anuncia o ataque antes de avançar: coloque o disco no caminho e mantenha a face decorada voltada para a origem. Contato pelo verso, fora do raio ou em ângulo rasante não bloqueia. Os ataques são não letais e o ciclo continua enquanto o escudo estiver equipado.

## Meta Quest pelo GitHub Pages

Cada atualização da branch `main` publica automaticamente o build estático em:

<https://lochesystem.github.io/open-dungeon-vr/>

Abra essa URL no navegador do Quest e escolha **Entrar em VR**. O HTTPS fornecido pelo GitHub Pages atende ao contexto seguro exigido pelo WebXR.
