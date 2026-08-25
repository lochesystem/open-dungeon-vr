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

- [x] Pequeno portal circular aparece apenas quando uma mão se aproxima do centro da cintura.
- [x] Clique no portal abre ou fecha um painel transparente e discreto à frente do jogador.
- [x] Seis sockets em matriz 3×2 oferecem snap assistido e feedback visual.
- [x] Cubo entra e sai da bolsa sem duplicar autoridade entre mundo, slot e mão.
- [x] Guardar e retirar possuem áudio, haptics e equivalência desktop pela tecla `B`.
- [x] Soltar um item sobre o anel da cintura o envia ao primeiro slot livre sem abrir o menu.
- [x] Botão `X` da mão esquerda abre ou fecha o inventário no Meta Quest.
- [x] Mira assistida puxa itens de até 3,5 m para a mão com animação confortável.
- [x] Regras de armazenamento, slot inválido e retirada incorreta possuem testes headless.
- [ ] Validar repetição prolongada, alcance sentado e ergonomia no Quest.

### D2.2 — Chave e passagem

- [x] Chave procedural compartilha puxão assistido, pegada estável e recuperação com o cubo.
- [x] Cubo e chave ocupam slots exclusivos e podem permanecer guardados simultaneamente.
- [x] Soltar a chave no socket físico desbloqueia e eleva a porta.
- [x] Colisão da porta permanece ativa até existir vão seguro para passagem.
- [x] Feedback visual, sonoro e háptico informa armazenamento, retirada e desbloqueio.
- [ ] Homologar o ciclo completo no Meta Quest.

### D2.3 — Poção e vida

- [x] Poção procedural participa do puxão assistido e do inventário multi-item.
- [x] Armadilha rúnica aplica dano não letal uma vez por entrada.
- [x] Vida é apresentada discretamente no pulso esquerdo.
- [x] Consumo exige proximidade, inclinação e tempo deliberado.
- [x] Beber cura exatamente uma unidade, remove um frasco e libera o slot.
- [x] Regras de dano, cura, gesto e consumo possuem testes headless.
- [ ] Homologar gesto de beber, legibilidade do pulso e conforto no Meta Quest.

### D2.4 — Conforto e robustez da bolsa

- [x] Configurações de postura em pé/sentado, altura da cintura e distância do menu são aplicadas sem reiniciar a sala.
- [x] Mão dominante define `X` esquerdo ou `A` direito para abrir a bolsa.
- [x] Modo de uma mão concentra locomoção e interação no controle dominante.
- [x] Item perdido retorna ao último slot válido ou ao primeiro slot livre; sem slot disponível, volta ao pedestal.
- [x] Estado autoritativo da bolsa permanece íntegro em 100 ciclos automatizados de guardar e retirar.
- [x] Painel de conforto está disponível antes da sessão VR e novamente na pausa desktop.
- [ ] Homologar alcance sentado, modo de uma mão e ajuste fino de cintura/distância no Meta Quest.

### D2.5 — Pausa e conforto dentro do VR

- [x] Menu de pausa é renderizado como painel 3D dentro da sessão WebXR.
- [x] Ambos os controles projetam linha e cursor; o gatilho ativa exatamente a opção apontada.
- [x] Textura do painel usa 2048×1440, filtragem sem mipmaps e anisotropia máxima para legibilidade no Quest.
- [x] Botão de menu esquerdo abre/fecha quando exposto pelo navegador; clique do analógico esquerdo é o fallback.
- [x] Analógico esquerdo navega verticalmente e ajusta opções horizontalmente.
- [x] Gatilho confirma continuar, alternar opções, reiniciar sala ou sair do VR.
- [x] Postura, mão dominante, modo de uma mão, cintura e distância permanecem sincronizados com a interface 2D.
- [x] Gameplay e física ficam suspensos enquanto o menu espacial está aberto.
- [x] Item segurado não é solto ao usar o gatilho no menu.
- [ ] Confirmar no Meta Quest se a versão atual do Quest Browser expõe o botão de menu reservado.

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
- [x] Item perdido retorna ao slot correto.
- [ ] Consumir remove exatamente uma unidade.
- [ ] Jogador sentado e configuração de um braço concluem o desafio no Quest.

