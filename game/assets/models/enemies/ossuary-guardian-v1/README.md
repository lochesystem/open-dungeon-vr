# Guardião Ossário — candidato de modelo v1

- **Status:** candidato aguardando aprovação visual
- **Origem:** malha modular procedural dirigida pelo concept FULL IA aprovado
- **Escala:** aproximadamente 2,23 m incluindo a silhueta do crânio
- **Uso atual:** inspeção e aprovação; ainda não substitui o blockout do jogo

## Arquivos

- `ossuary-guardian-lod0.glb` — malha principal, 4.114 triângulos.
- `ossuary-guardian-lod1.glb` — versão leve, 1.654 triângulos.
- `qa-report.json` — contagem de malhas, materiais, vértices, triângulos e dimensões.
- `manifest.json` — origem, licença e estado de aprovação.
- `../../../../artifacts/guardian-model-turntable.gif` — inspeção em uma volta completa do LOD0.

As partes têm nomes semânticos e pivôs separados para cabeça, peito, quadril, braços e pernas. Essa separação preserva a leitura do concept e prepara a próxima entrega de rig; não representa o número final de draw calls do asset já unido e skinned.

Regeneração determinística:

```sh
npm run generate:guardian
```

O modelo só será marcado como aprovado depois da inspeção visual. Texturas finais, rig, skinning e animações pertencem às próximas fatias da D4.4.
