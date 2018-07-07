/* jshint node: true, esversion: 6 */
/* global NA */
module.exports = function () {
	return {
		setSockets: function (vm) {
			NA.socket.emit('the-chat--init');

			NA.socket.on('the-chat--init', function (chat) {
				vm.$refs.chat.channels = chat.chatChannels;
				vm.$refs.chat.channels.sort(window.sortChannels);
				vm.$refs.chat.currentChannel = chat.currentChannel;
				vm.$refs.chat.name = chat.chatName;
				vm.$refs.chat.nameExist = chat.chatName;
				vm.$refs.chat.email = chat.chatEmail;
				vm.$refs.chat.emailExist = chat.chatEmail;
				vm.$refs.chat.phone = chat.chatPhone;
				vm.$refs.chat.phoneExist = chat.chatPhone;
			});

			NA.socket.on('the-chat--send-message', function (message, currentChannel) {
				if (currentChannel === vm.$refs.chat.currentChannel) {
					vm.$refs.chat.messages.push(message);
				}
				vm.$nextTick(() => {
					window.scrollToBottom(vm.$refs.chat);
				});
			});

			NA.socket.on('the-chat--send-name', function (name, channel) {
				vm.$refs.chat.nameExist = name;
				vm.$refs.chat.channels.forEach(function (current, index) {
					if (current.name === channel.name) {
						vm.$refs.chat.channels.splice(index, 1);
					}
				});
				vm.$refs.chat.channels.push(channel);
				vm.$refs.chat.channels.sort(window.sortChannels);
			});

			NA.socket.on('the-chat--send-email', function (email, phone) {
				vm.$refs.chat.emailExist = email;
				vm.$refs.chat.phoneExist = phone;
			});

			NA.socket.on('the-chat--send-channel', function (channel) {
				if (vm.global.chat.state) {
					vm.$refs.chat.channels.forEach(function (current, index) {
						if (current.name === channel.name) {
							vm.$refs.chat.channels.splice(index, 1);
						}
					});
					vm.$refs.chat.channels.push(channel);
					vm.$refs.chat.channels.sort(window.sortChannels);
				}
			});

			NA.socket.on('the-chat--sleep-channel', function (channel) {
				if (channel) {
					vm.$refs.chat.channels.forEach(function (current, index) {
						if (channel.name === current.name) {
							vm.$refs.chat.channels.splice(index, 1);
						}
					});
				}
				vm.$refs.chat.channels.push(channel);
				vm.$refs.chat.channels.sort(window.sortChannels);
			});

			NA.socket.on('the-chat--remove-channel', function (channel) {
				var labelChannel = channel.substring(0, 8),
					labelNextChannel;

				vm.$refs.chat.channels.forEach(function (current, index) {
					if (current.name === channel) {
						vm.$refs.chat.channels.splice(index, 1);
					}
				});
				labelNextChannel = vm.$refs.chat.channels[0].name.substring(0, 8);
				if (vm.$refs.chat.currentChannel === channel) {
					vm.common.chat.admin.removeAlert.message = window.replaceData(vm.common.chat.admin.removeAlert.message, {
						labelChannel: labelChannel,
						labelNextChannel: labelNextChannel
					});
					vm.$refs.chat.alertDeleteChannel = true;
					vm.$refs.chat.changeChannel(vm.$refs.chat.channels[0].name);
				}

				window.scrollToBottom(vm);
				vm.$refs.chat.channels.sort(window.sortChannels);
			});
		}
	};
};