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