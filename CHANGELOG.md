# Changelog

Todas as mudanças relevantes do Open Dungeon VR serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adotará versionamento semântico quando o repositório Git estiver configurado.

## [Não publicado]

### Adicionado

- Build estático dedicado ao GitHub Pages, preservando o runtime Vinext usado localmente.
- Workflow de validação e publicação automática da branch `main`.
- Documentação da URL HTTPS para testes no Meta Quest.
- Primeiro candidato visual FULL IA do Guardião Ossário, com folha de apresentação, turnaround técnico, prompts e manifesto de proveniência.
- Concept v1 do Guardião Ossário aprovado e bloqueado como referência para modelo, materiais, rig e LODs.

### Planejado

- Homologação prolongada da D1 no Quest.
- D3 — Laboratório de combate estático.

## [0.13.0] — 2026-08-24

### Adicionado

- Quatro pontos de vida para o Guardião Ossário, expostos no HUD.
- Dano pela trajetória varrida da espada contra o volume corporal móvel do inimigo.
- Reação visual, interrupção do ataque, stagger, áudio e haptics por golpe válido.
- Queda definitiva com remoção do collider ao chegar a zero de vida.
- Runa da Memória procedural liberada uma única vez como recompensa física.
- Runa integrada a puxão distante, física, recuperação e bolsa de seis slots.

### Validado

- Testes cobrem dano unitário, derrota, recompensa única, imunidade após a morte e limites de vida.
- Suíte ampliada para 69 testes.

## [0.12.1] — 2026-08-24

### Corrigido

- Golpe da maça deixa de subir a partir de baixo e passa a descer de uma pose acima do ombro.
- Braço cruza levemente para o centro durante o impacto, em vez de permanecer rígido na lateral.
- Tronco antecipa e acompanha o golpe com uma torção curta, retornando à pose neutra na recuperação ou ao cancelar o ataque.

### Validado

- Teste geométrico confirma que a ponta da maça termina abaixo da posição de preparo.
- Suíte permanece com 66 testes.

## [0.12.0] — 2026-08-24

### Adicionado

- Maça procedural integrada ao braço direito do Guardião Ossário.
- Ciclo reproduzível de preparo, golpe, recuperação e nova prontidão.
- Trajetória varrida da cabeça da maça contra o escudo e o volume corporal do jogador.
- Bloqueio direcional com áudio, haptics e contador separado para o encontro.
- Dano não letal, contador de impactos e garantia de uma única resolução por ciclo.
- HUD com fase atual do ataque, defesas válidas e golpes recebidos.

### Alterado

- O projétil do treino estático é ocultado e pausado durante alerta ou perseguição do Guardião.

### Validado

- Testes cobrem progressão e cancelamento do ciclo, arco do braço e resolução única do contato.
- Suíte ampliada para 66 testes.

## [0.11.0] — 2026-08-24

### Adicionado

- Primeiro blockout procedural do Guardião Ossário, com hierarquia corporal separada para tronco, braços e pernas.
- Máquina de estados `idle`, patrulha, alerta, perseguição e retorno ao posto.
- Percepção por distância com intervalo de reação e histerese para evitar alternância nervosa.
- Rota de patrulha no setor direito e perseguição com desvio local entre múltiplas direções candidatas.
- Collider dinâmico do inimigo para jogador e itens, usando a mesma resolução precisa da sala.
- Animações procedurais distintas para respiração, caminhada, alerta, perseguição e retorno.
- Anel de estado e HUD com estado atual e distância do jogador.

### Validado

- Testes cobrem aquisição, atraso de percepção, perda do jogador, retorno e passo sem ultrapassar o destino.
- Revisão visual confirmou escala, posição, leitura da patrulha e ausência de erros no console.
- Suíte ampliada para 62 testes.

## [0.10.5] — 2026-08-24

### Corrigido

- Invertido o sinal lateral da pose espelhada do escudo após homologação visual no Meta Quest.
- Distância, alça, física e regras de bloqueio permanecem inalteradas.

## [0.10.4] — 2026-08-24

### Corrigido

- Pose do escudo passou do eixo vertical do controle para o eixo lateral externo real de cada mão.
- Mão esquerda e direita agora recebem rotações espelhadas, impedindo que o disco apareça como uma bandeja acima do jogador.
- Alça traseira voltou ao eixo longitudinal correto após o espelhamento.

