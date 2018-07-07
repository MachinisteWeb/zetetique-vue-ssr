/* jshint node: true */
exports.authentication = function (email, password, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, 'data', 'users.json');

	fs.readFile(pathfile, 'utf-8', function (err, content) {
		var users = JSON.parse(content),
			found = false;

		users.forEach(function (user) {
			if (
				user.publics.email === email &&
				user.password === password
			   ) {
				found = user;
			}
		});

		if (!found) {
			return next(false);
		}

		next(found);
	});
};