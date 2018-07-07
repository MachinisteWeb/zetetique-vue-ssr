/* jshint node: true, esversion: 6 */
/* global Vue */
module.exports = function (template) {
	return {
		name: 'EditInline',
		props: {
			value: {
				type: String,
				required: true
			},
			config: {
				type: Object,
				default: function () {
					return {
						toolbar: [
							{ name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText', '-', 'Undo', 'Redo' ] },
							'/',
							{ name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
							{ name: 'insert', items: [ 'Image', 'SpecialChar' ] },
							'/',
							{ name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] }
						]
					};
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