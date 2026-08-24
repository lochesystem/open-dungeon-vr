# Open Dungeon VR — plano de entregas funcionais

- **Versão:** 1.0
- **Data:** 24 de agosto de 2026
- **Estratégia:** passos pequenos, jogáveis e verticalmente completos
- **Plataforma de validação:** desktop em toda entrega; Quest/WebXR nos gates indicados

## 1. Definição de entrega completa

Uma entrega só termina quando:

- inicia por uma entrada compreensível, sem editar código;
- possui um objetivo ou ação verificável;
- comunica sucesso, falha ou estado final;
- permite reiniciar e repetir;
- não depende de asset fora do repositório;
- possui regras centrais testadas de forma headless;
- passa por lint e build;
- não introduz erro relevante no console;
- atualiza documentação e checklist;
- inclui captura ou evidência visual quando altera apresentação;
- preserva o que já estava funcional.

“Modelo pronto”, “sistema quase integrado” e “funciona somente pelo debug” não contam como entrega.

## 2. Ordem das entregas

```mermaid
flowchart LR
  D0["D0 Fundação"] --> D1["D1 Mãos e objeto"]
  D1 --> D2["D2 Bolsa e itens"]
  D2 --> D3["D3 Combate estático"]
  D3 --> D4["D4 Primeiro inimigo"]
  D4 --> D5["D5 Sala completa"]
  D5 --> D6["D6 Micro-expedição"]
  D6 --> D7["D7 Quest e conforto"]
  D7 --> D8["D8 Co-op 2P"]
  D8 --> VS["Vertical slice"]
```

## 3. D0 — Fundação executável

### Experiência

O jogador abre a página, escolhe jogar na tela ou entrar em VR, carrega uma sala vazia, movimenta-se, pausa, reinicia e retorna ao menu.

### Escopo

- scaffold isolado em `open-dungeon-vr`;
- React/TypeScript, Three.js, WebXR e física;
- um único loop;
- teclado, gamepad e controladores XR;
- sala de teste com escala humana;
- colisão precisa da cápsula do jogador com paredes, pilares rotacionados, altar e portal;
- correção de locomoção virtual e deslocamento físico do headset;
- visualização opcional de hitboxes para diagnóstico;
- menu, pausa, reinício e descarte;
- indicador de FPS e build;
- primeira suíte de testes headless.

### Fora do escopo

- bolsa;
- combate;
- inimigo;
- procedural;
- multiplayer.

### Gate

- [x] Carrega em desktop sem erro.
- [x] Detecta suporte WebXR sem quebrar navegadores comuns.
- [x] Movimento e giro respeitam `delta` limitado.
- [x] Jogador não atravessa a geometria sólida da sala por locomoção virtual.
- [x] Deslocamento físico do headset é corrigido pelos mesmos colisores.
- [x] Pausa congela gameplay e mantém renderização.
- [x] Reiniciar não duplica canvas, listeners ou loop.
- [x] Build reproduzível.

> Evidência automatizada: nove testes headless, lint e build aprovados em 24/08/2026. A sensação e a precisão do deslocamento físico ainda serão revalidadas no Quest no gate D7.

## 4. D1 — Mãos e um objeto confiável

### Experiência

O jogador pega um cubo rúnico, troca de mão, solta, arremessa em um alvo e recebe confirmação. O objeto retorna ao pedestal se cair fora da sala.

### Escopo

- mãos/controladores visíveis;
- pose e raio apenas quando necessários;
- grab por proximidade;
- handoff entre mãos;
- collider e arremesso;
- highlight de interação;
- áudio e haptics;
- recuperação fora do mundo;
- equivalência desktop para teste.

### Gate

- [x] Pegar e soltar não duplica o objeto.
- [x] Handoff mantém uma única autoridade.
- [x] Arremesso usa histórico de pose, não apenas o último frame.
- [x] Objeto perdido sempre é recuperável.
- [x] Modo canhoto não altera a regra.
- [ ] Uma sessão com 100 interações não degrada progressivamente.

> Evidência automatizada: regras de autoridade, handoff, histórico de poses, impacto único e recuperação cobertas por testes. O último gate depende de uma sessão física prolongada no Quest.

## 5. D2 — Bolsa da aventura

### D2.1 — Primeira fatia funcional

