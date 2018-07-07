/* jshint node: true */
module.exports = function (template) {
	return {
		name: 'TheNavigation',
		props: {
			common: {
				type: Object,
				required: true
			},
			global: {
				type: Object,
				required: true
			},
			meta: {
				type: Object,
				required: true
			}
		},
		data: function () {
			return {};
		},
		template: template
	};
};