/* jshint node: true, esversion: 6 */
/* global Vue */
module.exports = function (template) {
	return {
		name: 'EditBlock',
		props: {
			value: {
				type: String,
				required: true
			},
			config: {
				type: Object,
				default: function () {
					return {};
				}
			},
			global: {
				type: Object,
				required: true
			},
			empty: {
				type: String,
				default: function () {
					return '&nbsp;&nbsp;';
				}
			}
		},
		data: function () {
			return {
				output: undefined
			};
		},
		watch: {
			output: function () {
				Vue.nextTick(() => {
					this.$emit('input', this.output);
				});
			}
		},
		template: template
	};
};