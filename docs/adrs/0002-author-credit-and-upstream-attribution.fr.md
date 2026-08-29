---
status: accepté
date: 2026-08-24
decision-makers: Mainteneurs Alithya OSS
consulted: []
informed: []
---

# Créditer les auteurs avec AUTHORS.md et attribuer les sources amont

## Contexte et énoncé du problème

Ce dépôt maintient ses propres plugins mais redistribue également des
compétences d'agent (Agent Skills) synchronisées depuis des projets amont (par
exemple `backstage/backstage`, `likec4/likec4`, `vinzscam/backstage-skills` et
`zircote-plugins/adr`). Nous avons besoin d'un endroit clair et conventionnel
pour créditer les personnes et les organisations à l'origine du travail.

Deux préoccupations distinctes entrent en jeu : créditer les mainteneurs de ce
dépôt (paternité) et attribuer les projets amont dont les compétences sont
redistribuées ici (attribution et conformité de licence). Comment enregistrer
le crédit de manière à reconnaître à la fois les mainteneurs et les sources
amont, sans laisser entendre qu'Alithya est l'auteur du contenu synchronisé ?

## Facteurs de décision

* Suivre une convention largement reconnue, attendue par les contributeurs et
  les outils.
* Distinguer la paternité des mainteneurs du contenu amont redistribué.
* Respecter les licences des sources amont synchronisées.
* Garder la source de vérité facile à mettre à jour à mesure que de nouveaux
  plugins synchronisés sont ajoutés.

## Options envisagées

* `AUTHORS.md` pour les mainteneurs, plus une section d'attribution amont.
* Fichiers `AUTHORS`/`CONTRIBUTORS` distincts, avec un `NOTICE` pour
  l'attribution.
* S'appuyer uniquement sur l'historique git et les champs `author` de chaque
  `plugin.json`.

## Résultat de la décision

Option retenue : « `AUTHORS.md` pour les mainteneurs, plus une section
d'attribution amont », car un fichier unique et conventionnel crédite les
mainteneurs tandis qu'une section d'attribution explicite reconnaît chaque
source amont redistribuée avec son URL et sa licence — répondant à la fois aux
préoccupations de paternité et de conformité de licence avec un minimum de
maintenance.

Le fichier indique Alithya comme mainteneur et liste chaque source de
compétences amont avec l'URL de son dépôt et sa licence. Les nouveaux plugins
synchronisés ajoutent une entrée à la section d'attribution.

### Conséquences

* Bon, car le crédit et l'attribution amont résident dans un seul fichier
  conventionnel et facile à trouver.
* Bon, car cela rend explicite la conformité de licence pour les compétences
  redistribuées.
* Neutre, car la section d'attribution doit être tenue à jour lorsque des
  sources synchronisées sont ajoutées, modifiées ou supprimées.
* Mauvais, car cela duplique certaines informations déjà présentes dans le champ
  `author` de chaque `plugin.json` ; le fichier `AUTHORS.md` est considéré comme
  la source de vérité destinée aux humains pour le crédit.

### Confirmation

La conformité est confirmée par la présence d'un `AUTHORS.md` à la racine du
dépôt qui liste les mainteneurs ainsi qu'une entrée d'attribution (URL du dépôt
et licence) pour chaque source amont synchronisée.

## Avantages et inconvénients des options

### `AUTHORS.md` pour les mainteneurs, plus une section d'attribution amont

* Bon, car `AUTHORS` est une convention largement reconnue pour créditer les
  auteurs d'un projet.
* Bon, car un seul fichier couvre à la fois la paternité et l'attribution amont.
* Neutre, car cela nécessite des mises à jour manuelles lorsque les sources
  synchronisées changent.

### Fichiers `AUTHORS`/`CONTRIBUTORS` distincts, avec un `NOTICE` pour l'attribution

* Bon, car cela sépare proprement les auteurs, les contributeurs et
  l'attribution légale.
* Mauvais, car trois fichiers ajoutent une charge de maintenance
  disproportionnée pour un dépôt de cette taille.
* Mauvais, car un fichier `NOTICE` est surtout idiomatique sous Apache-2.0,
  alors que ce dépôt est sous licence MIT.

### S'appuyer uniquement sur l'historique git et les champs `author` de chaque `plugin.json`

* Bon, car cela ne nécessite aucun fichier supplémentaire.
* Mauvais, car il n'existe aucun endroit unique destiné aux humains qui crédite
  les mainteneurs.
* Mauvais, car cela n'attribue pas les sources amont redistribuées ni leurs
  licences, au risque d'une non-conformité.

## Informations complémentaires

* [Convention du fichier AUTHORS](https://en.wikipedia.org/wiki/README#Contents)
* [MADR](https://adr.github.io/madr/)
