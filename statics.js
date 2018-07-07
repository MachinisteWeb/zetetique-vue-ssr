/* jshint node: true */
module.exports = (function () {
	var NA = this.NA,
		lang = NA.webconfig.languageCode;

	return {
		"/socket.io/socket.io.js": "node_modules/socket.io-client/dist/socket.io.js",
		"/javascripts/vendors/underscore.js": "node_modules/underscore/underscore.js",
		"/javascripts/vendors/jshashes.js": "node_modules/jshashes/hashes.min.js",
		"/javascripts/vendors/velocity.js": "node_modules/velocity-animate/velocity.js",
		"/javascripts/vendors/ckeditor/": "node_modules/ckeditor/",
		"/javascripts/vendors/vue.js": "node_modules/vue/dist/vue.js",
		"/javascripts/vendors/vue.router.js": "node_modules/vue-router/dist/vue-router.js",
		"/views-models": {
			"path": "views/",
			"output": false,
			"staticOptions": {
				"maxAge": (NA.webconfig.cache) ? 86400000 * 30 : 0
			}
		},
		"/variations": {
			"path": NA.webconfig.variationsRelativePath + lang + "/",
			"output": false,
			"staticOptions": {
				"maxAge": 0
			}
		},
		"/options.json": "options.json",
		"/routes.json": (lang === 'fr-fr') ? "routes.json" : "routes." + lang + ".json"
	};
})();