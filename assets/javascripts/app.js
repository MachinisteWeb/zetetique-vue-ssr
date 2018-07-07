/* jshint node: true, esversion: 6 */
/* global NA, ga */
module.exports = function () {
	return {
		setTracking: function () {
			var ua = document.body.getAttribute('data-ua');
			if (document.body.getAttribute('data-ua')) {
				ga('create', ua, 'auto');
			}
		},
		setHistoryLink: function (historyRouterLink) {
			Array.prototype.forEach.call(document.querySelectorAll(".textoi"), function (link) {
				link.removeEventListener("click", historyRouterLink);
				link.addEventListener("click", historyRouterLink);
			});
		},
		setBeforeRouterEnter: function (vmComponent, to) {
			var title = vmComponent.meta.title;

			if (vmComponent.meta.subtitles && vmComponent.meta.subtitles[to.name]) {
				title = vmComponent.meta.subtitles[to.name];
			}

			if (document.body.getAttribute('data-ua')) {
				ga('send', 'pageview', to.path, {
					title: title,
					location: location.href,
					page: to.path
				});
			}

			document.title = title;
		},
		setSockets: function (vm) {
			NA.socket.emit('app--init');

			NA.socket.on('app--init', function (sessionID, me) {
				vm.global.me = me;
				vm.global.sessionID = sessionID;
			});
		},
		editMode: function (vm) {
			var keys = {},
				ctrl = {};

			window.addEventListener('keydown', function (e) {
				e = e || event;
				keys[e.keyCode] = true;
				ctrl[e.keyCode] = e.ctrlKey;

				if (ctrl[83] && keys[83]) {
					e.preventDefault();
					vm.global.isEditable = !vm.global.isEditable;
				}
			});

			window.addEventListener('keyup', function (e) {
				e = e || event;
				keys[e.keyCode] = false;
				ctrl[e.keyCode] = false;
			});
		}
	};
};