### Validado

- Testes verificam lado externo independente para cada mão, posição da alça e impossibilidade de inversão casual.
- Suíte ampliada para 59 testes.

## [0.10.3] — 2026-08-24

### Corrigido

- Espada adquirida pelo punho gira 90° em torno do próprio comprimento: permanece ereta e passa a apontar o fio para a frente, não para o lado.
- Escudo deixa de ficar perpendicular à mão e passa a apoiar o disco sobre as costas dela.
- Alça traseira do escudo acompanha o eixo punho–dedos, coerente com a empunhadura de um escudo central.

### Validado

- Testes independentes verificam simultaneamente comprimento vertical, fio frontal, normal do escudo e coincidência entre mão e alça.
- Suíte ampliada para 58 testes.

## [0.10.2] — 2026-08-24

### Alterado

- Puxão assistido da espada e retirada da bolsa agora encaixam automaticamente no punho com a lâmina ereta.
- Pegada direta próxima continua preservando livremente o ponto e o ângulo físico escolhidos.
- Aquisição padrão deixou de herdar a rotação do suporte ou da prévia do inventário.

### Validado

- Testes confirmam alinhamento vertical determinístico e cópias independentes do offset de empunhadura.
- Suíte ampliada para 57 testes.

## [0.10.1] — 2026-08-24

### Alterado

- Escudo agora usa uma empunhadura ergonômica fixa em vez de preservar o ângulo casual do momento da coleta.
- Face decorada permanece sempre voltada para a frente do controle e a alça traseira coincide com o ponto da mão.
- Centro do disco fica ligeiramente à frente do punho, evitando interseção visual e pegadas invertidas.

### Validado

- Testes garantem alinhamento frontal, coincidência entre mão e alça e independência da orientação anterior do objeto.
- Suíte ampliada para 55 testes.

## [0.10.0] — 2026-08-24

### Adicionado

- Escudo procedural com corpo metálico, aro, boss, runa frontal, alça traseira e suporte próprio.
- Projétil de treino com anúncio visual e sonoro, trajetória reproduzível e ciclos sucessivos enquanto o escudo está equipado.
- Bloqueio espacial que valida simultaneamente a face frontal, o ângulo de chegada e o ponto de contato dentro do raio físico do escudo.
- Contadores separados para bloqueios válidos e ataques recebidos, com áudio, haptics e dano não letal.
- Escudo integrado ao puxão distante, física, recuperação e bolsa de seis slots.

### Validado

- Testes cobrem frente, verso, limite circular e rejeição de golpes rasantes.
- Revisão visual em navegador confirmou escala discreta, leitura do suporte e ausência de erros no console.
- Suíte ampliada para 52 testes.

## [0.9.0] — 2026-08-24

### Alterado

- Boneco de treinamento agora é imortal, reage indefinidamente e contabiliza todos os golpes válidos.
- Espada deixou de ser forçada para a frente do controle e preserva o ângulo relativo capturado pela mão.

### Adicionado

- Pegada livre em qualquer ponto entre o pomo e a ponta da espada.
- Segunda mão pode segurar outro ponto da arma e orientar a lâmina por alavanca espacial.
- Soltar a mão principal promove automaticamente a segunda mão, sem queda ou salto de autoridade.
- Soltar apenas a mão secundária retorna suavemente à manipulação de uma mão.

### Validado

- Testes cobrem âncora ao longo de toda a espada, separação útil da segunda mão e contagem ilimitada de golpes.
- Suíte ampliada para 47 testes.

## [0.8.0] — 2026-08-24

### Adicionado

- Ponteiros espaciais nos dois controles, com linha, cursor, hover por raycast e confirmação pelo gatilho no menu VR.
- Painel VR renderizado internamente em 2048×1440, com filtragem linear sem mipmaps e anisotropia máxima.
- Espada procedural que compartilha puxão assistido, pegada física, bolsa e recuperação dos demais itens.
- Boneco estático com três pontos de vida, hitbox corporal, reação, derrota, áudio e resposta háptica.
- Validação de golpe pela trajetória varrida da ponta, deslocamento mínimo, velocidade e cooldown.
- Equivalência desktop pela tecla `J` quando a espada está equipada e o boneco está ao alcance.

