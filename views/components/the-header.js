/* jshint node: true */
module.exports = function (template) {
	return {
		name: 'TheHeader',
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
			}
		},
		data: function () {
			return {};
		},
		computed: {
			isClient: function () {
				return NA.isClient;
			},
			routeName: function () {
				return this.global.webconfig.routeName || this.$route.name;
			},
			name: function () {
				var languageCode = this.global.webconfig.languageCode,
					path = this.global.webconfig.routes[this.routeName + '_' + languageCode].url,
					name;

				path = '/' + (path !== '' ? path.split('/')[1] : path) + '/';

				for (const property in this.global.webconfig.routes) {
					if (this.global.webconfig.routes[property].url === path) {
			  			name = property.split('_')[0];
					}
				}

				return name;
			}
		},
		methods: {
			toggleMenu: function (e) {
				if (e.target.classList.value !== 'a') {
					this.global.navigation = !this.global.navigation;
				}
			}
		},
		template: template
	};
};