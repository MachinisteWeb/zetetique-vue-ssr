/* jshint esversion: 6 */
/* global Vue, VueRouter, CKEDITOR */

// If path not ending by `/`, redirect to the correct path.
if (window.location.pathname.slice(-1) !== '/') {
	window.location = window.location.pathname + '/';
}

var version = document.getElementsByTagName("html")[0].getAttribute('data-version'),
	popupCookieConsent,
	cookiesInformations = document.body;

// Allow CommonJS modules way to work.
window.module = {};

// Manage cookie law by provide a popup
window.cookieconsent.initialise({
	"content": {
		"message": cookiesInformations.getAttribute('data-cookie-message'),
		"dismiss": cookiesInformations.getAttribute('data-cookie-dismiss'),
		"link": cookiesInformations.getAttribute('data-cookie-link'),
		"href": cookiesInformations.getAttribute('data-cookie-href')
	}
}, function (popup) {
	popupCookieConsent = popup;
});

// Parameter the CKEditor that allow edition
CKEDITOR.stylesSet.add('website', [
	{ name: 'Contenu Centré', element: 'p', attributes: { 'class': 'text-center' } },
	{ name: 'Contenu Justifié', element: 'p', attributes: { 'class': 'text-justify' } },
]);
CKEDITOR.config.stylesSet = 'website';

// Do XHRHttpRequest
function xhr(url) {
	return new Promise(function (resolve, reject) {
		var request = new XMLHttpRequest(),
			type = url.match(/\.(js(on)?|html?)$/g, '$0')[0];

		request.addEventListener("load", function () {
			if (request.status < 200 && request.status >= 400) {
				reject(new Error("We reached our target server, but it returned an error."));
			}

			if (type === '.js') {
				resolve(eval(request.responseText));
			} else if (type === '.json') {
				resolve(JSON.parse(request.responseText));
			} else {
				resolve(request.responseText);
			}

		});

		request.addEventListener("error", function () {
			reject(new Error("There was a connection error of some sort."));
		});

		request.open("GET", location.origin + '/' + url, true);
		request.send();
	});
}

