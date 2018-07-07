/* jshint node: true, esversion: 6 */
module.exports = function (template) {
	return {
		name: 'PopupAlert',
		props: {
			current: {
				type: Object,
				required: true
			},
			displayed: {
				type: Boolean,
				required: true
			}
		},
		methods: {
			close: function () {
				this.$emit('close');
			}
		},
		template: template
	};
};