- [x] Bolsa procedural presa à cintura e alcançável pelas duas mãos.
- [x] Tampa abre por proximidade e desativa a física do item guardado.
- [x] Três sockets físicos oferecem snap assistido e feedback visual.
- [x] Cubo entra e sai da bolsa sem duplicar autoridade entre mundo, slot e mão.
- [x] Guardar e retirar possuem áudio, haptics e equivalência desktop pela tecla `B`.
- [x] Regras de armazenamento, slot inválido e retirada incorreta possuem testes headless.
- [ ] Validar repetição prolongada, alcance sentado e ergonomia no Quest.

### Experiência

O jogador abre a bolsa, guarda uma poção, uma chave e o cubo rúnico, fecha, caminha, reabre e recupera cada item. Usa a poção, abre uma fechadura com a chave e termina o pequeno desafio.

### Escopo

- bolsa procedural com tampa e sockets;
- quatro slots rápidos;
- duas presilhas externas;
- poção consumível;
- chave de missão;
- snap assistido e ghost;
- materialização/desmaterialização;
- persistência durante reinício da sala quando previsto;
- configuração de posição, escala, canhoto e modo por botão.

### Gate

- [ ] Item só ocupa um lugar.
- [ ] Slot rejeita categoria incompatível com feedback claro.
- [ ] Fechar a bolsa não deixa física interna ativa.
- [ ] Item perdido retorna ao slot correto.
- [ ] Consumir remove exatamente uma unidade.
- [ ] Jogador sentado e configuração de um braço concluem o desafio.

## 6. D3 — Laboratório de combate estático

### Experiência

O jogador retira espada e escudo, ataca um boneco, bloqueia um golpe mecânico, executa um parry e quebra o alvo. Um painel mostra somente feedback útil e oferece repetição.

### Escopo

- espada e escudo procedurais;
- sockets de coldre e costas;
- validação de arco e velocidade;
- impacto único por swing/alvo;
- bloqueio, stamina e parry;
- hit zones;
- dano, stagger e destruição do boneco;
- efeitos distintos para erro, bloqueio, parry e dano.

### Gate

- [ ] Tremor rápido não supera golpe deliberado.
- [ ] Um swing não causa dano por frame.
- [ ] Escudo só bloqueia pelo lado e ângulo válidos.
- [ ] Parry depende de janela, não de contato permanente.
- [ ] Arma nunca fica presa permanentemente no cenário.
- [ ] Reinício limpa dano, efeitos, timers e sockets.

## 7. D4 — Primeiro inimigo completo

### Experiência

O jogador enfrenta o **Guardião Ossário** numa arena curta. O inimigo patrulha, percebe, aproxima, usa dois ataques, defende, reage a stagger, morre e deixa uma runa que pode ser guardada na bolsa.

### Escopo de arte FULL IA

- concept e vistas aprovadas;
- blockout validado no jogo;
- modelo, material e dois LODs;
- rig `humanoid_large`;
- idle, locomoção, percepção, dois ataques, defesa, stagger e morte;
- lança ou espada própria;
- hitboxes, sockets, colliders e áudio;
- manifesto de proveniência e relatório do asset.

### Escopo de gameplay

- máquina de estados;
- navegação na arena;
- telegraphs;
- cooldown e recuperação;
- ataque validado no instante correto;
- vida, stagger e loot;
- dificuldade fixa e reproduzível.

### Gate

- [ ] Ataques podem ser lidos antes do impacto.
- [ ] Inimigo não golpeia atravessando parede ou fora de alcance.
- [ ] Jogador vence usando ataque, bloqueio e parry.
- [ ] Spam não é a estratégia dominante.
- [ ] Morte encerra IA, collider ofensivo, timers e áudio.
- [ ] Runa entra e sai da bolsa corretamente.
- [ ] Asset pode ser regenerado sem edição manual.

## 8. D5 — Primeira sala completa

### Experiência

O jogador recebe um contrato de relicário, abre uma porta física, explora uma sala ambientada, enfrenta o Guardião, encontra a relíquia, guarda-a e ativa o portal de extração. O resultado informa tempo, dano e objetivo.

### Escopo

- kit modular de cripta;
- iluminação e materiais finais do primeiro bioma;
- porta, chave, baú, relicário e portal;
- estado de contrato;
- caminho de sucesso e derrota;
- resultado e repetir;
- áudio ambiental e mix com combate;
- save mínimo do melhor resultado.

### Gate

- [ ] Fluxo menu → contrato → sala → extração → resultado funciona.
- [ ] Objetivo é compreensível sem texto longo.
- [ ] Sala permanece legível em claro, escuro e headset.
- [ ] Relíquia não pode ser duplicada ou perdida.
- [ ] Derrota e repetição restauram estado completo.
- [ ] Build mantém orçamento definido para a entrega.

