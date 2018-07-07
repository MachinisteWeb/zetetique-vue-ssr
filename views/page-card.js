/* jshint node: true */
module.exports = function (template, specific, mixin, options) {
	return {
		name: 'PageCard',
		mixins: (mixin) ? [mixin] : undefined,
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
				isLoaded: false,
				options: options,
				meta: specific.meta,
				specific: specific.body
			};
		},
		computed: {
			number: function () {
				return (this.global.webconfig.params) ? this.global.webconfig.params.number : this.$route.params.number;
			},
			path: function () {
				return (this.global.webconfig.params) ? this.global.webconfig.params.category : this.$route.params.category;
			},
			category: function () {
				var choices = {
					'cafe-critique': 'Café critique',
					'mon-cerveau-et-moi': 'Mon Cerveau et Moi',
					'a-qui-tu-causes': 'À Qui tu Causes ?',
					'le-mot-du-jour': 'Le Mot du Jour'
				};
				return choices[this.path];
			}
		},
		beforeMount: function () {
			this.getCard();
		},
		beforeRouteEnter: function (to, from, next) {
			next(function (vm) {
				vm.displayIframe();
			});
		},
		beforeRouteUpdate: function (to, from, next) {
			next(function (vm) {
				vm.displayIframe();
			});
		},
		methods: {
			displayIframe: function () {
				var vm = this;

				setTimeout(function () {
					vm.isLoaded = true;

					if (vm.global.isClient) {
						document.title = vm.number + ' — ' + vm.global.card.title + ' — ' + 'Coup Critique';
					}
				}, 300);
			},
			getCard: function () {
				var vm = this,
					data = document.getElementsByClassName('page-card--iframe')[0];

				vm.$set(vm.global, 'card', {});

				if (data) {
					this.global.card = JSON.parse(data.getAttribute('data-fetch-card'));
				} else {
					NA.socket.emit('page-card--iframe', this.number, this.path);
					NA.socket.once('page-card--iframe', function (data) {
						vm.global.card = data;
					});
				}
			},
			backToSubCards: function (e) {
				this.$router.push({ path: '/fiches/' + this.path + '/' });
			},
			backToCards: function (e) {
				this.$router.push({ path: '/fiches/' + this.path + '/' });
			}
		},
		template: template
	};
};