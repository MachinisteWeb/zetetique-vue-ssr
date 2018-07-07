/* jshint node: true */
exports.setSockets = function () {
	var NA = this,
		io = NA.io,
		User = NA.models.User;

	io.on('connection', function (socket) {
		var session = socket.request.session;

		socket.on('authentication', function (data) {
			User.authentication.call(NA, data.email, data.password, function (user) {
				if (user) {
					session.user = user;
					session.touch().save();

					socket.emit('authentication', user.publics);
				} else {
					socket.emit('authentication', false);
				}
			});
		});

		socket.on('unauthentication', function () {
			session.user = undefined;
			session.touch().save();
			socket.emit('unauthentication');
		});
	});
};