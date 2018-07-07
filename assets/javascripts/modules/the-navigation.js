/* jshint node: true, esversion: 6 */
module.exports = function () {
	return {
		setBeforeRouterEnter: function (vm) {
			vm.global.navigation = false;
		}
	};
};