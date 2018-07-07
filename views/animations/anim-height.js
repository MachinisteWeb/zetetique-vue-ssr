/* jshint node: true */
/* global Velocity */
module.exports = function (template) {
	return {
		name: 'AnimHeight',
		data: function () {
			return {
				paddingTop: NaN,
				paddingBottom: NaN,
				height: NaN
			};
		},
		methods: {
			enter: function (el, done) {
				el.style.height = '';
				el.style.paddingTop = '';
				el.style.paddingBottom = '';
				el.style.display = 'block';
				this.paddingTop = getComputedStyle(el, null).getPropertyValue('padding-top');
				this.paddingBottom = getComputedStyle(el, null).getPropertyValue('padding-bottom');
				this.height = el.clientHeight + 'px';
				el.style.height = 0;
				el.style.paddingTop = 0;
				el.style.paddingBottom = 0;
				el.style.display = '';
				Velocity(el,  {
					height: this.height,
					paddingTop: this.paddingTop,
					paddingBottom: this.paddingBottom
				}, {
					duration: 500,
					complete: function () {
						el.style.height = '';
						el.style.paddingTop = '';
						el.style.paddingBottom = '';
						done();
					}
				});
			},
			leave: function (el, done) {
				Velocity(el, {
					height: 0,
					paddingTop: 0,
					paddingBottom: 0
				},  {
					duration: 500,
					complete: function () {
						el.style.height = '';
						el.style.paddingTop = '';
						el.style.paddingBottom = '';
						done();
					}
				});
			}
		},
		template: template
	};
};