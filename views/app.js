/* jshint node: true */
/* global NA */
module.exports = function (template, router, webconfig, common, specific, extra) {
	return {
		router: router,
		name: 'App',
		data: {
			meta: common.meta,
			common: common.body,
			specific: specific.body,
			global: Object.assign({}, extra, {
				routerTransition: 'vertical-slide',
				isEditable: false,
				isClient: false,
				isWaiting: true,
				navigation: false,
				webconfig: webconfig,
				me: {},
				sessionID: ''
			}),
			options: {
				dirty: false,
				global: true,
				isLoaded: false
			}
		},
		watch: {
			$route: function (to, from) {
				var compare;
				if (NA.isClient) {
					if (to.meta.second === undefined || from.meta.second === undefined) {
						compare = to.meta.first - from.meta.first;
						this.global.routerTransition = (!isNaN(compare) && compare < 0) ? 'vertical-slide-reversed' : 'vertical-slide';
					}
				}
			}
		},
		template: template
	};
};