### Validado

- Testes rejeitam tremores e golpes que não cruzam a hitbox, validam arcos deliberados e limitam vida a zero.
- Suíte ampliada para 45 testes.

## [0.7.0] — 2026-08-24

### Adicionado

- Menu de pausa e conforto inteiramente espacial, visível dentro da sessão VR.
- Abertura pelo botão de menu esquerdo quando disponibilizado pelo Quest Browser.
- Clique do analógico esquerdo como fallback para plataformas que reservam o botão de menu.
- Navegação vertical, ajustes laterais e confirmação pelo gatilho.
- Ações para continuar, configurar conforto, reiniciar a sala e sair do VR.

### Validado

- Regras de detecção do botão/fallback e navegação circular cobertas por testes headless.
- Suíte ampliada para 40 testes.

## [0.6.0] — 2026-08-24

### Adicionado

- Painel de conforto antes da entrada em VR e na pausa, com postura em pé/sentado, altura da cintura e distância do inventário.
- Seleção de mão dominante: `X` na esquerda ou `A` na direita abre a bolsa.
- Modo de uma mão concentra locomoção, pegada e inventário no controle dominante.
- Recuperação de item perdido no último slot válido, com fallback para o primeiro slot livre ou pedestal.

### Validado

- Suíte ampliada para 38 testes, incluindo 100 ciclos consecutivos de armazenamento e retirada sem duplicação ou perda de autoridade.

## [0.5.1] — 2026-08-24

### Corrigido

- Frasco da poção foi reduzido para 58% do tamanho anterior no pedestal, durante o puxão e na mão.
- Raio físico e de seleção foi ajustado ao novo tamanho, enquanto a prévia já compacta do inventário foi preservada.

## [0.5.0] — 2026-08-24

### Adicionado

- Poção restauradora procedural com vidro translúcido, líquido emissivo e rolha.
- Armadilha rúnica não letal reduz uma unidade de vida ao ser atravessada.
- Indicador de três pontos de vida preso ao pulso esquerdo no modo VR.
- Gesto de beber exige proximidade da boca, inclinação do frasco e pose mantida por 0,32 s.
- Consumo cura exatamente uma unidade, remove a poção do mundo e libera seu slot.
- Tecla `G` oferece equivalência do consumo no modo desktop.

### Validado

- Testes cobrem gesto incompleto, distância, inclinação, tempo mínimo, cura máxima, dano não letal e escala da prévia no inventário.

## [0.4.1] — 2026-08-24

### Corrigido

- Prévias do cubo e da chave foram reduzidas para permanecerem com folga dentro dos próprios slots.
- Rotação completa dos itens guardados foi substituída por uma oscilação lenta de no máximo 9°, evitando invasão visual dos slots vizinhos.

## [0.4.0] — 2026-08-24

### Adicionado

- Chave de missão procedural com puxão assistido, pegada física, armazenamento e recuperação.
- Inventário comporta cubo e chave simultaneamente em slots exclusivos, escolhendo o primeiro espaço livre ao guardar pela cintura.
- Porta física no portal com fechadura, animação vertical, áudio e resposta háptica.
- Chave só ativa a fechadura quando solta dentro do socket de 38 cm.
- Hitbox da porta permanece bloqueando a passagem até a abertura visual atingir altura segura.

### Alterado

- Objetivo e HUD avançaram para D2.2, exibindo quantidade de itens guardados e estado da passagem.

## [0.3.4] — 2026-08-24

### Adicionado

- Mira assistida das mãos permite puxar o cubo de até 3,5 m sem precisar agachar ou encostar nele.
- Item percorre uma animação curta e suavizada até a mão, com duração proporcional à distância e feedback háptico ao encaixar.

### Alterado

- Soltar o gatilho durante a atração interrompe o puxão sem transformar o movimento assistido em um arremesso acidental.

## [0.3.3] — 2026-08-24

### Corrigido

- Cubo não gira mais artificialmente enquanto está segurado.
- Orientação inicial da pegada é preservada e passa a acompanhar somente a rotação real da mão ou da câmera desktop.

## [0.3.2] — 2026-08-24

### Adicionado

