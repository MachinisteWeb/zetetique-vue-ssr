/* jshint node: true */
module.exports = function (template, mixin) {
	return {
		name: 'PageBrain',
		mixins: (mixin) ? [mixin] : undefined,
		props: {
			common: {
				type: Object,
				required: true
			},
			global: {
				type: Object,
				required: true
			},
			specific: {
				type: Object,
				required: true
			},
			meta: {
				type: Object,
				required: true
			},
			routeName: {
				type: String,
				required: true
			}
		},
		beforeMount: function () {
			this.formatCards();
		},
		mounted: function () {
			setTimeout(() => {
				this.formatCards();
				console.log('test2');
			}, 1200);
		},
		watch: {
			$route: function (to, from) {
				console.log('$route');
			}
		},
		data: function () {
			return {};
		},
		computed: {
			path: function () {
				var languageCode = this.global.webconfig.languageCode;
				return this.global.webconfig.routes[this.routeName + '_' + languageCode].url;
			},
			asClass: function () {
				return {
					'as-cafe': 'cafe' === this.routeName,
					'as-brain': 'brain' === this.routeName,
					'as-speak': 'speak' === this.routeName,
					'as-word': 'word' === this.routeName
				};
			}
		},
		methods: {
			miniImage: function (image) {
				return image && image.replace(/cc-/g, 'mini-cc-').replace(/mcem-/g, 'mini-mcem-').replace(/aqtc-/g, 'mini-aqtc-').replace(/lmdj-/g, 'mini-lmdj-');
			},
			goTo: function (index) {
				if (!this.global.isEditable) {
					this.$router.push({ path: '../..' + this.path + index + '/' });
				}
			},
			formatCards: function () {
				this.$nextTick(function () {
					new Masonry('.page-cards--content--outer', {
						itemSelector: '.page-cards--content--cards--item',
						columnWidth: 10
					});
				});
			}
		},
		template: template
	};
};