## 6. D3 — Laboratório de combate estático

### D3.1 — Espada e boneco funcional

- [x] Espada procedural pode ser puxada, guardada, retirada, solta e recuperada.
- [x] Pegada orienta a lâmina para a frente do controle sem rotação artificial.
- [x] Ponta da espada usa trajetória varrida para não atravessar o alvo entre frames.
- [x] Tremores curtos e movimento lento não causam dano.
- [x] Boneco recebe no máximo um dano por janela, reage, perde três pontos de vida e cai ao ser derrotado.
- [x] Áudio, haptics, status e equivalência desktop comunicam cada golpe válido.
- [ ] Homologar sensação do limiar de velocidade e alcance da lâmina no Meta Quest.

### D3.2 — Manipulação livre da espada

- [x] Boneco é imortal e registra quantidade ilimitada de golpes válidos.
- [x] Pegada direta usa o ponto real escolhido ao longo da espada.
- [x] Orientação relativa do momento da pegada é preservada, sem pose reta obrigatória.
- [x] Uma segunda mão pode entrar em outro ponto e orientar a arma junto com a primeira.
- [x] Mão secundária pode sair sem soltar a arma.
- [x] Soltar a mão principal transfere a autoridade para a secundária sem queda.
- [x] Puxão distante e retirada da bolsa usam o cabo como ponto seguro inicial.
- [ ] Homologar liberdade, estabilidade e conforto de pegadas incomuns no Meta Quest.

### D3.3 — Escudo e bloqueio direcional

- [x] Escudo procedural pode ser puxado, segurado, solto, guardado e recuperado.
- [x] Ataque mecânico anuncia origem e instante antes de viajar até o jogador.
- [x] Bloqueio usa trajetória varrida para não perder contato entre frames.
- [x] Somente a face frontal bloqueia, dentro de um cone angular válido.
- [x] O ponto de contato precisa estar dentro do raio físico do escudo.
- [x] Erro causa dano não letal; acerto responde com áudio, haptics e contagem.
- [x] Ciclo reinicia automaticamente enquanto o escudo está equipado.
- [ ] Homologar tamanho, ritmo e cone de bloqueio no Meta Quest.

### D3.3.1 — Empunhadura ergonômica do escudo

- [x] Escudo ignora a orientação casual em que foi tocado ou puxado.
- [x] Face decorada é alinhada de forma determinística ao eixo frontal do controle.
- [x] Alça traseira coincide com a mão e mantém o disco à frente do punho.
- [x] Rotação do pulso continua orientando livremente a defesa após a pegada.
- [ ] Homologar inclinação e distância final no Meta Quest.

### D3.3.2 — Aquisição ergonômica da espada

- [x] Puxão à distância encaixa a espada pelo punho com a lâmina ereta.
- [x] Retirada da bolsa usa a mesma pose inicial previsível.
- [x] Pegada direta próxima continua livre em qualquer trecho e ângulo.
- [x] Segunda mão e transferência de autoridade continuam disponíveis após o encaixe.
- [ ] Homologar a pose vertical inicial nas duas mãos no Meta Quest.

### D3.3.3 — Correção dos eixos de empunhadura

- [x] Espada mantém o comprimento ereto e gira o fio 90° para a frente.
- [x] Escudo fica paralelo às costas da mão em vez de perpendicular ao punho.
- [x] Alça do escudo segue o eixo punho–dedos.
- [x] Pegada livre direta e manipulação bimanual da espada permanecem inalteradas.
- [ ] Homologar os dois eixos corrigidos no Meta Quest.

### D3.3.4 — Apoio lateral do escudo no Quest

