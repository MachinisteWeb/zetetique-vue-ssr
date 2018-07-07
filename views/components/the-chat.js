/* jshint node: true, esversion: 6 */
/* global NA, Vue */
module.exports = function (template) {
	return {
		name: 'TheChat',
		props: {
			common: {
				type: Object,
				required: true
			},
			global: {
				type: Object,
				required: true
			}
		},
		data: function () {
			return {
				messages: [],
				channels: [],
				currentChannel: undefined,
				isInit: false,
				message: '',
				enterState: true,
				alertDeleteChannel: false,
				nameExist: undefined,
				emailExist: undefined,
				phoneExist: undefined,
				name: '',
				state: undefined,
				email: undefined,
				phone: undefined,
				dates: this.common.dates
			};
		},
		computed: {
			dateLine: function () {
				return this.messages.map(message => {
					var now = new Date(message.date),
						padLeft = function (pad, str) {
							str = '' + str;
							return pad.substring(0, pad.length - str.length) + str;
						};

					return this.dates.smallDay[now.getDay()] + ' ' +
						now.getDate() + ' ' +
						this.dates.smallMonth[now.getMonth()] + ' . ' +
						now.getHours() + ':' +
						padLeft('00', now.getMinutes());
				});
			}
		},
		methods: {
			changeChannel: function (channel) {
				this.currentChannel = channel;
				NA.socket.emit('the-chat--change-channel', this.currentChannel);
				NA.socket.once('the-chat--change-channel', (messages) => {
					this.messages = messages;
					window.scrollToBottom(this);
				});
			},
			removeChannel: function (channel) {
				NA.socket.emit('the-chat--remove-channel', channel);
			},
			isMoved: function () {
				var currentStyle = getComputedStyle(this.$el);
				this.xPosition = currentStyle.left;
				this.yPosition = currentStyle.top;
			},
			toggleChat: function () {
				this.state = !this.state;

				if (!this.isInit) {
					this.isInit = true;
					NA.socket.emit('the-chat--init-message', this.currentChannel, location.href);
					NA.socket.once('the-chat--init-message', (messages, channels) => {
						this.channels = channels;
						this.channels.sort(window.sortChannels);
						this.messages = messages;
						window.scrollToBottom(this);
					});
				}

				Vue.nextTick(() => {
					window.scrollToBottom(this);
				});
			},
			sendMessage: function () {
				if (this.enterState) {
					this.message = this.message.replace(/\n|\r/g, '');
				} else {
					this.message = this.message.replace(/\n|\r/g, '<br>');
				}
				if (this.message) {
					NA.socket.emit('the-chat--send-message', this.name, this.message, this.currentChannel);
					NA.socket.once('the-chat--send-message', () => {
						window.scrollToBottom(this);
						this.message = '';
					});
				}
			},
			sendName: function () {
				this.name = this.name.replace(/\n|\r/g, '');
				if (this.name) {
					NA.socket.emit('the-chat--send-name', this.name, this.currentChannel);
				}
			},
			sendEmail: function () {
				if (this.email || this.phone) {
					NA.socket.emit('the-chat--send-email', this.email, this.phone, this.currentChannel);
				}
			}
		},
		template: template
	};
};