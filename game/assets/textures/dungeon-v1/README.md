# Dungeon v1 — kit de materiais FULL IA

Primeiro passe visual da sala inicial, produzido com o gerador de imagens integrado ao Codex e pós-processado localmente para uso no Meta Quest.

## Materiais

- `stone-wall`: alvenaria ossuária verde-acinzentada para paredes e estruturas.
- `flagstone-floor`: lajes escuras de grande escala para o piso.
- `aged-bronze`: bronze martelado com pátina discreta para portal e acabamentos.

Cada fonte de 1.254 px é reduzida e espelhada em quatro quadrantes pelo script `../../../scripts/build-dungeon-textures.mjs`. Isso garante bordas matematicamente repetíveis. O script exporta albedo WebP e normal map PNG em 512×512 para limitar memória, tráfego e ruído visual no Quest.

No runtime, os UVs são projetados por escala física: pedra a cada 5 m de atlas e piso a cada 7 m. Caixas escolhem automaticamente os eixos corretos para cada face; cilindros separam laterais e tampas. Assim, o tamanho aparente dos blocos permanece consistente entre paredes de 24 m, pilares, lintéis, altares e pedestais.

## Prompts finais

### Pedra de parede

> Use case: stylized-concept. Asset type: seamless square game texture base for a Meta Quest VR dungeon wall. Aged ossuary dungeon masonry made from large irregular green-gray limestone blocks with restrained cracks, shallow mortar joints, subtle mineral stains and worn edges. Hand-painted stylized PBR albedo, grounded fantasy, production game asset, medium-frequency detail. Orthographic flat front view with completely neutral diffuse illumination. Charcoal, desaturated moss green, cold gray and slight bone-beige deposits. Tile-friendly borders, even value distribution, no focal feature, objects, bones, runes, text or watermark.

### Lajes de piso

> Use case: stylized-concept. Asset type: seamless square game texture base for a Meta Quest VR dungeon floor. Broad ancient dungeon flagstones, uneven dark slate slabs with worn corners, narrow recessed grout and extremely subtle dirt accumulation. Hand-painted stylized PBR albedo, grounded fantasy, production game asset, top-down flat view with neutral illumination. Dark blue-gray, deep green-black and muted warm gray. Large human-scale slabs, no objects, runes, text, watermark, puddles or moss clumps.

### Bronze envelhecido

> Use case: stylized-concept. Asset type: seamless square game texture base for aged dungeon bronze trims and portal metal. Hammered ancient bronze with subtle oxidized teal patina in shallow pits, long soft wear marks and restrained variation. Stylized PBR albedo, grounded fantasy, neutral illumination. Dark umber bronze, muted copper and sparse teal patina. No ornament, symbols, text, watermark, polished gold or large unique stains.

## Regeneração

```bash
npm run build:textures
```
