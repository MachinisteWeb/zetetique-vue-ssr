/* jshint node: true */
module.exports = function (template, specific, mixin, options) {
	return {
		name: 'PageError',
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
				specific: specific.body
			};
		},
		template: template
	};
};