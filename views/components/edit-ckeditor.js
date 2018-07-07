/* jshint node: true, esversion: 6 */
/* global CKEDITOR */
module.exports = function (template) {
	var inc = 0;
	return {
		name: 'EditCkeditor',
		props: {
			value: {
				type: String,
				required: true
			},
			id: {
				type: String,
				default: function () {
					return 'editor-' + (++inc);
				}
			},
			types: {
				type: String,
				default: function () {
					return 'classic';
				}
			},
			mode: {
				type: Number,
				default: function () {
					return 2;
				}
			},
			empty: {
				type: String,
				default: function () {
					return '';
				}
			},
			config: {
				type: Object,
				default: function () {
					return {};
				}
			}
		},
		computed: {
			instance: function () {
				return CKEDITOR.instances[this.id];
			}
		},
		mounted: function () {
			var config = {
				entities_latin: false,
				entities_additional: '',
				fillEmptyBlocks: false,
				enterMode: this.mode
			};

			if (this.types === 'inline') {
				CKEDITOR.inline(this.id, Object.assign({}, config, this.config));
			} else {
				CKEDITOR.replace(this.id, Object.assign({}, config, this.config));
			}
			this.instance.on('blur', () => {
				var isEmpty = this.instance.getData().replace(/^(&nbsp;)+$/g, '');
				if (!isEmpty) {
					this.instance.setData(this.empty);
				}
			});
			this.instance.on('change', () => {
				var html = this.instance.getData();
				if (html !== this.value) {
					this.$emit('input', html);
				}
			});
		},
		beforeUpdate: function () {
			if (this.value !== this.instance.getData()) {
				this.instance.setData(this.value);
			}
		},
		beforeDestroy: function () {
			if (this.instance) {
				this.instance.focusManager.blur(true);
				this.instance.removeAllListeners();
				this.instance.destroy();
				this.instance = null;
			}
		},
		template: template
	};
};