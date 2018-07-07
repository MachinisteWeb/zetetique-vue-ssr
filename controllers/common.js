/* jshint node: true, esversion: 6 */
function setVueComponents(NA) {
	var path = NA.modules.path,
		Vue = NA.modules.Vue,
		fs = NA.modules.fs,
		components = NA.webconfig._components,
		keys = Object.keys(components);

	keys.filter(function (name) {
		return !components[name].clientOnly;
	}).forEach(function (name) {
		var pathfile = path.join(NA.serverPath, NA.webconfig.viewsRelativePath, components[name].model);

		if (!NA.webconfig.cache) {
			delete require.cache[pathfile];
		}

		Vue.component(name, require(pathfile)(
			fs.readFileSync(path.join(NA.serverPath, NA.webconfig.viewsRelativePath, components[name].view), 'utf-8')
		));
	});
}

function openFile(NA, sourceFile, callback) {
	var fs = NA.modules.fs,
		uglifyEs = NA.modules.uglifyEs;

	if (/\.(js|htm|json)?$/g.test(sourceFile)) {
		fs.readFile(sourceFile, 'utf-8', function (err, result) {
			if (/\.js?$/g.test(sourceFile)) {
				callback(null, uglifyEs.minify(result).code);
			} else {
				callback(null, result);
			}
		});
	} else {
		callback(null, sourceFile);
	}
}

function createBundleClient(NA, callback) {
	var async = NA.modules.async,
		path = NA.modules.path,
		components = {
			'routes': path.join(NA.serverPath, 'routes.json'),
			'appView': path.join(NA.serverPath, NA.webconfig.viewsRelativePath, 'app.htm'),
			'appModel': path.join(NA.serverPath, NA.webconfig.viewsRelativePath, 'app.js'),
			'appModule': path.join(NA.serverPath, NA.webconfig.assetsRelativePath, 'javascripts/app.js'),
			'names': [],
			'views': [],
			'models': [],
			'modules': []
		},
		keys = Object.keys(NA.webconfig._components);

	keys.forEach(function (name) {
		components.names.push(name);
		components.views.push(path.join(NA.serverPath, NA.webconfig.viewsRelativePath, NA.webconfig._components[name].view));
		components.models.push(path.join(NA.serverPath, NA.webconfig.viewsRelativePath, NA.webconfig._components[name].model));
		if (NA.webconfig._components[name].module) {
			components.modules.push(path.join(NA.serverPath, NA.webconfig.assetsRelativePath, NA.webconfig._components[name].module));
		} else {
			components.modules.push('');
		}
	});

	async.parallel([function (callback) {
		openFile(NA, components.routes, function (error, result) {
			components.routes = result;
			callback(null);
		});
	}, function (callback) {
		openFile(NA, components.appView, function (error, result) {
			components.appView = result;
			callback(null);
		});
	}, function (callback) {
		openFile(NA, components.appModel, function (error, result) {
			components.appModel = result;
			callback(null);
		});
	}, function (callback) {
		openFile(NA, components.appModule, function (error, result) {
			components.appModule = result;
			callback(null);
		});
	}, function (callback) {
		async.map(components.views, function (sourceFile, callback) {
			openFile(NA, sourceFile, function (error, result) {
				callback(null, result);
			});
		}, function (error, results) {
			components.views = results;
			callback(null);
		});
	}, function (callback) {
		async.map(components.models, function (sourceFile, callback) {
			openFile(NA, sourceFile, function (error, result) {
				callback(null, result);
			});
		}, function (error, results) {
			components.models = results;
			callback(null);
		});
	}, function (callback) {
		async.map(components.modules, function (sourceFile, callback) {
			openFile(NA, sourceFile, function (error, result) {
				callback(null, result);
			});
		}, function (error, results) {
			components.modules = results;
			callback(null);
		});
	}], function () {
		callback('(function () { return ' + JSON.stringify(components) + ' })()');
	});
}

exports.setModules = function () {
	var NA = this,
		join = NA.modules.path.join,
		news = require('../modules/news.js');

	NA.webconfig._smtp = (NA.webconfig._smtp) ? require(join(NA.serverPath, NA.webconfig._data, NA.webconfig._smtp)) : undefined;
	NA.webconfig._components = require(join(NA.serverPath, NA.webconfig._components));

	NA.modules.Vue = require('vue');
	NA.modules.VueRouter = require('vue-router');
	NA.modules.VueServerRenderer = require('vue-server-renderer');

	NA.modules.nodemailer = require('nodemailer');
	NA.modules.RedisStore = require('connect-redis');

	NA.modules.emailManager = require('./modules/email-manager.js')(NA);
	NA.modules.edit = require('./modules/edit.js');
	NA.modules.chat = require('./modules/chat.js');

	NA.models = {};
	NA.models.User = require('../models/connectors/user.js');
	NA.models.Edit = require('../models/connectors/edit.js');
	NA.models.Chat = require('../models/connectors/chat.js');

	NA.modules.Vue.use(NA.modules.VueRouter);

	news();
	setInterval(function () {
		news();
	}, 1000 * 60 * 60);
};