// Start the Hydratation and front-end mechanisms.
Promise.all([
	xhr('variations/common.json'),
	xhr('javascripts/bundle.' + version + '.js')
]).then(function (results) {
	var common = results[0],
		files = eval(results[1]),
		webconfig = {
			urlRootPath: document.getElementsByTagName('body')[0].getAttribute('data-url-root-path'),
			routes: JSON.parse(files.routes),
			languageCode: document.getElementsByTagName('html')[0].getAttribute('lang')
		},
		app = {
			view: files.appView,
			model: eval(files.appModel),
			module: eval(files.appModule)()
		},
		modules = {},
		keys = Object.keys(webconfig.routes),
		routes = [],
		mixin,
		router,
		vm,
		historyRouterLink = function (e) {
			var url;

			if (e.target.href) {
				url = e.target.href.replace(location.origin, '');

				if (url[0] === '/') {
					e.preventDefault();
					if (!vm.global.isEditable) {
						router.push({ path: url });
					}
				}
			}
		};

	files.names.forEach(function (name, i) {
		Vue.component(name, eval(files.models[i])(files.views[i]));
		if (files.modules[i]) {
			modules[name] = eval(files.modules[i])();
		}
	});

	// Prepare the behavior sharing by all Route components.
	mixin = function (unactive) {
		return {
			watch: {
				common: {
					handler: function() {
						var active = document.activeElement.getAttribute('class');
						if (window.lockDirty) {
							window.lockDirty = false;
						} else {
							vm.options.dirty = true;
						}
						if (active && active.indexOf('cke') !== -1) {
							vm.$refs.edit.updateJSON(vm.meta, vm.common);
						}
					},
					deep: true
				},
				specific: {
					handler: function() {
						var active = document.activeElement.getAttribute('class');
						if (window.lockDirty) {
							window.lockDirty = false;
						} else {
							vm.$refs.router.options.dirty = true;
							//this.options.dirty = true;
						}
						if (active && active.indexOf('cke') !== -1) {
							vm.$refs.router.$refs.edit.updateJSON(vm.$refs.router.meta, vm.$refs.router.specific);
						}
						this.$emit('specific', this.specific);
					},
					deep: true
				}
			},
			beforeRouteEnter: function (to, from, next) {
				next(function (vmComponent) {
					app.module.setHistoryLink(historyRouterLink);

					if (unactive) {
						app.module.setBeforeRouterEnter(vmComponent, to);
						modules['edit-global'].setBeforeRouterEnter(vmComponent);
						modules['the-navigation'].setBeforeRouterEnter(vm);
					}

					vm.global.isWaiting = false;
				});
			},
			mounted: function () {
				this.$emit('specific', this.specific);
			},
			beforeRouteLeave: function (to, from, next) {
				vm.global.isWaiting = true;
				popupCookieConsent.setStatus(window.cookieconsent.status.allow);
				popupCookieConsent.close();
				next();
			}
		};
	};

	window.replaceData = function (source, replacement) {
		var parsed = parseHTML(source);

		function parseHTML(htmlString) {
			var body = document.implementation.createHTMLDocument().body;
			body.innerHTML = htmlString;
			return body.childNodes;
		}

		Array.prototype.forEach.call(parsed[0].querySelectorAll("[data-replace]"), function (item) {
			item.innerHTML = replacement[item.getAttribute('data-replace')];
		});

		return parsed[0].outerHTML;
	};

	window.scrollToBottom = function (vm) {
		var area = document.getElementsByClassName("the-chat--messagebox")[0];
		if (area && vm.state) {
			Vue.nextTick(function () {
				area.scrollTop = area.scrollHeight;
			});
		}
	};

	window.sortChannels = function (a, b) {
		return (a && a.name) > (b && b.name);
	};

	// Create the app tree.
	keys.filter(function (key) {

		// Remove all child paths.
		return !webconfig.routes[key]._parent;
	}).forEach(function (key, i) {

		// Create all first level route...
		var route = {},
			name = key.split('_')[0],
			view = webconfig.routes[key].view,
			variation = webconfig.routes[key].variation,
			_children = webconfig.routes[key]._children,
			model,
			specific,
			template,
			options;

		// ...by adding a route
		route.name = name;
		route.path = webconfig.routes[key].url;
		route.meta = { first: (function (i) {
			return i;
		})(i) };

		// ...by precise a component
		route.component = function (resolve) {
			Promise.all([
				xhr('views-models/' + view + '.js'),
				xhr('variations/' + variation),
				xhr('views-models/' + view + '.htm')
			]).then(function (files) {
				model = files[0];
				specific = files[1];
				template = files[2];
				options = {
					dirty: false
				};

				resolve(eval(model)(template, specific, mixin(!webconfig.routes[key]._children), options));
			});
		};

		// console.log(route)

		// ...and pass some props
		route.props = ['common', 'global'];

		// ...and pass all first-level children components
		if (_children) {
			route.children = [];

			_children.forEach(function (child, j) {
				var current = (child.key) ? webconfig.routes[child.key] : { url: '' },
					subroute = {
						name: (child.key) ? child.key.split('_')[0] : route.name,
						path: current.url,
						//pathToRegexpOptions: { strict: true },
						meta: (function (i, j) {
							return { first: i, second: j };
						})(i, j)
					};

				route.props = ['common', 'global', 'specific'];

				subroute.component = function (resolve) {
					var name = child.view;

					Promise.all([
						xhr('views-models/subviews/' + name + '.js'),
						xhr('views-models/subviews/' + name + '.htm')
					]).then(function (files) {
						model = files[0];
						template = files[1];

						resolve(eval(model)(template, mixin(true)));
					});
				};

				// console.log(subroute)

				route.children.push(subroute);
			});

			delete route.name;
		}

		routes.push(route);
	});

	router = new VueRouter({
		mode: 'history',
		fallback: false,
		base: '/',
		routes: routes
	});

	// Allow cookie consent to use view system
	document.getElementsByClassName('cc-link')[0].addEventListener('click', function (e) {
		e.preventDefault();
		router.push({ path: e.target.getAttribute('href') });
	});

	vm = new Vue(app.model(app.view, router, webconfig, common, { body: {} }, {}));

	router.onReady(function () {
		vm.$mount('.layout');
		vm.global.isClient = true;

		app.module.setTracking();
		app.module.setSockets(vm);
		app.module.editMode(vm);
		modules['edit-global'].setSockets(vm);
		modules['the-chat'].setSockets(vm);
	});
});
