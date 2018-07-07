/* globals exports */
exports.addMessage = function (user, phrase, file, special, auth, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/chat/" + file + ".json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = { messages: [] },
			message;

		if (result) {
			content = JSON.parse(result);
		}

		message = {
			user: user,
			message: phrase,
			special: special,
			auth: auth,
			date: (+new Date())
		};

		content.messages.push(message);

		fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
			next(message);
		});
	});
};

exports.changeName = function (name, file, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/chat/" + file + ".json"),
		channelfile = path.join(NA.serverPath, NA.webconfig._data, "data/channels.json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		fs.readFile(channelfile, "utf-8", function (err, chans) {
			var content = JSON.parse(result),
				channels = JSON.parse(chans),
				current;

			content.name = name;

			channels.channels.forEach(function (channel) {
				if (channel.name === file) {
					channel.user = name;
					current = channel;
				}
			});

			fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
				fs.writeFile(channelfile, JSON.stringify(channels, undefined, '	'), function () {
					next(name, current);
				});
			});
		});
	});
};

exports.changeEmail = function (email, phone, file, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/chat/" + file + ".json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = JSON.parse(result);

		content.email = email;
		content.phone = phone;

		fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
			next(email, phone);
		});
	});
};

exports.addChannel = function (session, sessions, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/channels.json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = { channels: [] },
			channel,
			isExist = false,
			isLeft;

		if (result) {
			content = JSON.parse(result);
		}

		channel = {
			name: session,
			state: true,
			date: (+new Date())
		};

		content.channels.forEach(function (chan) {
			isLeft = true;

			sessions.forEach(function (session) {
				if (session.request.sessionID === chan.name) {
					isLeft = false;
					return;
				}
			});

			if (isLeft) {
				chan.state = false;
			}

			if (chan.name === session) {
				isExist = true;
				chan.state = true;
				chan.date = (+new Date());
				channel = chan;
			}
		});

		if (!isExist) {
			content.channels.push(channel);
		}

		fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
			next(channel);
		});
	});
};

exports.removeChannel = function (session, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/channels.json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = { channels: [] };

		if (result) {
			content = JSON.parse(result);
		}

		content.channels.forEach(function (channel, index) {
			if (channel.name === session) {
				content.channels.splice(index, 1);
				return;
			}
		});

		fs.unlink(path.join(NA.webconfig._data, "data/chat/" + session + ".json"), function () {
			fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
				next();
			});
		});
	});
};

exports.sleepChannel = function (session, state, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/channels.json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = { channels: [] },
			channel;

		if (result) {
			content = JSON.parse(result);
		}

		content.channels.forEach(function (current) {
			if (current.name === session) {
				current.state = state;
				current.date = (+new Date());
				channel = current;
			}
		});

		fs.writeFile(pathfile, JSON.stringify(content, undefined, '	'), function () {
			next(channel);
		});
	});
};

exports.listChannels = function (next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/channels.json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = { channels: [] };
		if (result) {
			content = JSON.parse(result);
		}

		next(content.channels);
	});
};

exports.listMessage = function (file, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/chat/" + file + ".json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		var content = { messages: [] };
		if (result) {
			content = JSON.parse(result);
		}

		next(content.messages);
	});
};

exports.listData = function (file, next) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathfile = path.join(NA.serverPath, NA.webconfig._data, "data/chat/" + file + ".json");

	fs.readFile(pathfile, "utf-8", function (err, result) {
		next(result);
	});
};