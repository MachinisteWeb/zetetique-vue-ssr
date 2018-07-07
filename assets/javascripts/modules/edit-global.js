/* jshint node: true */
/* global NA, Vue */
module.exports = function () {
	return {
		setBeforeRouterEnter: function (vmComponent) {
			window.nextUpdates = window.nextUpdates || {};

			var json = window.nextUpdates[vmComponent.$options.name.replace(/Page/g, '').toLowerCase()],
				i, j;

			// If a content was updated from outside tab before you go on this page.
			// Only for specific edition.
			if (json) {
				window.lockDirty = true;

				// variation `body` part update.
				for (i in json.body) {
					if (json.body.hasOwnProperty(i)) {
						Vue.set(vmComponent.specific, i, json.body[i]);
					}
				}

				// variation `meta` part update.
				for (j in json.meta) {
					if (json.meta.hasOwnProperty(j)) {
						Vue.set(vmComponent.meta, j, json.meta[j]);
					}
				}

				// If your content was updated before but not saved.
				// Message say your content is discarded.
				if (vmComponent.options.dirty) {
					vmComponent.$refs.edit.alertLostJSON = true;
					vmComponent.options.dirty = false;
				}
				window.nextUpdates[vmComponent.$options.name] = undefined;
			}
		},
		setSockets: function (vm) {
			window.nextUpdates = window.nextUpdates || {};

			NA.socket.on('edit-global--save', function (file, body, meta) {
				var currentMeta = (file === 'common') ? vm.meta : vm.$refs.router.meta,
					currentBody = (file === 'common') ? vm.common : vm.$refs.router.specific,
					currentEdit = (file === 'common') ? vm.$refs.edit : vm.$refs.router.$refs.edit,
					dirty = (file === 'common') ? vm.options.dirty : vm.$refs.router.options.dirty,
					i,
					j;

				function nextStep() {
					window.lockDirty = true;

					// variation `body` part update.
					for (i in body) {
						if (body.hasOwnProperty(i)) {
							Vue.set(currentBody, i, body[i]);
						}
					}

					// variation `meta` part update.
					for (j in meta) {
						if (meta.hasOwnProperty(j)) {
							Vue.set(currentMeta, j, meta[j]);
						}
					}

					// update for page title was not reactive.
					if (file !== 'common') {
						document.title = currentMeta.title;
					}

					if (currentEdit) {
						currentEdit.updateJSON(currentMeta, currentBody);
					}
				}

				// When a page is updated from outside tab, this part is used if
				// your current page is the same as the page which was been updated.
				if (file === 'common' || vm.$refs.router.$options.name.replace(/Page/g, '').toLowerCase() === file) {

					// If you have updated page in same time, a message say
					// your content is in conflict and invite you to update
					// yours or kept others.
					if (dirty) {
						currentEdit.confirmUpdateJSON = true;
						currentEdit.$refs.confirm.callback = function () {
							if (file === 'common') {
								vm.options.dirty = false;
							} else {
								vm.$refs.router.options.dirty = false;
							}
							nextStep();
						};

					// Case without update in same time.
					} else {
						nextStep();
					}

				// This part is used if you not currently on the page from
				// outside tab. The update will be done later.
				// See `setBeforeRouterEnter`.
				} else if (vm.$refs.router.$options.name.replace(/Page/g, '').toLowerCase() !== file) {
					window.nextUpdates[file] = {
						meta: meta,
						body: body
					};
				}
			});
		}
	};
};