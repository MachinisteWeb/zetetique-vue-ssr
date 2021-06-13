/* jshint node: true */
var fs = require('fs');

function getCard(locals, params, next) {
	var file = {
		'cafe-critique': 'resources',
		'mon-cerveau-et-moi': 'resources',
		'a-qui-tu-causes': 'resources',
		'le-mot-du-jour': 'resources',
		'hygiene-mentale': 'initiations',
		'methode-z': 'initiations',
		'minute-sapiens': 'initiations',
		'vite-fait': 'initiations',
		'science-clic': 'initiations'
	};

	locals.global = locals.global || {};

	fs.readFile('../data/zetetique/variations/fr-fr/' + file[params.category] + '.json', 'utf-8', function (error, result) {

		var data,
			choices = {
				'cafe-critique': 'cafe',
				'mon-cerveau-et-moi': 'brain',
				'a-qui-tu-causes': 'speak',
				'le-mot-du-jour': 'word',
				'hygiene-mentale': 'hygienementale',
				'methode-z': 'methodez',
				'minute-sapiens': 'minutesapiens',
				'vite-fait': 'vitefait',
				'science-clic': 'scienceclic'
			};
			group = choices[params.category];


		if (error) {
			console.log(error);
		}

		data = JSON.parse(result);

		locals.global.card = {};

		for (var i = 0; i < data.body[group].cards.length; i++) {
			if (data.body[group].cards[i].slug === params.slug) {
				locals.global.card = data.body[group].cards[i];
			}
		}

		next(locals);
	});
}

exports.changeVariations = function (next, locals) {
	getCard(locals, locals.params, function (locals) {
		var choices = {
			'cafe-critique': 'Café critique',
			'mon-cerveau-et-moi': 'Mon Cerveau et Moi',
			'a-qui-tu-causes': 'À Qui tu Causes ?',
			'le-mot-du-jour': 'Le Mot du Jour',
			'hygiene-mentale': 'Hygiene Mentale',
			'methode-z': 'Méthode Z',
			'minute-sapiens': 'Minute Sapiens',
			'vite-fait': 'Vite Fait',
			'science-clic': 'ScienceClic'
		};

		locals.specific.meta.title = locals.global.card.title + ' — ' + locals.global.card.number + ' | ' + choices[locals.params.category];
		locals.specific.meta.image = /*'https://images.weserv.nl/?url=' + encodeURIComponent(*/locals.global.card.image/*.replace(/https:\/\//g, ''))*/;
		locals.specific.meta.description = locals.global.card.description;
		next(locals);
	});
};

exports.setSockets = function () {
	var NA = this,
		io = NA.io;

	io.on('connection', function (socket) {
		socket.on('page-card--iframe', function (slug, category) {
			getCard({}, {
				slug: slug,
				category: category
			}, function (locals) {
				socket.emit('page-card--iframe', locals.global.card);
			});
		});
	});
};