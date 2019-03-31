/* jshint node: true */
/* global Vue */
module.exports = function (template, specific, mixin, options) {
	return {
		name: 'PageBiasis',
		template: template,
		mixins: (mixin) ? [mixin] : undefined,
		props: ['common', 'global'],
		data: function () {
			return {
				options: options,
				meta: specific.meta,
				specific: specific.body,
				level: 0
			};
		},
		computed: {
			biasisEnhanced: function () {
				var vm = this;

				vm.specific.biasis.forEach(function (item1, i) {
					item1.degree = i * (360 / vm.specific.biasis.length);
					item1.biasis.forEach(function (item2, j) {
						item2.degree = j * (360 / item1.biasis.length);
					});
				});

				return vm.specific.biasis;
			},
		},
		methods: {
			open: function (target, level) {
				var vm = this;

				this.transition(document.getElementsByClassName(target)[0], 'animate', {
					state: 'is-opened',
					time: 1000,
					tickDelay: 0
				});
			},
			transition: function (target, transition, options) {

				var hasNoState,
					mediaQueriesTest = false,
					params = {};

				function mostLongest(target) {
					var max = 0,
						hasTransition = getComputedStyle(target).transition,
						hasAnimation = getComputedStyle(target).animation,
						directive = hasTransition + ', ' + hasAnimation;
					directive.split(',').forEach(function (item) {
						item.match(/([.0-9]+)s/g).forEach(function (item) {
							var time = item.replace(/s/g, '') * 1000;
							if (time > max) {
								max = time;
							}
						});
					});
					return max;
				}

				if (options === undefined || options === null) {
					options = {};
				}

				params.state = options.state || (typeof options === 'string' ? options : undefined);
				params.enterTime = options.enterTime || options.time || (typeof options === 'number' ? options : undefined);
				params.leaveTime = options.leaveTime || options.time || (typeof options === 'number' ? options : undefined);
				params.enterCallback = options.enterCallback || (typeof options === 'function' ? options : undefined);
				params.enterToCallback = options.enterToCallback;
				params.leaveCallback = options.leaveCallback;
				params.leaveToCallback = options.enterToCallback || (typeof options === 'function' ? options : undefined);
				params.fallback = options.fallback;
				params.tickDelay = options.tickDelay || 0;
				mediaQueriesTest = (options.mediaQueries) ? window.matchMedia(options.mediaQueries).matches : false;

				if (params.state) {
					hasNoState = target.classList.contains(params.state);
				} else {
					hasNoState = target.classList.contains(transition + "-enter-to") || target.classList.contains(transition + "-leave");
				}

				if (options.mediaQueries && mediaQueriesTest || !options.mediaQueries) {

					if (!hasNoState) {
						params.state && target.classList.add(params.state);
						if (params.enterCallback) {
							params.enterCallback(target, transition, params, options);
						}
						target.classList.remove(transition + "-leave-to");
						target.classList.add(transition + "-enter");
						setTimeout(function() {
							target.classList.add(transition + "-enter-active");
							if (!params.enterTime) {
								params.enterTime = mostLongest(target);
							}
							setTimeout(function() {
								target.classList.remove(transition + "-enter");
								target.classList.add(transition + "-enter-to");
								setTimeout(function() {
									target.classList.remove(transition + "-enter-active");
									if (params.enterToCallback) {
										params.enterToCallback(target, transition, params, options);
									}
								}, params.enterTime);
							}, params.tickDelay);
						}, params.tickDelay);
					} else {
						if (params.leaveCallback) {
							params.leaveCallback(target, transition, params, options);
						}
						target.classList.remove(transition + "-enter-to");
						target.classList.add(transition + "-leave");
						setTimeout(function() {
							target.classList.add(transition + "-leave-active");
							if (!params.leaveTime) {
								params.leaveTime = mostLongest(target);
							}
							setTimeout(function() {
								target.classList.remove(transition + "-leave");
								target.classList.add(transition + "-leave-to");
								setTimeout(function() {
									target.classList.remove(transition + "-leave-active");
									params.state && target.classList.remove(params.state);
									if (params.leaveToCallback) {
										params.leaveToCallback(target, transition, params, options);
									}
								}, params.leaveTime);
							}, params.tickDelay);
						}, params.tickDelay);
					}
				} else {
					target.classList.remove(transition + "-enter");
					target.classList.remove(transition + "-enter-to");
					target.classList.remove(transition + "-leave");
					target.classList.remove(transition + "-leave-to");

					if (params.fallback) {
						params.fallback(target, transition, params, options);
					}
				}
			}
		}
	};
};