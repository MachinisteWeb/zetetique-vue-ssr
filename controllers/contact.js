/* jshint node: true */
exports.setSockets = function () {
	var NA = this,
		io = NA.io;

	io.on('connection', function (socket) {
		var emailManager = NA.modules.emailManager;

		socket.on('send', function (data) {
			var fs = NA.modules.fs,
				path = NA.modules.path,
				template = JSON.parse(fs.readFileSync(path.join(NA.serverPath, NA.webconfig.variationsRelativePath, NA.webconfig.languageCode, NA.webconfig.variation), "utf-8"));

			emailManager.sendEmail(data.email,
				template.body.contactEmail.subject.replace(/%email%/g, data.email),
				template.body.contactEmail.message.replace(/%email%/g, data.email).replace(/%message%/g, data.message),
			function (success) {
				if (success) {
					socket.emit('send', true);
				} else {
					socket.emit('send', false);
				}
			});
		});
	});
};