exports.setSessions = function (next) {
	var NA = this,
		session = NA.modules.session,
		RedisStore = NA.modules.RedisStore(session);

	NA.sessionStore = new RedisStore();

	next();
};

exports.setRoutes = function (next) {
	var NA = this,
		express = NA.express,
		output;

	if (NA.webconfig.cache) {
		setVueComponents(NA);
		createBundleClient(NA, function (result) {
			output = result;
		});
	}

	express.get('/javascripts/bundle.' + NA.webconfig.version + '.js', function (request, response) {
		if (!NA.webconfig.cache) {
			createBundleClient(NA, function (result) {
				output = result;
				response.writeHead(200, { 'Content-Type': 'application/javascript', 'Charset': 'utf-8' });
				response.end(output);
			});
		} else {
			response.writeHead(200, {
				'Content-Type': 'application/javascript',
				'Charset': 'utf-8',
				'Cache-Control': 'public, max-age=2592000',
				'Last-Modified': (new Date()).toString()
			 });
			response.end(output);
		}
	});

	next();
};

exports.setSockets = function () {
	var NA = this,
		io = NA.io,
		edit = NA.modules.edit,
		chat = NA.modules.chat;

	io.on('connection', function (socket) {
		var session = socket.request.session,
			sessionID = socket.request.sessionID;

		socket.on('app--init', function () {
			var user = (session.user) ? session.user.publics : {};
				socket.emit('app--init', sessionID, user);
		});
	});

	edit.setSockets.call(NA);
	chat.setSockets.call(NA);
};

exports.changeDom = function (next, locals, request, response) {
	var NA = this,

		Vue = NA.modules.Vue,
		VueRouter = NA.modules.VueRouter,
		VueServerRenderer = NA.modules.VueServerRenderer,

		fs = NA.modules.fs,
		join = NA.modules.path.join,

		renderer = VueServerRenderer.createRenderer({
			template: locals.dom
		}),

		path = join(NA.serverPath, NA.webconfig.viewsRelativePath),
		specific = locals.specific,
		subModelPath = join(path, 'subviews'),

		view = join(path, locals.routeParameters.view + '.htm'),
		model = join(path, locals.routeParameters.view + '.js'),
		appModel = join(path, 'app.js'),
		appView = join(path, 'app.htm');

	if (!NA.webconfig.cache) {
		delete require.cache[model];

		setVueComponents(NA);
	}

	// We open the component view file.
	if (!locals.routeParameters.view) {
		next();
	} else {
		fs.readFile(view, 'utf-8',  function (error, template) {
			var component = Vue.component(locals.routeKey.split('_')[0], require(model)(template, specific)),
				currentRoute = {
					path: locals.routeParameters.url,
					component: component,
					props: ['common', 'global']
				},
				child;

			// If exist a first-level route component child
			if (locals.routeParameters._parent || locals.routeParameters._children) {

				// We find them
				// for root
				if (locals.routeParameters._children) {
					child = NA.webconfig.routes[locals.routeKey]._children.find(function (child) {
						return !child.key;
					});
				//for others
				} else {
					child = NA.webconfig.routes[locals.routeParameters._parent]._children.find(function (child) {
						return child.key === locals.routeKey;
					});
				}

				if (!NA.webconfig.cache) {
					delete require.cache[join(subModelPath, child.view + '.js')];
				}

				// And we register them
				currentRoute.children = [{
					path: (locals.routeParameters._children) ? locals.routeParameters.url : '',
					component: Vue.component(child.view,
						require(join(subModelPath, child.view + '.js'))(fs.readFileSync(join(subModelPath, child.view + '.htm'), 'utf-8'))
					),
					props: ['common', 'global', 'specific']
				}];
			}

			// We open the main app view.
			fs.readFile(appView, 'utf-8', function (error, template) {

				// We create router with current route and subroute and pass some config.
				var router = new VueRouter({
						routes: [currentRoute]
					}),
					extra = locals.global || {},
					common = locals.common,
					specific = locals.specific,
					webconfig = {
						params: locals.params,
						routeName: locals.routeKey.split('_')[0],
						routes: NA.webconfig.routes,
						languageCode: NA.webconfig.languageCode
					},

					// We create the render.
					stream = renderer.renderToStream(new Vue(require(appModel)(template, router, webconfig, common, specific, extra)), locals);

				// We set the current (only) route to allows content to be rendered.
				router.push(locals.routeParameters.url);

				// We send data as soon as possible.
				stream.on('data', function (chunk) {
					response.write(chunk);
				});

				// We inform client the response is ended.
				stream.on('end', function () {
					response.end();
				});
			});
		});
	}
};