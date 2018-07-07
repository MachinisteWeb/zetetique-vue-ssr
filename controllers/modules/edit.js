/* jshint node: true */
exports.setSockets = function () {
	var NA = this,
		io = NA.io,
		Edit = NA.models.Edit;

	io.on('connection', function (socket) {
		var session = socket.request.session;

		socket.on('edit-global--save', function (file, body, meta) {
			file = file.replace(/page-/, '');
			if (session.user) {
				Edit.save.call(NA, file, body, meta, function () {
					socket.emit('edit-global--save');
					socket.broadcast.emit('edit-global--save', file, body, meta);
				});
			}
		});
	});
};