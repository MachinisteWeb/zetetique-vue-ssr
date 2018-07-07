/* jshint node: true */
/* global Vue */
module.exports = function (template, specific, mixin, options) {
	return {
		name: 'PageNews',
		template: template,
		mixins: (mixin) ? [mixin] : undefined,
		props: ['common', 'global'],
		data: function () {
			return {
				options: options,
				meta: specific.meta,
				specific: specific.body
			};
		},
		computed: {
			sources: function () {
				var testSource = {};

				return (this.global.news[0]) && this.global.news.filter(function (oneNews) {
					if (!testSource[oneNews.website]) {
						testSource[oneNews.website] = oneNews.links.website;
						return true;
					} else {
						return false;
					}
				}).sort(function (a, b) {
					if (a.website.toLowerCase() < b.website.toLowerCase()) {
						return -1;
					}
					if (a.website.toLowerCase() > b.website.toLowerCase()) {
						return 1;
					}
					return 0;
				});
			}
		},
		beforeMount: function () {
			this.getNews();
		},
		methods: {
			padLeft: function (value) {
			var str = "" + value,
				pad = "00";

				return pad.substring(0, pad.length - str.length) + str;
			},
			getNews: function () {
				var vm = this,
					data = document.getElementsByClassName('page-news--content--news')[0];

				vm.$set(vm.global, 'news', {});

				if (data) {
					this.global.news = JSON.parse(data.getAttribute('data-fetch-news'));
					this.formatNews();
				} else {
					NA.socket.emit('page-news--content--news');
					NA.socket.once('page-news--content--news', function (data) {
						vm.global.news = data;
						vm.formatNews();
					});
				}
			},
			goTo: function (index) {
				var win = window.open(this.global.news[index].links.link, '_blank');
				win.focus();
			},
			formatNews: function () {
				this.$nextTick(function () {
					//imagesLoaded(document.querySelector('.page-news--content--outer'), function() {
						new Masonry( '.page-news--content--outer', {
							itemSelector: '.page-news--content--news--item',
							columnWidth: 10
						});
					//});
				});
			}
		}
	};
};