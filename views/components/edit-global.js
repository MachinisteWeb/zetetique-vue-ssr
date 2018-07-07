/* jshint node: true, esversion: 6 */
/* global NA, Vue, JSONEditor */
module.exports = function (template) {

	function createJson(vm) {
		var containerBody = vm.$el.getElementsByClassName('edit-global--editbox--body')[0],
			containerMeta = vm.$el.getElementsByClassName('edit-global--editbox--meta')[0];

		vm.editorMeta = new JSONEditor(containerMeta, {
			indentation: 4,
			sortObjectKeys: false,
			onChange: function () {
				var json;
				if (vm.editorMeta) {
					json = vm.editorMeta.get();
					for (var i in json) {
						if (json.hasOwnProperty(i)) {
							Vue.set(vm.meta, i, json[i]);
						}
					}
					document.title = vm.meta.title;
				}
			},
			mode: 'form',
			modes: ['form', 'text', 'tree'],
			onError: function (err) {
				alert(err.toString());
			}
		});

		vm.editorBody = new JSONEditor(containerBody, {
			indentation: 4,
			sortObjectKeys: false,
			onChange: function () {
				var json;
				if (vm.editorBody) {
					json = vm.editorBody.get();
					for (var i in json) {
						if (json.hasOwnProperty(i)) {
							Vue.set(vm.body, i, json[i]);
						}
					}
				}
			},
			mode: 'form',
			modes: ['form', 'text', 'tree'],
			onError: function (err) {
				alert(err.toString());
			}
		});

		vm.editorMeta.set(vm.meta);
		vm.editorBody.set(vm.body);
	}

	return {
		name: 'EditGlobal',
		props: {
			global: {
				type: Object,
				required: true
			},
			common: {
				type: Object,
				required: true
			},
			meta: {
				type: Object,
				required: true
			},
			body: {
				type: Object,
				required: true
			},
			current: {
				type: String,
				required: true
			},
			options: {
				type: Object,
				required: true
			},
			file: {
				type: String,
				required: true
			}
		},
		data: function () {
			return {
				tab: 'body',
				state: false,
				isInit: false,
				xPosition: 0,
				yPosition: 0,
				confirmUpdateJSON: false,
				alertLostJSON: false,
				editorBody: undefined,
				editorMeta: undefined,
				silent: false
			};
		},
		beforeUpdate: function () {
			if (!this.global.me.id) {
				this.isInit = false;
			}
		},
		methods: {
			updateJSON: function (meta, body) {
				if (this.editorMeta && this.editorBody) {
					this.editorMeta.set(meta);
					this.editorBody.set(body);
				}
			},
			save: function () {
				var file = this.file.replace(/^([A-Z])/g, function(match) {
					return match.toLowerCase();
				}).replace(/([A-Z])/g, function(match) {
					return '-' + match.toLowerCase();
				});

				NA.socket.emit('edit-global--save', file, this.body, this.meta);
				NA.socket.once('edit-global--save', () => {
					Vue.nextTick(() => {
						if (this.editorMeta) {
							this.editorMeta.destroy();
							this.editorBody.destroy();
							createJson(this);
						}
						this.options.dirty = false;
					});
				});
			},
			isMoved: function () {
				var currentStyle = getComputedStyle(this.$el);
				this.xPosition = currentStyle.left;
				this.yPosition = currentStyle.top;
			},
			toggleEdit: function () {
				var jsonEditorJS,
					jsonEditorCSS,
					min = document.getElementsByTagName('html')[0],
					currentStyle = getComputedStyle(this.$el);

				if (
					currentStyle.left === this.xPosition &&
					currentStyle.top === this.yPosition
				   ) {
					this.state = !this.state;

					if (!this.global.isInit) {
						this.global.isInit = true;
						this.isInit = true;
						jsonEditorJS = document.createElement('script');
						jsonEditorCSS = document.createElement('link');
						jsonEditorJS.async = true;
						jsonEditorJS.defer = true;
						jsonEditorJS.src = 'javascripts/vendors/jsoneditor.' + min.getAttribute('lang') + '.' + min.getAttribute('data-version') + '.min.js';
						jsonEditorCSS.href = 'stylesheets/vendors/jsoneditor.css';
						jsonEditorCSS.rel = 'stylesheet';
						jsonEditorJS.addEventListener('load', () => {
							createJson(this);
						});
						document.head.appendChild(jsonEditorCSS);
						document.body.appendChild(jsonEditorJS);
					}

					if (!this.isInit) {
						this.isInit = true;
						createJson(this);
					}
				}
			}
		},
		template: template
	};
};