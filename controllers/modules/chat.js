/* jshint node: true */
exports.setSockets = function () {
	var NA = this,
		io = NA.io,
		path = NA.modules.path,
		Chat = NA.models.Chat,
		commonFile = path.join(NA.serverPath, NA.webconfig.variationsRelativePath, NA.webconfig.languageCode, NA.webconfig.variation),
		sockets = [];

	io.on('connection', function (socket) {
		var session = socket.request.session,
			sessionID = socket.request.sessionID;

		sockets.push(socket);

		socket.on('the-chat--init', function () {
			var currentChannel = (session.currentChannel) ? session.currentChannel : sessionID,
				chatName = session.chatName,
				chatEmail = session.chatEmail,
				chatPhone = session.chatPhone;
			Chat.listChannels.call(NA, function (channels) {
				socket.emit('the-chat--init', {
					currentChannel: currentChannel,
					chatName: chatName,
					chatEmail: chatEmail,
					chatPhone: chatPhone,
					chatChannels: channels
				});
			});
		});

		socket.on('the-chat--change-state', function (state) {
			session.chatState = state;
			session.touch().save();
		});

		socket.on('the-chat--send-name', function (name, currentChannel) {
			session.chatName = name;
			session.touch().save();
			Chat.changeName.call(NA, name, currentChannel, function (name, channel) {
				io.emit('the-chat--send-name', name, channel);
				setTimeout(function () {
					var afterNameMessage;
					delete require.cache[commonFile];
					afterNameMessage = require(commonFile).meta.chat.afterName;

					Chat.addMessage.call(NA, "", afterNameMessage.replace(/%name%/g, name), currentChannel, 'message', undefined, function (message) {
						io.emit('the-chat--send-message', message, currentChannel);
					});
				}, 3000);
			});
		});

		socket.on('the-chat--send-email', function (email, phone, currentChannel) {
			session.chatEmail = email;
			session.chatPhone = phone;
			session.touch().save();
			Chat.changeEmail.call(NA, email, phone, currentChannel, function (email, phone) {
				io.emit('the-chat--send-email', email, phone);
				setTimeout(function () {
					var afterEmail;
					delete require.cache[commonFile];
					afterEmail = require(commonFile).meta.chat.afterEmail;

					Chat.addMessage.call(NA, "", afterEmail.replace(/%email%/g, email).replace(/%phone%/g, phone), currentChannel, 'message', undefined, function (message) {
						io.emit('the-chat--send-message', message, currentChannel);
					});
				}, 5000);
			});
		});

		socket.on('the-chat--sleep-channel', function (sessionID, state) {
			Chat.sleepChannel.call(NA, sessionID, state, function (channel) {
				io.emit('the-chat--sleep-channel', channel);
			});
		});

		socket.on('the-chat--init-message', function (currentChannel, url) {
			Chat.addChannel.call(NA, sessionID, sockets, function (channel) {
				Chat.listChannels.call(NA, function (channels) {
					Chat.listMessage.call(NA, currentChannel, function (messages) {
						var emailManager = NA.modules.emailManager,
							emailEnter;

						delete require.cache[commonFile];
						emailEnter = require(commonFile).meta.emails.enter;

						socket.emit('the-chat--init-message', messages, channels);
						socket.broadcast.emit('the-chat--send-channel', channel);

						if (!session.isStarted) {

							if (!session.user) {
								emailManager.sendEmail("contact@coup-critique.com",
									emailEnter.subject.replace(/%channel%/g, currentChannel.substring(0, 8)),
									emailEnter.content.replace(/%channel%/g, currentChannel.substring(0, 8)).replace(/%url%/g, url));
							}

							setTimeout(function () {
								var introduction;
								delete require.cache[commonFile];
								introduction = require(commonFile).meta.chat.introduction;

								Chat.addMessage.call(NA, "", introduction, sessionID, 'message', undefined, function (message) {
									io.emit('the-chat--send-message', message, sessionID);
								});
							}, 8000);

							setTimeout(function () {
								var askName;
								delete require.cache[commonFile];
								askName = require(commonFile).meta.chat.askName;

								Chat.addMessage.call(NA, "", askName, sessionID, 'name', undefined, function (message) {
									io.emit('the-chat--send-message', message, sessionID);
								});
							}, 16000);

							setTimeout(function () {
								var askEmail;
								delete require.cache[commonFile];
								askEmail = require(commonFile).meta.chat.askEmail;

								Chat.addMessage.call(NA, "", askEmail, sessionID, 'email', undefined, function (message) {
									io.emit('the-chat--send-message', message, sessionID);
								});
							}, 90000);
						}

						session.isStarted = true;
						session.touch().save();
					});
				});
			});
		});

		socket.on('the-chat--change-channel', function (currentChannel) {
			Chat.listMessage.call(NA, currentChannel, function (messages) {
				if (session.user) {
					session.currentChannel = currentChannel;
					session.touch().save();
					socket.emit('the-chat--change-channel', messages);
				}
			});
		});

		socket.on('the-chat--remove-channel', function (channel) {
			Chat.removeChannel.call(NA, channel, function () {
				io.emit('the-chat--remove-channel', channel);
			});
		});

		socket.on('the-chat--send-message', function (name, message, currentChannel, special) {
			var user = (session.user) ? session.user.publics.firstname : name;
			Chat.addMessage.call(NA, user, message, currentChannel, special, (session.user && session.user.publics.firstname), function (message) {
				io.emit('the-chat--send-message', message, currentChannel);
			});
		});

		socket.on('disconnect', function() {
			var index = sockets.indexOf(socket),
				removed = true,
				sessionID = socket.request.sessionID;

			sockets.splice(index, 1);
			sockets.forEach(function (item) {
				if (item.request.sessionID === sessionID) {
					removed = false;
				}
			});

			if (removed) {
				Chat.sleepChannel.call(NA, sessionID, false, function (channel) {
					var sendEmail = NA.modules.sendEmail,
						emailLeave;

						delete require.cache[commonFile];
						emailLeave = require(commonFile).meta.emails.leave;

					if (channel && !session.user) {
						Chat.listData.call(NA, channel.name, function (logs) {
							sendEmail.sendEmail("contact@coup-critique.com",
								emailLeave.subject.replace(/%channel%/g, channel.name.substring(0, 8)),
								emailLeave.content.replace(/%channel%/g, channel.name.substring(0, 8)).replace(/%logs%/g, logs));
						});
					}

					socket.broadcast.emit('the-chat--sleep-channel', channel);
				});
			}
		});
	});
};