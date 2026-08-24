# Open Dungeon VR — benchmark e lições de referência

- **Pesquisa atualizada em:** 24 de agosto de 2026
- **Referências externas centrais:** *Dungeons of Eternity* e *Pixel Dungeon VR*
- **Referências internas:** `f-zone-vr` e `aurora-wilds-VR`

Este documento separa fatos observados, feedback de jogadores e decisões próprias. Comentários de comunidade são sinais qualitativos, não estatísticas universais.

## 1. Dungeons of Eternity

### O que faz bem

- O combate físico aceita estilos diferentes: espadas, maças, adagas, escudos, arcos, cajados e machados arremessáveis e recuperáveis. Bloqueio e parry são fáceis de compreender.
- A cooperação aparece dentro do mundo: reviver aliados, dividir a leitura do espaço, cobrir ângulos e consultar um mapa físico colocado no chão.
- Pequenas interações — abrir portas, usar chaves, puxar alavancas, carregar tochas e atrair itens — aumentam presença sem exigir simulação excessiva.
- Runs procedurais, loot persistente e perks dão um motivo imediato para repetir.
- O jogo é tratado como produto completo, não como demonstração de tecnologia: carregamento rápido, matchmaking, cross-play, suporte sentado e boa estabilidade aparecem de forma recorrente nas avaliações.
- O fracasso é tolerável: revives e ausência de perda severa deixam o grupo experimentar armas e estratégias.

### Onde perde força

- A narrativa é quase inexistente e não há campanha estruturada. Para parte do público, falta propósito além de entrar, lutar, saquear e voltar.
- A combinação procedural usa um conjunto reconhecível de salas; após muitas horas, o jogador aprende não só a gramática, mas os mesmos espaços.
- Portas frequentemente anunciam novas ondas. Isso torna o ritmo previsível: entrar, limpar arena, saquear, repetir.
- Alguns jogadores descrevem o combate como permissivo a ataques rápidos ou ao ciclo avançar–golpear–recuar, com pouco incentivo contínuo para postura, alvo anatômico ou leitura de ataque.
- Inventário e blueprints crescem sem filtros, busca ou ordenação suficientes. A abundância de loot vira custo administrativo.
- Não há troca direta de equipamento entre aliados, uma oportunidade perdida em um jogo social baseado em loot.
- Conteúdo procedural não substitui variedade estrutural, narrativa, objetivos e inimigos. “Nenhuma run igual” não garante que as runs pareçam diferentes.

### Regra derivada para Open Dungeon VR

Usar a fisicalidade e a fricção social baixa como padrão de qualidade, mas gerar **situações**, não somente corredores. Toda expedição precisa combinar objetivo, topologia, facção, evento e consequência persistente. Combate deve premiar tempo, direção e posicionamento sem exigir força física real.

## 2. Pixel Dungeon VR

### O que faz bem

- A arte voxel possui silhuetas claras e mantém desempenho sólido no Quest 3; legibilidade vale mais que complexidade técnica.
- Runs de aproximadamente 15–20 minutos atendem tanto sessões curtas quanto noites de co-op.
- Armas à distância têm gestos satisfatórios: a besta exige recarga manual, enquanto arco e magia respondem bem.
- O multiplayer foi descrito como estável e fácil de preencher; voz integrada e grupos ampliam o apelo social.
- Upgrades de arma, reroll de perks e árvore de talentos tornam o ganho entre runs visível.
- O modelo em que um dono pode hospedar amigos sem o jogo completo reduz a maior barreira de um título VR co-op: formar o grupo.
- Três temas de dungeon, segredos, armadilhas verticais e bosses em múltiplas fases criam bons picos de sessão.

### Onde perde força

- Melee foi descrito como fraco ou flutuante em comparação com opções de distância; spam rápido pode superar golpes deliberados.
- As builds convergem porque todos eventualmente completam a mesma árvore e não havia reset de pontos na avaliação de lançamento.
- Dificuldades mais altas foram criticadas por escalar principalmente vida e dano, sem transformar suficientemente IA, composição ou objetivos.
- O lançamento oferecia opções de conforto limitadas para um jogo com quedas inesperadas, escadas, cordas e verticalidade.
- Música padrão alta atrapalhava o voice chat.
- Feedback posterior questiona profundidade de endgame, administração de lobbies, expulsão de jogadores reincidentes e separação etária/social.
- Roadmap e comunicação inconsistentes criaram incerteza sobre o futuro do produto; conteúdo e monetização precisam de previsibilidade.

### Regra derivada para Open Dungeon VR

Adotar arte estilizada de alto contraste, sessões compactas e manipulação física de armas. Não adotar progressão linear universal, dificuldade por inflação numérica, verticalidade sem proteção de conforto ou lobby sem ferramentas de moderação.

## 3. Lições dos protótipos locais

### f-zone-vr