- [x] Remover apoio incorreto no eixo superior do controle.
- [x] Espelhar a pose para o lado externo da mão esquerda e da mão direita.
- [x] Manter o disco centrado na alça sem ocupar a visão acima do punho.
- [x] Alinhar a alça no sentido punho–dedos em ambas as mãos.
- [ ] Homologar distância lateral final no Meta Quest.

### D3.3.5 — Inversão final do lado de apoio

- [x] Inverter somente o sinal lateral das poses esquerda e direita.
- [x] Preservar distância da mão, eixo da alça e comportamento de bloqueio.
- [ ] Homologar o lado corrigido no Meta Quest.

### D3.4.1 — Arco ambidestro e flecha física

- [x] Arco procedural pode ser puxado, segurado, solto, guardado e recuperado por qualquer mão.
- [x] Mão oposta encaixa uma flecha ao agarrar a corda dentro de uma área confortável.
- [x] Potência considera somente a distância puxada para trás, limitada entre 8 e 68 cm.
- [x] Velocidade varia de 4,5 a 27 m/s; disparos fracos voam, mas não causam dano.
- [x] Corda, flecha encaixada e feedback háptico acompanham a tensão em tempo real.
- [x] Flechas usam gravidade, trajetória varrida e podem atingir alvo, boneco ou Guardião.
- [x] Flechas permanecem cravadas temporariamente e retornam a um pool de oito projéteis.
- [x] Desktop usa `K`: segurar tensiona e soltar dispara.
- [x] Reinício limpa corda, flechas, potência, contagem e estados de mão.
- [ ] Homologar alcance da corda, abertura máxima, direção e conforto nas duas mãos no Meta Quest.

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

- [x] Tremor rápido não supera golpe deliberado.
- [x] Um swing não causa dano por frame.
- [ ] Escudo só bloqueia pelo lado e ângulo válidos.
- [ ] Parry depende de janela, não de contato permanente.
- [ ] Arma nunca fica presa permanentemente no cenário.
- [x] Reinício limpa contagem de golpes, efeitos, timers, pegadas e sockets.

## 7. D4 — Primeiro inimigo completo

### D4.1 — Blockout e inteligência de locomoção

- [x] Guardião Ossário procedural possui hierarquia corporal preparada para animação.
- [x] Estados idle, patrulha, alerta, perseguição e retorno são explícitos e reiniciáveis.
- [x] Percepção usa alcance, atraso de reação e distância maior para perder o jogador.
- [x] Patrulha percorre rota reproduzível no setor direito da sala.
- [x] Movimento reutiliza os colliders precisos e testa desvios locais alternativos.
- [x] Jogador e itens não atravessam o collider dinâmico do Guardião.
- [x] Anel e HUD comunicam estado e distância sem painel grande dentro do VR.
- [ ] Homologar velocidade, alcance de percepção e conforto da perseguição no Meta Quest.

O blockout D4.1 estabeleceu a locomoção sem ataques; a fatia seguinte conecta essa base ao primeiro ciclo de combate.

### D4.2 — Primeiro ataque corpo a corpo

- [x] Guardião recebe uma maça procedural presa à hierarquia do braço direito.
- [x] Golpe parte acima do ombro, desce sobre o jogador e cruza para o centro com rotação coordenada do tronco.
- [x] Ciclo explícito de preparo, golpe, recuperação e prontidão reinicia somente dentro do alcance.
- [x] Ponta da maça usa trajetória varrida para não atravessar escudo ou jogador entre frames.
- [x] Face e área válidas do escudo interrompem o golpe com áudio e resposta háptica próprios.
- [x] Erro de defesa causa dano não letal e cada ciclo resolve no máximo uma vez.
- [x] Treino de projétil estático é suspenso enquanto o Guardião está em alerta ou perseguição.
- [x] HUD mostra fase do ataque, defesas e golpes recebidos.
- [ ] Homologar alcance, ritmo, arco e conforto do golpe no Meta Quest.

A D4.2 fechou o primeiro ciclo ofensivo e abriu caminho para tornar o Guardião derrotável na fatia seguinte.

