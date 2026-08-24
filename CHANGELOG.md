# Changelog

Todas as mudanças relevantes do Open Dungeon VR serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adotará versionamento semântico quando o repositório Git estiver configurado.

## [Não publicado]

### Adicionado

- Build estático dedicado ao GitHub Pages, preservando o runtime Vinext usado localmente.
- Workflow de validação e publicação automática da branch `main`.
- Documentação da URL HTTPS para testes no Meta Quest.

### Planejado

- Homologação prolongada da D1 no Quest.
- D2 — Bolsa da aventura.

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