- O headset é plataforma principal: entrar em VR deve permitir completar menu, partida, resultado e próxima ação sem encerrar a sessão XR.
- A cabeça controla o olhar; o mundo e o avatar comunicam movimento sem arrastar a câmera.
- HUD deve pertencer ao corpo ou ao mundo, ficar abaixo da linha de horizonte e manter o centro livre.
- Raycast de ambos os controles, navegação por analógico e feedback háptico formam redundância saudável.
- Estado transitório deve ser reiniciado por uma rotina central; efeitos, armas, projéteis e timers não podem vazar entre runs.
- Desempenho precisa ser medido no Quest: reduzir alocação por frame, luzes dinâmicas, transparências e frequência de HUD.
- Testes automáticos não substituem uma run completa no headset.

### aurora-wilds-VR

- Seed e coordenada precisam determinar conteúdo. Sub-seeds por domínio impedem que alterar decoração reorganize inimigos ou loot.
- Um único loop possui a simulação; UI envia intenção e não executa regras.
- Gameplay determinístico deve ser testável sem WebGL, DOM ou física.
- Instancing, compartilhamento de materiais e streaming correto são obrigatórios para densidade no navegador.
- Arte estilizada deve preservar contraste, especialmente em dungeons: escuro não pode significar ilegível.
- Combate precisa de preparação, impacto único e recuperação; dano contínuo por frame gera múltiplos acertos acidentais.
- Para multiplayer, simulação usa tick fixo e apresentação pode continuar com delta variável.
- `engine.ts` monolítica foi aceitável para provar o MVP, mas não deve ser copiada para um projeto maior.

## 4. Matriz de decisão

| Tema | Manter | Corrigir no novo jogo | Critério verificável |
| --- | --- | --- | --- |
| Combate físico | Bloqueio, arremesso, recarga e haptics | Spam, melee sem peso, domínio seguro de ranged | Golpes válidos dependem de arco, velocidade limitada e janela; melee recebe vantagem situacional |
| Procedural | Seed, caminhos, segredos e replay | Salas reconhecíveis e ondas em toda porta | Run combina objetivo + topologia + facção + mutador; máximo de duas arenas consecutivas |
| Co-op | 1–4 jogadores, revive e voz | Dependência total de amigos e moderação fraca | Solo completo; privado, amigos, público, mute, kick e bloqueio persistente |
| Progressão | Loot, perks e upgrades visíveis | Árvore universal e grind de números | Três especializações excludentes por expedição e respec gratuito no refúgio |
| Dificuldade | Seleção antes da run | HP/dano como principal diferença | IA, composição, hazards e economia mudam antes de aumentar HP |
| Conforto | Snap/smooth turn e modo sentado | Quedas e escalada sem alternativas | vignette, altura, teleporte de escalada, aviso de queda e redução de verticalidade |
| Interface | Objetos físicos e HUD corporal | Inventário longo sem busca | Quick slots físicos; stash 2D/VR com filtro, tipo, perk e favoritos |
| Conteúdo | Biomas e bosses | “Endless” sem propósito | Campanha de 6 capítulos + contratos repetíveis + eventos autorais |
| Monetização | Compra premium | Poder em DLC e publicidade intrusiva | DLC apenas cosmético/expansão; sem venda de stats ou anúncios no hub |

## 5. Fontes externas

### Primárias

- [Dungeons of Eternity — página oficial na Steam](https://store.steampowered.com/app/3189340/Dungeons_of_Eternity/): co-op para até quatro jogadores, combate, salas aleatórias e modos.
- [Pixel Dungeon VR — página oficial na Steam](https://store.steampowered.com/app/3063750/Pixel_Dungeon_VR/): co-op, lobbies sociais, armas, bosses e modelo de acesso para convidados.
- [Pixel Dungeon VR — site oficial](https://pixeldungeonvr.com/): mapas, dificuldades, monstros, armas, avatares, geração dinâmica e crafting.

### Avaliações editoriais

- [UploadVR — Dungeons of Eternity Review](https://www.uploadvr.com/dungeons-of-eternity-review/): combate, co-op, mapa físico, interações, progressão e narrativa mínima.
- [UploadVR — Dungeons of Eternity no PC VR](https://www.uploadvr.com/dungeons-of-eternity-pc-vr-impressions/): estado posterior, quatro jogadores, cross-play/cross-save e limitações de grip.
- [UploadVR — Pixel Dungeon Review](https://www.uploadvr.com/pixel-dungeon-review/): duração das runs, desempenho, combate, progressão, multiplayer e conforto.
- [UploadVR — Pixel Dungeon Early Access Impressions](https://www.uploadvr.com/pixel-dungeon-vr-impressions/): combate flutuante, branding e ausência de roadmap definido no período avaliado.

### Feedback de comunidade

- [Avaliações de Dungeons of Eternity na Steam](https://steamcommunity.com/app/3189340/reviews/?browsefilter=toprated): elogios a combate, estabilidade e co-op; críticas a repetição, campanha, inventário e troca.
- [Avaliações de Pixel Dungeon VR na Steam](https://steamcommunity.com/app/3063750/reviews/?browsefilter=toprated&l=english): sinais sobre spam, equilíbrio ranged/melee, dificuldade, endgame, lobbies e comunicação.

