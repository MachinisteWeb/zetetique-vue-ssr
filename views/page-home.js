/* jshint node: true, esversion: 6 */
module.exports = function (template, specific, mixin, options) {
	return {
		name: 'PageHome',
		mixins: (mixin) ? [mixin] : undefined,
		props: {
			common: {
				type: Object,
				required: true
			},
			global: {
				type: Object,
				required: true
			}
		},
		data: function () {
			return {
				options: options,
				meta: specific.meta,
				specific: specific.body,
				projectsItemIndex: 0,
				resourcesItemIndex: 0,
				globalItemIndex: 0,
				widthIntro: 0,
				widthOverview: 0,
				widthProjects: 0,
				toggleAnimation: false
			};
		},
		watch: {
			globalItemIndex: function (newValue, oldValue) {
				var introContent = document.querySelector('.page-home--intro--content'),
					overviewContent = document.querySelector('.page-home--overview--content'),
					projectsContent = document.querySelector('.page-home--projects--content');

				if (newValue === 1 && newValue > oldValue) {
					this.widthIntro = introContent.offsetWidth -
						getComputedStyle(introContent).paddingLeft.replace(/px/, '') -
						getComputedStyle(introContent).paddingRight.replace(/px/, '') +
						'px';
					setTimeout(function () {
						this.widthIntro = 0;
					}, 1000);
				}

				if (newValue === 2 && newValue > oldValue) {
					this.widthOverview = overviewContent.offsetWidth -
						getComputedStyle(overviewContent).paddingLeft.replace(/px/, '') -
						getComputedStyle(overviewContent).paddingRight.replace(/px/, '') +
						'px';
					setTimeout(function () {
						this.widthOverview = 0;
					}, 1000);
				}

				if (newValue === 0 && newValue < oldValue) {
					this.widthProjects = projectsContent.offsetWidth -
						getComputedStyle(projectsContent).paddingLeft.replace(/px/, '') -
						getComputedStyle(projectsContent).paddingRight.replace(/px/, '') +
						'px';
					setTimeout(function () {
						this.widthProjects = 0;
					}, 1000);
				}

				this.syncHash('watch');
			},
			'global.isEditable': function () {
				var vm = this;
				if (!this.global.isEditable) {
					vm.$nextTick(function () {
						vm.setGoToNextStep();
					});
				}
			}
		},
		mounted: function () {
			var vm = this;

			vm.syncHash('go');

			window.addEventListener('hashchange', vm.hashchange);

			Array.prototype.forEach.call(document.querySelectorAll('.the-header--title a, .the-header--location .a'), function (link) {
				link.addEventListener('click', vm.returnToStart);
			});

			vm.setGoToNextStep();
		},
		destroyed: function () {
			var vm = this;

			window.removeEventListener('hashchange', vm.hashchange);

			Array.prototype.forEach.call(document.querySelectorAll('.the-header--title a, .the-header--location .a'), function (link) {
				link.removeEventListener('click', vm.returnToStart);
			});

			Array.prototype.filter.call(document.querySelectorAll('.page-home--content a'), function (link) {
				link.addEventListener('click', vm.goToNextStep);
			});
		},
		methods: {
			hashchange:  function () {
				this.syncHash('go');
			},
			syncHash: function (type) {
				var targets = ['home_', 'resources_', 'news_'],
					vm = this;

				targets.map(function (value, index) {
					if (type === 'watch') {
						if (vm.globalItemIndex === index) {
							window.location = '#' + vm.global.webconfig.routes[ value + vm.global.webconfig.languageCode].url;
						}
					}
					if (type === 'go') {
						if (window.location.hash === '#' + vm.global.webconfig.routes[ value + vm.global.webconfig.languageCode].url) {
							vm.globalItemIndex = index;
						}
					}
				});
			},
			setGoToNextStep: function () {
				var vm = this;
				Array.prototype.filter.call(document.querySelectorAll('.page-home--content a'), function (link) {
					return link.getAttribute('href') === '/';
				}).forEach(function (link) {
					link.addEventListener('click', vm.goToNextStep);
				});
			},
			goToNextStep: function (e) {
				e.preventDefault();

				if (this.globalItemIndex === 0) {
					this.globalItemIndex = 1;
					this.resourcesItemIndex = 0;
				} else if (this.globalItemIndex === 1) {
					this.resourcesItemIndex = this.resourcesItemIndex + 1;
					if (this.resourcesItemIndex === 4) {
						this.resourcesItemIndex = 3;
						this.globalItemIndex = 2;
						this.projectsItemIndex = 0;
					}
				} else if (this.globalItemIndex === 2) {
					this.projectsItemIndex = this.projectsItemIndex + 1;
					if (this.projectsItemIndex === 4) {
						this.projectsItemIndex = 3;
						this.globalItemIndex = 0;
					}
				}
			},
			returnToStart: function () {
				this.globalItemIndex = 0;
				this.resourcesItemIndex = 0;
				this.projectsItemIndex = 0;
				this.global.navigation = false;
			},
			nextGlobalItem: function (e) {
				if (e.target.classList.value !== 'a') {
					this.globalItemIndex = (this.globalItemIndex === 2) ? 0 : this.globalItemIndex + 1;
				}
			},
			selectResourcesItem: function (index) {
				this.resourcesItemIndex = index;
			},
			previousResourcesItem: function () {
				this.resourcesItemIndex = (this.resourcesItemIndex === 0) ? 3 : this.resourcesItemIndex - 1;
			},
			nextResourcesItem: function () {
				this.resourcesItemIndex =  (this.resourcesItemIndex === 3) ? 0 : this.resourcesItemIndex + 1;
			},
			selectProjectsItem: function (index) {
				this.projectsItemIndex = index;
			},
			previousProjectsItem: function () {
				this.projectsItemIndex = (this.projectsItemIndex === 0) ? 3 : this.projectsItemIndex - 1;
			},
			nextProjectsItem: function () {
				this.projectsItemIndex =  (this.projectsItemIndex === 3) ? 0 : this.projectsItemIndex + 1;
			}
		},
		template: template
	};
};