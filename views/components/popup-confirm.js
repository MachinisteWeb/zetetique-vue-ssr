/* jshint node: true, esversion: 6 */
module.exports = function (template) {
	return {
		name: 'PopupConfirm',
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
		data: function () {
			return {
				callback: undefined
			};
		},
		methods: {
			update: function () {
				this.callback();
				this.callback = undefined;
				this.$emit('close');
			},
			close: function () {
				this.$emit('close');
			}
		},
		template: template
	};
};