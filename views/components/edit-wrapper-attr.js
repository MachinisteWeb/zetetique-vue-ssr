/* jshint node: true, esversion: 6 */
module.exports = function (template) {
	return {
		name: 'EditWrapperAttr',
		props: {
			global: {
				type: Object,
				required: true
			}
		},
		template: template
	};
};