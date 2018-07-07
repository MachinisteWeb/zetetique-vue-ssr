exports.changeDom = function (next, locals, request, response) {
	var fs = require('fs'),
		gm = require('gm'),
		http = require('http'),
		https = require('https');

	http.get('http://menace-theoriste.fr/wp-content/uploads/2018/06/Miniature-COSMOS-1030x580.jpg', function (res) {
		var data = '';

		response.setHeader("Content-Type", res.headers['content-type']);

		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {
			locals.dom = data;
			next();
		}).on("error", function (error) {
			console.log(error);
		});
	});
};