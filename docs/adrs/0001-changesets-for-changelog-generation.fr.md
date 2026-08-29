---
status: accepté
date: 2026-08-24
decision-makers: Mainteneurs Alithya OSS
consulted: []
informed: []
---

# Utiliser Changesets pour la génération du journal des modifications

## Contexte et énoncé du problème

Le dépôt est un monorepo de plugins d'agent (Agent Plugins). Chaque plugin
porte sa propre version dans son manifeste `plugin.json` (et non dans
`package.json`), le `package.json` racine est `private`, et rien n'est publié
sur npm.

Nous souhaitons une manière cohérente et peu contraignante d'enregistrer les
changements notables et de générer un journal des modifications lisible lors des
publications. Comment gérer la génération du journal des modifications d'une
façon adaptée à un dépôt de plugins privé, non publié et à racine unique ?

## Facteurs de décision

* Faible friction pour les contributeurs lors de l'enregistrement des
  changements.
* Journal des modifications lisible, avec attribution de l'auteur et de la PR.
* Configuration et complexité d'outillage minimales.
* Adapté à un dépôt privé qui ne publie pas sur npm.
* Absence de graphe de dépendances entre plugins à gérer.

## Options envisagées

* Adopter Changesets avec une configuration minimale et adaptée.
* Adopter Changesets avec la configuration complète de `backstage/backstage`.
* Maintenir le journal des modifications manuellement.

## Résultat de la décision

Option retenue : « Adopter Changesets avec une configuration minimale et
adaptée », car elle fournit une génération automatisée et attribuée du journal
des modifications avec le moins de complexité possible, tout en correspondant à
la nature privée et à racine unique de ce dépôt.

La configuration est adaptée à ce dépôt :

* `access: restricted` — le package racine est privé et non publié.
* `baseBranch: main`.
* `changelog: @changesets/changelog-github` — liens vers l'auteur et la PR, sans
  fonction de changelog personnalisée.
* Aucune option expérimentale de dépendances pair-à-pair et aucun groupe
  `linked`, puisqu'il n'existe pas de dépendances entre plugins.

Pour l'instant, Changesets gère un unique `CHANGELOG.md` au niveau du dépôt
ainsi que la version du package racine. Les versions individuelles des
`plugin.json` restent gérées manuellement.

### Conséquences

* Bon, car les contributeurs ajoutent un changeset décrivant les changements
  visibles par l'utilisateur et les publications produisent un journal des
  modifications agrégé et attribué.
* Bon, car la configuration reste petite et compréhensible.
* Mauvais, car Changesets ne met pas à jour les versions des `plugin.json` de
  lui-même ; si un versionnage indépendant par plugin devient nécessaire, nous
  réexaminerons cette décision et introduirons des `package.json` privés par
  plugin (workspaces) ainsi qu'une étape post-version qui répercute les versions
  dans chaque `plugin.json`.

### Confirmation

La conformité est confirmée par la présence d'un `.changeset/config.json`
correspondant à la configuration décidée et par la génération d'un
`CHANGELOG.md` au niveau du dépôt lors des publications.

## Avantages et inconvénients des options

### Adopter Changesets avec une configuration minimale et adaptée

* Bon, car cela automatise la génération du journal des modifications avec
  attribution auteur/PR.
* Bon, car la configuration est petite et correspond à un dépôt privé à racine
  unique.
* Neutre, car cela ne gère qu'un journal des modifications au niveau du dépôt
  pour l'instant.
* Mauvais, car cela ne versionne pas les fichiers `plugin.json` individuels sans
  outillage supplémentaire.

### Adopter Changesets avec la configuration complète de `backstage/backstage`

* Bon, car il s'agit d'une configuration éprouvée pour un grand monorepo.
* Mauvais, car elle cible un graphe de packages npm interdépendants et publiés
  (fonction de changelog personnalisée, workspaces npm, `access: public`,
  cascade de dépendances internes) qui n'apportent aucune valeur ici.
* Mauvais, car les plugins sont versionnés via `plugin.json` et non
  `package.json`, de sorte que la plupart de ses fonctionnalités n'auraient rien
  sur quoi agir.

### Maintenir le journal des modifications manuellement

* Bon, car cela ne nécessite aucun outillage.
* Mauvais, car c'est source d'erreurs, incohérent et cela ajoute une charge de
  maintenance continue sans attribution auteur/PR.

## Informations complémentaires

* [Changesets](https://github.com/changesets/changesets)
* [MADR](https://adr.github.io/madr/)
