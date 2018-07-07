/* jshint node: true */
exports.save = function (file, body, meta, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig.variationsRelativePath, NA.webconfig.languageCode, file + '.json');

	fs.readFile(pathfile, 'utf-8', function (err, result) {
		var content = JSON.parse(result);

		content.meta = meta;
		content.body = body;

		fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
			next();
		});
	});
};