/* jshint node: true */
var fs = require('fs');

function getCard(locals, params, next) {
	locals.global = locals.global || {};

	fs.readFile('../data/zetetique/variations/fr-fr/resources.json', 'utf-8', function (error, result) {
		var data,
			choices = {
				'cafe-critique': 'cafe',
				'mon-cerveau-et-moi': 'brain',
				'a-qui-tu-causes': 'speak',
				'le-mot-du-jour': 'word'
			};
			group = choices[params.category];


		if (error) {
			console.log(error);
		}

		data = JSON.parse(result);

		locals.global.card = data.body[group].cards[+params.number - 1];

		next(locals);
	});
}

exports.changeVariations = function (next, locals) {
	getCard(locals, locals.params, function (locals) {
		var choices = {
			'cafe-critique': 'Café critique',
			'mon-cerveau-et-moi': 'Mon Cerveau et Moi',
			'a-qui-tu-causes': 'À Qui tu Causes ?',
			'le-mot-du-jour': 'Le Mot du Jour'
		};

		locals.specific.meta.title = locals.global.card.title + ' — ' + choices[locals.params.category] + ' #' + locals.global.card.number;
		locals.specific.meta.image = 'https://images.weserv.nl/?url=' + encodeURIComponent(locals.global.card.image.replace(/https:\/\//g, ''));
		locals.specific.meta.description = locals.global.card.description;
		next(locals);
	});
};

exports.setSockets = function () {
	var NA = this,
		io = NA.io;

	io.on('connection', function (socket) {
		socket.on('page-card--iframe', function (number, category) {
			getCard({}, {
				number: number,
				category: category
			}, function (locals) {
				socket.emit('page-card--iframe', locals.global.card);
			});
		});
	});
};