### D4.3 — Vida, stagger, morte e recompensa

- [x] Guardião possui quatro pontos de vida exibidos no HUD.
- [x] Trajetória varrida da espada atinge o volume corporal móvel do inimigo.
- [x] Cada golpe aceito interrompe o ataque, produz feedback e aplica stagger curto.
- [x] Cooldown impede que um único arco da espada cause múltiplos danos.
- [x] Último golpe derruba o corpo e remove o collider dinâmico.
- [x] Morte libera exatamente uma Runa da Memória física.
- [x] Runa compartilha puxão distante, física, recuperação e os seis slots da bolsa.
- [ ] Homologar alcance da espada, duração do stagger e leitura da queda no Meta Quest.

### D4.4 — Visual FULL IA

- [x] Concept aprovado do Guardião Ossário.
- [x] Candidato v1 e turnaround técnico gerados, versionados e aprovados.
- [x] Candidato de malha modular v1 exportado em GLB e validado automaticamente.
- [ ] Modelo 3D gerado por IA.
- [ ] Texturas próprias.
- [x] Rig humanoide `humanoid_large_v1` com 31 ossos, clavículas e juntas articuladas, skinning e sockets.
- [x] Idle e caminhada incorporados aos dois GLBs.
- [x] Ataque descendente, stagger e morte incorporados aos dois GLBs.
- [x] Dois níveis de detalhe candidatos para o Quest (4.498 e 1.886 triângulos).
- [ ] Substituição do blockout sem alterar gameplay.

O gate desta entrega é visual e técnico: o inimigo final deve conservar percepção, locomoção, hitboxes, ataque, dano, stagger, morte e recompensa já validados. A segunda variação de ataque fica para uma etapa posterior de refinamento do combate.

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

### D5.1 — Primeiro passe de materiais da cripta

- [x] Gerar fontes FULL IA próprias para parede, piso e bronze envelhecido.
- [x] Versionar prompts, fontes e pipeline reproduzível de pós-processamento.
- [x] Produzir albedo e normal maps repetíveis em 512×512 para o Meta Quest.
- [x] Aplicar escala física distinta a piso, paredes e estruturas do blockout.
- [x] Projetar UVs por dimensões reais em cada face, incluindo tampas e laterais cilíndricas, sem alongamento por objeto.
- [x] Remover a grade visual da fundação sem alterar colisores ou navegação.
- [x] Limitar o pacote servido a menos de 900 KB e validar dimensões e bordas automaticamente.
- [ ] Homologar legibilidade, repetição e intensidade dos normals dentro do Meta Quest.

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

As etapas ativas são **D3.4.1 — Arco ambidestro**, aguardando homologação física no Quest, **D4.4 — Visual FULL IA**, com o conjunto de animações do Guardião pronto para integração, e **D5.1 — Materiais da cripta**, com o primeiro kit aplicado. Segundo ataque, parry, stamina, aljava manual e munições especiais permanecem para rodadas posteriores de refinamento.

## 14. Registro de andamento

| Entrega | Estado | Evidência |
| --- | --- | --- |
| D0 — Fundação | Concluída | `game/`; testes, lint, build e HTTP 200 em 24/08/2026 |
| D1 — Mãos e objeto | Concluída | Grab, handoff, arremesso, alvo, recuperação e homologação inicial no Quest |
| D2 — Bolsa e itens | Concluída | Bolsa 3×2, categorias, poção consumível, chave, recuperação e vida no pulso |
| D3 — Combate estático | Em andamento | D3.4.1: arco ambidestro, corda elástica e flecha física |
| D4 — Primeiro inimigo | Em andamento | D4.4: concept aprovado e candidato GLB com dois LODs em inspeção |
| D5 — Sala completa | Em andamento | D5.1: primeiro kit FULL IA de pedra, piso e bronze aplicado |
| D6 — Micro-expedição | Não iniciada | — |
| D7 — Quest e conforto | Não iniciada | — |
| D8 — Co-op 2P | Não iniciada | — |
