# Guardião Ossário — candidato de modelo v1

- **Status:** candidato com rig aguardando aprovação de movimento
- **Origem:** malha modular procedural dirigida pelo concept FULL IA aprovado
- **Escala:** aproximadamente 2,23 m incluindo a silhueta do crânio
- **Rig:** `humanoid_large_v1`, 25 ossos e pesos rígidos por peça modular
- **Uso atual:** inspeção de forma e movimento; ainda não substitui o blockout do jogo

## Arquivos

- `ossuary-guardian-lod0.glb` — malha principal, 4.114 triângulos, rig e animações.
- `ossuary-guardian-lod1.glb` — versão leve, 1.654 triângulos, usando o mesmo rig.
- `qa-report.json` — contagem de malhas, materiais, vértices, triângulos e dimensões.
- `manifest.json` — origem, licença e estado de aprovação.
- `../../../../artifacts/guardian-model-turntable.gif` — inspeção em uma volta completa do LOD0.
- `../../../../artifacts/guardian-rig-walk.gif` — validação visual do ciclo de caminhada.

Os GLBs incluem skinning, os clipes `idle` e `walk`, ossos nomeados para cabeça, tronco e membros, sockets nas mãos e pontos específicos para maça, runa e impactos. Como o corpo é composto por osso e placas rígidas, cada peça recebe peso integral no osso correspondente, evitando deformação de borracha nas armaduras.

Regeneração determinística:

```sh
npm run generate:guardian
```

O modelo só será marcado como aprovado depois da inspeção visual. Ataque, stagger, morte e materiais finais pertencem às próximas fatias da D4.4.