- Soltar um item sobre o anel da cintura agora o guarda automaticamente no primeiro slot livre.
- Botão `X` do controle esquerdo do Meta Quest abre ou fecha o inventário, com detecção por borda para não repetir enquanto estiver pressionado.

### Alterado

- Painel do inventário foi aproximado de 82 cm para 62 cm da cabeça, com escala compensada para continuar discreto e reduzir a extensão necessária do braço.

## [0.3.1] — 2026-08-24

### Alterado

- Bolsa física grande foi substituída por um portal circular discreto que só aparece com a mão próxima ao centro da cintura.
- Pressionar o gatilho no portal abre ou fecha um menu transparente estável à frente do jogador.
- Inventário visual agora possui seis slots organizados em matriz 3×2.
- Conteúdo guardado só é materializado enquanto o menu está aberto.
- Interface deixou de ocupar a lateral direita e não acompanha continuamente a direção da cabeça depois de aberta.

## [0.3.0] — 2026-08-24

### Adicionado

- Primeira fatia funcional da bolsa da aventura, presa à cintura e acompanhando a pose do jogador.
- Tampa procedural que abre quando uma mão se aproxima e fecha desativando a apresentação física do conteúdo.
- Três slots físicos com snap assistido, ghost luminoso e indicação do slot ocupado.
- Armazenamento e retirada do cubo por qualquer mão, com feedback sonoro e háptico.
- Equivalência desktop pela tecla `B` para guardar e retirar o cubo.
- Estado autoritativo garante que o cubo exista no mundo, em uma mão ou em um único slot, nunca duplicado.

### Validado

- Testes cobrem armazenamento, retirada, slot inválido e tentativa pelo socket incorreto.

## [0.2.5] — 2026-08-24

### Alterado

- Analógico direito agora gira a câmera continuamente, com velocidade proporcional à inclinação do controle.
- Snap turn de 30° foi removido do modo VR; a deadzone existente continua filtrando deriva do analógico.

## [0.2.4] — 2026-08-24

### Corrigido

- Colisão do jogador agora usa a posição mundial da câmera que pertence ao rig, em vez da câmera interna do WebXR em coordenadas de tracking.
- Origem X/Z fornecida pelo limite fixo do Quest é compensada uma única vez, posicionando a cabeça exatamente no spawn da masmorra.
- Eliminado o deslocamento acumulativo que empurrava toda a sala para fora da visão enquanto mantinha apenas as mãos visíveis.

### Validado

- Teste automatizado cobre explicitamente uma origem de limite fixo distante do ponto zero.

## [0.2.3] — 2026-08-24

### Corrigido

- Ciclo de entrada WebXR alinhado aos projetos `f-zone-vr` e `aurora-wilds-VR`, já homologados no Meta Quest.
- Origem do jogador reinicializada no evento real de início da sessão, evitando câmera XR fora da sala.
- Sessão voltou ao caminho WebXR padrão do Quest, sem forçar `layers`, e agora solicita rastreamento de mãos apenas como recurso opcional.
- Renderizador usa configuração própria para Quest, com antialiasing desativado, framebuffer reduzido e foveação alta.

### Validado

- Configuração da sessão coberta por teste automatizado e comparada com os dois projetos VR funcionais do workspace.

## [0.2.2] — 2026-08-24

### Corrigido

- Sala recalibrada para a faixa de contraste do Meta Quest, reduzindo black crush sem remover a atmosfera escura.
- Piso agora é bilateral e continua visível mesmo diante de uma referência de chão incorreta do dispositivo.
- Fog teve densidade reduzida e materiais de pedra receberam maior separação tonal.
- Iluminação hemisférica e direcional reforçada para leitura espacial no headset.

### Adicionado

- Anel de spawn e balizas rúnicas com material não iluminado, oferecendo referências inequívocas de chão, escala e posição.

## [0.2.1] — 2026-08-24

### Corrigido

- Sessão imersiva agora solicita `layers`, como exige o caminho de projection layers usado pelo `WebXRManager` atual no Meta Quest.
- Controladores WebXR agora pertencem ao rig do jogador e acompanham corretamente locomoção e snap turn.
- Tela preta ao entrar em VR causada pela configuração incompleta da sessão WebXR.

