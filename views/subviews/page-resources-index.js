/* jshint node: true */
module.exports = function (template, mixin) {
	return {
		name: 'PageResourcesIndex',
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
			}
		},
		data: function () {
			return {
				resourcesItemIndex: 0
			};
		},
		computed: {
			routeName: function () {
				return this.global.webconfig.routeName || this.$route.name;
			}
		},
		methods: {
			goTo: function (to) {
				var url = this.global.webconfig.routes[to + '_' + this.global.webconfig.languageCode].url;
				this.$router.push({ path: url });
			}
		},
		template: template
	};
};