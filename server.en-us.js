/* jshint node: true */
var browserSync = require('browser-sync');
global.NA = new require("node-atlas")();

global.NA.started(function () {
	browserSync.init(null, {
		proxy: "http://localhost:7777",
		files: ["views/**", "assets/**", "variations/**"],
		port: 57777,
	});
}).run({
	"webconfig": "webconfig.en-us.json"
});