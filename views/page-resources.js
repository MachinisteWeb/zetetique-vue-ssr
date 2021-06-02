/* jshint node: true */
/* global NA */
module.exports = function (template, specific, mixin, options) {

	return {
		name: 'PageResources',
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
				options: options,
				meta: specific.meta,
				specific: specific.body,
				breadcrumb: [
					specific.body.overview.main[0].key,
					specific.body.overview.main[1].key,
					specific.body.overview.main[2].key,
					specific.body.overview.main[3].key
				]
			};
		},
		watch: {
			$route: function (to, from) {
				var compare;
				if (NA.isClient) {
					if (to.meta.second !== undefined && from.meta.second !== undefined) {
						compare = to.meta.second - from.meta.second;
						this.global.routerTransition = (!isNaN(compare) && compare < 0) ? 'horizontal-slide-reversed' : 'horizontal-slide';
					}
				}
			}
		},
		methods: {
			goTo: function (to) {
				var url = this.global.webconfig.routes[to + '_' + this.global.webconfig.languageCode].url;
				return { path: url };
			}
		},
		template: template
	};
};