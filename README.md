# NoduleCare

Aplicação web de apoio à vigilância imagiológica de nódulos pulmonares incidentais, baseada nas recomendações da Fleischner Society de 2017.

## Funcionalidades

- Caracterização por morfologia (sólido, parcialmente sólido e vidro despolido puro), dimensão e número de nódulos.
- Estratificação de risco apenas nas recomendações aplicáveis a nódulos sólidos.
- Indicação de intervalos de vigilância em mês/ano a partir da data da TC inicial.
- Identificação das limitações de aplicabilidade das recomendações.
- Calendário de seguimento e opções para copiar ou imprimir o plano.
- Ícone para ecrã principal de telemóvel e ecrã de abertura da aplicação.

## Utilização

Abrir `index.html` num navegador. O website funciona com HTML, CSS e JavaScript, sem servidor ou base de dados.

## Publicar com GitHub Pages

1. Criar um repositório público chamado `NoduleCare` na conta `joaosfcosta`.
2. Carregar **todo o conteúdo desta pasta** para a raiz do repositório, incluindo `index.html`, `icons/`, os ficheiros JavaScript e CSS.
3. No GitHub, abrir **Settings → Pages**.
4. Em **Build and deployment**, escolher **Deploy from a branch**, ramo **main** e diretoria **/(root)**; guardar.
5. Quando a publicação terminar, abrir `https://joaosfcosta.github.io/NoduleCare/`.

Para executar os testes de regressão da lógica clínica (com Node.js instalado):

```sh
node --test tests/logic.test.js
```

## Referência científica

MacMahon H, Naidich DP, Goo JM, et al. Guidelines for Management of Incidental Pulmonary Nodules Detected on CT Images: From the Fleischner Society 2017. *Radiology*. 2017;284:228–243. [doi:10.1148/radiol.2017161659](https://doi.org/10.1148/radiol.2017161659).

## Nota clínica

Esta ferramenta destina-se a apoiar decisões de profissionais de saúde. Não substitui a avaliação clínica, a comparação com exames anteriores nem a discussão multidisciplinar. Não recolhe nem transmite dados de doentes.

## Licenciamento

Este pacote não inclui uma licença de reutilização do código. A publicação pública no GitHub não equivale, por si só, à concessão de uma licença de software. A escolha de uma licença pode ser feita posteriormente pelo titular do repositório.