### Validado

- Opções da sessão WebXR cobertas por dois testes headless adicionais.
- Build local e build estático do GitHub Pages aprovados antes da publicação.

## [0.2.0] — 2026-08-24

### Adicionado

- Mãos procedurais associadas aos dois controladores WebXR.
- Cubo rúnico físico com pedestal, highlight de alcance, posse exclusiva e troca direta entre mãos.
- Pegar, soltar e arremessar no XR usando histórico recente de poses para calcular velocidade.
- Equivalência desktop com mira central, `E` para pegar/soltar, `F` para arremessar e `R` para recuperar.
- Alvo rúnico com detecção varrida de impacto, feedback visual, áudio procedural e haptics.
- Gravidade, quique amortecido, colisão com a sala e repouso automático do cubo.
- Recuperação automática para posição inválida ou fora da sala, além da recuperação manual.
- HUD do objetivo e estado contextual da interação.
- Cinco testes headless para autoridade, handoff, arremesso, alvo e recuperação.

### Corrigido

- Impactos rápidos não atravessam o plano do alvo entre dois frames.
- Um mesmo arremesso não pode pontuar repetidamente.
- Soltar com a mão que perdeu a posse durante um handoff não altera o objeto.

### Validado

- Quatorze testes automatizados, lint e build de produção aprovados.
- Prévia local respondeu HTTP 200 após a integração.
- Teste físico prolongado com 100 interações permanece pendente no Quest.

## [0.1.1] — 2026-08-24

### Adicionado

- Colisor cilíndrico do jogador com raio de `0,32 m`, usado tanto no desktop quanto no WebXR.
- Limites sólidos nas quatro paredes da sala.
- Hitboxes orientadas que acompanham posição, dimensão e rotação exatas dos pilares e postes do portal.
- Hitbox circular própria para o altar, sem aproximação quadrada grosseira.
- Correção do deslocamento físico do headset para impedir atravessar cenário caminhando no espaço real.
- Visualização de diagnóstico das hitboxes pela tecla `H`.
- Cinco testes headless para paredes, altar, obstáculo rotacionado, deslizamento e prevenção de tunneling.

### Corrigido

- Jogador não atravessa mais paredes, pilares, altar ou postes do portal.
- Movimento diagonal contra obstáculos preserva a componente tangencial, permitindo deslizar pela superfície.
- Deslocamentos grandes são subdivididos antes da resolução para não saltarem através de obstáculos finos.

### Validado

- Nove testes automatizados, lint e build de produção aprovados.
- Geometria visual e colisores são derivados das mesmas definições de sala para evitar desalinhamento.

## [0.1.0] — 2026-08-24

### Adicionado

- Runtime isolado em `game/` com React, TypeScript, Three.js e WebXR.
- Tela inicial de Open Dungeon VR com identidade visual própria.
- Sala 3D procedural com portal, altar, cristal, pilares, iluminação e fog.
- Movimento por teclado, gamepad e analógicos dos controles XR.
- Giro suave no desktop e snap turn de 30° no XR.
- Detecção de suporte e entrada em sessão `immersive-vr`.
- Pausa, continuação, reinício centralizado e retorno ao menu.
- Indicador de FPS e feedback de estado.
- Testes headless de delta, movimento diagonal, deadzone e orientação.
- Card social original gerado por IA.

### Corrigido

- Direção de movimento para que avançar respeite o sentido do olhar.
- Normalização diagonal para impedir bônus involuntário de velocidade.
- Deadzone dos analógicos para evitar drift.
- Uso de relógio depreciado da engine substituído pelo timestamp do próprio loop.
- Framework atualizado para a versão indicada pela auditoria de segurança.

### Validado

- Testes automatizados, lint e build de produção.
- Resposta HTTP 200 da rota inicial.
- Auditoria das dependências de runtime sem vulnerabilidades conhecidas.
- Homologação física no Quest permanece reservada para a entrega D7.

## [0.0.0] — 2026-08-24

### Adicionado

- GDD inicial.
- Benchmark de Dungeons of Eternity e Pixel Dungeon VR.
- Pipeline de produção FULL IA.
- Plano de entregas funcionais.

Os links de comparação e releases serão adicionados quando o repositório Git remoto estiver configurado.
