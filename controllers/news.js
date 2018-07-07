/* jshint node: true */
var fs = require('fs');

function getNews(locals, next) {
	locals.global = locals.global || {};

	function readableDate(date) {
		return date.toUTCString()
			.replace(/ GMT/, '')
			.replace(/Mon, /, '')
			.replace(/Tue, /, '')
			.replace(/Wed, /, '')
			.replace(/Thu, /, '')
			.replace(/Fri, /, '')
			.replace(/Sat, /, '')
			.replace(/Sun, /, '')
			.replace(/ Jan /, '/01/')
			.replace(/ Feb /, '/02/')
			.replace(/ Mar /, '/03/')
			.replace(/ Apr /, '/04/')
			.replace(/ May /, '/05/')
			.replace(/ Jun /, '/06/')
			.replace(/ Jul /, '/07/')
			.replace(/ Aug /, '/08/')
			.replace(/ Sep /, '/09/')
			.replace(/ Oct /, '/10/')
			.replace(/ Nov /, '/11/')
			.replace(/ Dec /, '/12/')
			.replace(/ /, ' à ');
	}

	fs.readFile('../data/zetetique/news.json', 'utf-8', function (error, result) {
		var data;

		if (error) {
			console.log(error);
		}

		data = JSON.parse(result);

		locals.global.news = data;

		next(locals);
	});
}

exports.changeVariations = function (next, locals) {
	getNews(locals, function (locals) {
		next(locals);
	});
};

exports.setSockets = function () {
	var NA = this,
		io = NA.io;

	io.on('connection', function (socket) {
		socket.on('page-news--content--news', function () {
			getNews({}, function (locals) {
				socket.emit('page-news--content--news', locals.global.news);
			});
		});
	});
};