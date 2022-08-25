# Coup Critique Code Source

Code source du site Coup Critique en Vue + Vue Router + Vue Server Renderer + NodeAtlas (JavaScript / Node.js).

[Node.js]: https://nodejs.org/en/ "Node.js"
[NodeAtlas]: https://node-atlas.js.org/ "NodeAtlas"
[npm]: https://www.npmjs.com/ "Node Package Manager"
[Git]: https://git-scm.com/ "Git"





## Avant-propos ##

Ce dépôt contient le code source (sans les données) permettant de mettre en ligne le site web de Coup Critique. Celui-ci fonctionne avec [NodeAtlas] qui est un module [npm] tournant sous [Node.js].

Il peut servir d'inspiration pour créer d'autres sites.





## Règle de développement ##

### Flot ###

Quand vous aurez récupéré le dépôt sur votre machine, [respectez ce flot pour le versionnement](https://blog.lesieur.name/comprendre-et-utiliser-git-avec-vos-projets/).

### Conventions ###

Quand vous devrez ajouter, modifier ou supprimer du code, [respectez ces conventions](https://blog.lesieur.name/conventions-html-css-js-et-architecture-front-end/).





## Environnement de développement ##

### Installation ###

Pour modifier le site avec un rendu en temps réel, il vous faudra installer [Node.js] sur votre poste de développement ainsi que [Git] :

- [Télécharger Node.js](https://nodejs.org/en/download/)
- [Télécharger Git](https://git-scm.com/downloads)

puis récupérer le dépôt en local sur votre machine :

```bash
$ cd </path/to/workspace/>
$ git clone https://github.com/MachinisteWeb/zetetique-vue-ssr.git
```

puis initialisez la branche de développement :

```bash
git checkout develop
```

puis installer [NodeAtlas] :

```bash
$ cd zetetique-vue-ssr
$ npm install -g node-atlas
```

et les autres module [npm] dont dépend le projet dans le dossier projet :

```
$ npm install
```

puis lancez le site avec la commande :

```bash
$ node www.zetetique.local.na
```

Le site sera accessible à l'adresse suivante :

- *https://www.zetetique.local/*

Note : il vous faudra ajouter à votre liste de host que l'adresse https://www.zetetique.local/ pointe en fait sur localhost:7776.
Note 2 : le plus simple est de faire un proxy avec un serveur Apache.