## 9. D6 — Micro-expedição procedural

### Experiência

O jogador atravessa três salas geradas por seed: introdução, situação variável e guardião. Escolhe uma rota opcional, extrai uma relíquia e vê uma pequena mudança persistente no refúgio.

### Escopo

- grafo determinístico de três salas;
- 6–8 salas autorais combináveis;
- caminho crítico e rota opcional;
- contrato de relicário;
- dois inimigos, sendo um reutilização modular;
- loot e runa temporária;
- refúgio mínimo antes/depois;
- save versionado;
- relatório de seed para reproduzir bugs.

### Gate

- [ ] Mesma seed e versão geram a mesma expedição.
- [ ] Toda seed testada possui entrada, objetivo e saída.
- [ ] Não existem três combates consecutivos.
- [ ] Conteúdo descarregado remove mesh, collider, áudio e listener.
- [ ] Mudança no refúgio persiste após recarregar.
- [ ] Expedição inteira dura entre 8 e 12 minutos.

## 10. D7 — Homologação Quest e conforto

### Experiência

A micro-expedição da D6 é concluída no Quest sem sair da sessão XR, usando movimento suave ou teleporte, sentado ou em pé, destro ou canhoto.

### Escopo

- menus espaciais completos;
- calibração e persistência;
- smooth locomotion e teleporte;
- snap/smooth turn;
- vignette;
- redução de verticalidade;
- otimização de GLB/KTX2, luz, física e áudio;
- teste de cinco runs consecutivas.

### Gate

- [ ] Toda jornada ocorre dentro da sessão XR.
- [ ] 72 FPS no cenário alvo ou desvio documentado com plano de correção.
- [ ] Sem crescimento contínuo de memória após cinco runs.
- [ ] Coldres e bolsa são alcançáveis sentado e em pé.
- [ ] Canhoto espelha mãos, UI, bolsa e armas.
- [ ] Centro da visão permanece livre.

## 11. D8 — Co-op funcional para dois

### Experiência

Dois jogadores entram por código, completam a micro-expedição, revivem um ao outro, recebem loot próprio e retornam juntos ao refúgio.

### Escopo

- sala privada por código;
- servidor autoritativo para seed, dano, loot e objetivo;
- avatares simples com cabeça e mãos;
- voz ou ping como primeira comunicação;
- revive;
- reconexão curta;
- saída graciosa de um jogador;
- loot individual.

### Gate

- [ ] Ambos veem a mesma seed, portas, inimigos e objetivo.
- [ ] Latência não duplica impacto ou loot.
- [ ] Revive possui distância, tempo e interrupção.
- [ ] Desconexão não apaga progresso do outro jogador.
- [ ] Bloqueio impede reentrada na mesma sala.
- [ ] Solo continua funcional sem servidor de matchmaking.

## 12. Vertical slice

Depois de D0–D8, expandir a micro-expedição para o vertical slice definido no GDD:

- refúgio pequeno;
- contrato completo;
- 10 salas e 3 topologias;
- 4 inimigos e mini-boss;
- espada, machado, arco e escudo;
- solo e co-op;
- consequência persistente;
- run de 15–20 minutos.

O slice não começa do zero: ele amplia uma cadeia já jogável e homologada.

## 13. Ordem imediata

A etapa ativa é **D2 — Bolsa da aventura**. A D2.1 estabelece a ergonomia e a autoridade de um único item; a próxima fatia adiciona categorias reais com poção, chave e moeda sem alterar a regra central já validada.

## 14. Registro de andamento

| Entrega | Estado | Evidência |
| --- | --- | --- |
| D0 — Fundação | Concluída | `game/`; testes, lint, build e HTTP 200 em 24/08/2026 |
| D1 — Mãos e objeto | Concluída | Grab, handoff, arremesso, alvo, recuperação e homologação inicial no Quest |
| D2 — Bolsa e itens | Em andamento | D2.1: bolsa de cintura, três slots e armazenamento autoritativo do cubo |
| D3 — Combate estático | Não iniciada | — |
| D4 — Primeiro inimigo | Não iniciada | — |
| D5 — Sala completa | Não iniciada | — |
| D6 — Micro-expedição | Não iniciada | — |
| D7 — Quest e conforto | Não iniciada | — |
| D8 — Co-op 2P | Não iniciada | — |
