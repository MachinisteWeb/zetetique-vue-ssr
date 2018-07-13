/* jshint node: true */
module.exports = function () {
	var https = require('https'),
		http = require('http'),
		jsdom = require('jsdom'),
		fs = require('fs'),
		entries = [],
		async = require('async');

	function menaceTheoriste(entries, next) {
		http.get('http://menace-theoriste.fr/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var entry = {};
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&amp;/g, '&'),
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[<p-->/g, '<p>')
								.replace(/<p><\/p>/g, '</p>').replace(/\n]]&gt;/g, '')
								.replace(/<p>Cet article(.+)est apparu en premier sur(.+)<\/p>/g, '</p>'),
							website: 'La Menace Théoriste',
							image: 'https://s1-ssl.dmcdn.net/K0ejw/x1080-Mf5.jpg',
							category: node.getElementsByTagName('category')[0].innerHTML.replace(/<!--\[CDATA\[([-_ A-Za-z\u00C0-\u017F]+)\]\]-->/g, '$1'),
							publish: {
								author: node.getElementsByTagName('dc:creator')[0].innerHTML.replace(/<!--\[CDATA\[([-_ A-Za-z\u00C0-\u017F]+)\]\]-->/g, '$1'),
								date: new Date(node.getElementsByTagName('pubdate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#comments/g, '').replace(/#respond/g, ''),
								website: 'http://menace-theoriste.fr/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							http.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent),
										image = dom.window.document.querySelector('meta[property="og:image"]');

									image = image && image.getAttribute('content');

									if (image && image.indexOf('http://') !== -1) {
										image = 'https://images.weserv.nl/?url=' + encodeURIComponent(image.replace(/http:\/\//g, ''));
									}

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						if (images[index]) {
							entries[offset + index].image = images[index];
						}
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function espritCritique(entries, next) {
		https.get('https://www.esprit-critique.org/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var entry = {};
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&amp;/g, '&'),
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[<p-->/g, '<p>')
								.replace(/<a class="moretag" href="https:\/\/www.esprit-critique.org\/.+<\/a><p><\/p>/g, '...</p>')
								.replace(/<p>L’article(.+)est apparu en premier sur(.+)<\/p>/g, '</p>')
								.replace(/]]&gt;/g, ''),
							website: 'A·S·T·E·C',
							image: 'https://www.esprit-critique.org/wp-content/uploads/2016/05/cropped-cropped-cropped-fond1-2-2-3.jpg',
							category: node.getElementsByTagName('category')[0].innerHTML.replace(/<!--\[CDATA\[([-_ A-Za-z\u00C0-\u017F]+)\]\]-->/g, '$1'),
							publish: {
								author: node.getElementsByTagName('dc:creator')[0].innerHTML.replace(/<!--\[CDATA\[([-_ A-Za-z\u00C0-\u017F]+)\]\]-->/g, '$1'),
								date: new Date(node.getElementsByTagName('pubdate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#comments/g, '').replace(/#respond/g, ''),
								website: 'https://www.esprit-critique.org/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML
							}
						};
						entries.push(entry);
					}
				});

				async.parallel(fetchImages, function() {
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function charlatans(entries, next) {
		http.get('http://charlatans.info/news/spip.php?page=backend', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						entry = {};
					Array.prototype.forEach.call(node.getElementsByTagName('dc:subject'), function (category) {
						categories += ' - ' + category.innerHTML;
					});
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML,
							description: '<p>' + node.getElementsByTagName('description')[0].innerHTML
							.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
							.replace(/\n/g, '').replace(/\r/g, '').replace(/-<a(.*)/g, '</p>'),
							website: 'Charlatans',
							category: node.getElementsByTagName('category')[0].innerHTML + categories,
							publish: {
								date: new Date(node.getElementsByTagName('dc:date')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('guid')[0].innerHTML,
								website: 'http://charlatans.info/'
							},
							comments: {
								link: ''
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							http.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent);
										image = dom.window.document.querySelector('.imagegauchenews img');

									image = image && 'http://charlatans.info/news/' + image.getAttribute('src');

									if (image && image.indexOf('http://') !== -1) {
										image = 'https://images.weserv.nl/?url=' + encodeURIComponent(image.replace(/http:\/\//g, ''));
									}

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						entries[offset + index].image = images[index];
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function astroscept(entries, next) {
		https.get('https://astroscept.com/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item');

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						image = node.getElementsByTagName('media:content');
					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entries.push({
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'),
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[/g, '<p>').replace(/&#8230; <a href="https:\/\/astroscept.com\/.+]]&gt;/g, '...</p>'),
							website: 'Astroscept(icisme)',
							image: image && image[1] && image[1].getAttribute('url') ? image[1].getAttribute('url') : 'https://astroscept.files.wordpress.com/2017/04/cropped-astroscept-facebook.jpg',
							category: categories.replace(/ - $/g, ''),
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[.+&#8230; <a href="/g, '').replace(/"-->Lire.+]]&gt;/g, ''),
								website: 'https://astroscept.com/'
							},
							comments: {
								link: ''
							}
						});
					}
				});
				if (next) {
					next(entries);
				}
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function sciencetonnante(entries, next) {
		https.get('https://sciencetonnante.wordpress.com/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item');

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						image = node.getElementsByTagName('media:content');
					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entries.push({
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&nbsp;/g, ' ').replace(/&amp;/g, ''),
							description: node.getElementsByTagName('description')[0].innerHTML/*.replace(/<!--\[CDATA\[/g, '<p>').replace(/<a class="more-link" href="https:\/\/sciencetonnante.org\/.+]]&gt;/g, '...</p>')*/,
							website: 'Science Étonnante',
							image: image && image[1] && image[1].getAttribute('url') ? image[1].getAttribute('url') : 'https://www.tipeee.com/api/v1.0/images/986125',
							category: categories.replace(/ - $/g, ''),
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[.+&#8230; <a href="/g, '').replace(/" class="more-link">Lire.+]]&gt;/g, ''),
								website: 'https://sciencetonnante.wordpress.com/feed/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML
							}
						});
					}
				});
				if (next) {
					next(entries);
				}
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function cortecs(entries, next) {
		https.get('https://cortecs.org/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						entry = {};
					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&nbsp;/g, ' '),
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[/g, '<p>').replace(/<a class="more-link" href="https:\/\/cortecs.org\/.+]]&gt;/g, '...</p>'),
							website: 'CorteX',
							category: categories.replace(/ - $/g, ''),
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[.+class="more-link" href="/g, '').replace(/"-->Lire la suite.+&gt;/g, ''),
								website: 'https://cortecs.org/'
							},
							comments: {
								link: ''
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							https.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent),
										image = dom.window.document.querySelector('.entry-content img');

									image = image && image.getAttribute('src');

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						if (images[index]) {
							entries[offset + index].image = images[index];
						}
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function sciencePop(entries, next) {
		https.get('https://sciencepop.fr/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item');

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						image = node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[<div--><img width="[0-9]+" height="[0-9]+" src="/g, '').replace(/\?fit=.+/g, '');

					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entries.push({
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&nbsp;/g, ' '),
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[.+ssl=1">/g, '<p>').replace(/]]&gt;/g, '</p>'),
							website: 'Science Pop',
							category: categories.replace(/ - $/g, ''),
							image: image,
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#respond/g,''),
								website: 'https://sciencepop.fr/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML,
								feed: node.getElementsByTagName('wfw:commentRss')[0].innerHTML,
								number: node.getElementsByTagName('slash:comments')[0].innerHTML
							}
						});
					}
				});
				if (next) {
					next(entries);
				}
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function penserCritique(entries, next) {
		https.get('https://www.penser-critique.be/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						entry = {};
					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML,
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[/g, '<p>').replace(/<a class(.*)]]&gt;/g, '</p>').replace(/&#160;]]-->/g, '</p>'),
							website: 'Penser Critique',
							category: categories.replace(/ - $/g, ''),
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#respond/g,''),
								website: 'https://www.penser-critique.be/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML,
								feed: node.getElementsByTagName('wfw:commentRss')[0].innerHTML,
								number: node.getElementsByTagName('slash:comments')[0].innerHTML
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							https.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent);
										image = dom.window.document.querySelector('.featured-media img').getAttribute('src');

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						entries[offset + index].image = images[index];
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function curiologie(entries, next) {
		http.get('http://curiologie.fr/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item');

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						image = node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[<img width="[0-9]+" height="[0-9]+" src="/g, '').replace(/\?fit=.+/g, '');

						if (image && image.indexOf('http://') !== -1) {
							image = 'https://images.weserv.nl/?url=' + encodeURIComponent(image.replace(/http:\/\//g, ''));
						}

					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entries.push({
							title: node.getElementsByTagName('title')[0].innerHTML,
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[.+ssl=1">/g, '<p>').replace(/]]&gt;/g, '...</p>'),
							website: 'curiologie',
							category: categories.replace(/ - $/g, ''),
							image: image,
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#comments/g,''),
								website: 'http://curiologie.fr/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML,
								feed: node.getElementsByTagName('wfw:commentRss')[0].innerHTML,
								number: node.getElementsByTagName('slash:comments')[0].innerHTML
							}
						});
					}
				});
				if (next) {
					next(entries);
				}
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function theiereCosmique(entries, next) {
		https.get('https://theierecosmique.com/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var categories = '',
						entry = {};
					Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
						if (category.innerHTML !== '<!--[CDATA[Non classé]]-->') {
							categories += category.innerHTML.replace(/<!--\[CDATA\[/g, '').replace(/]]-->/g, '') + ' - ';
						}
					});
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML.replace(/&nbsp;/g, ' '),
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[/g, '<p>').replace(/<a href(.+)]]&gt;/g, '</p>').replace(/]]&gt;/g, '</p>').replace(/]]-->/g, ''),
							website: 'La Théière Cosmique',
							category: categories.replace(/ - $/g, ''),
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#comments/g,''),
								website: 'https://theierecosmique.com/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML,
								feed: node.getElementsByTagName('wfw:commentRss')[0].innerHTML,
								number: node.getElementsByTagName('slash:comments')[0].innerHTML
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							https.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent);
										image = dom.window.document.querySelector('meta[property="og:image"]');

									image = image && image.getAttribute('content');

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						entries[offset + index].image = images[index];
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function bunkerD(entries, next) {
		http.get('http://www.bunkerd.fr/feed/', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML,
							description: node.getElementsByTagName('description')[0].innerHTML.replace(/<!--\[CDATA\[/g, '<p>').replace(/<a href(.+)]]&gt;/g, '</p>').replace(/]]&gt;/g, '</p>').replace(/]]-->/g, ''),
							website: 'Bunker D',
							category: 'Zététique',
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML)
							},
							links: {
								link: node.getElementsByTagName('comments')[0].innerHTML.replace(/#comments/g,''),
								website: 'http://www.bunkerd.fr/'
							},
							comments: {
								link: node.getElementsByTagName('comments')[0].innerHTML,
								feed: node.getElementsByTagName('wfw:commentRss')[0].innerHTML,
								number: node.getElementsByTagName('slash:comments')[0].innerHTML
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							http.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent),
										image = dom.window.document.querySelector('meta[property="og:image"]');

									image = image && image.getAttribute('content');

									if (image && image.indexOf('http://') !== -1) {
										image = 'https://images.weserv.nl/?url=' + encodeURIComponent(image.replace(/http:\/\//g, ''));
									}

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						if (images[index]) {
							entries[offset + index].image = images[index];
						}
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function hoaxBuster(entries, next) {
		http.get('http://www.hoaxbuster.com/rss.xml', function (res) {
			var data = '',
				limit = 8;

			res.on('data', function (chunk) {
				data += chunk;
			});

			res.on('end', function () {
				var dom = new jsdom.JSDOM(data),
					nodes = dom.window.document.getElementsByTagName('item'),
					fetchImages = [],
					offset = entries.length;

				Array.prototype.forEach.call(nodes, function (node, index) {
					var link = node.innerHTML.replace(/\n/g, '').replace(/(.+)<link>/g, '').replace(/ <description>(.+)/g, ''),
						entry = {};
					if (index < limit) {
						entry = {
							title: node.getElementsByTagName('title')[0].innerHTML,
							description: node.getElementsByTagName('description')[0].innerHTML
								.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
								.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>')
								.replace(/<p><img(.+)alt=\"\" \/>/g, ''),
							website: 'hoaxbuster',
							category: node.getElementsByTagName('category')[0].innerHTML,
							publish: {
								date: new Date(node.getElementsByTagName('pubDate')[0].innerHTML
									.replace(/&lt;span class=\"date-display-single\" property=\"dc:date\" datatype=\"xsd:dateTime\" content=\"/g, '')
									.replace(/\"&gt;(.+)&lt;\/span&gt;/g, ''))
							},
							links: {
								link: 'http://www.hoaxbuster.com' + link,
								website: 'http://www.hoaxbuster.com/'
							},
							comments: {
								link: 'http://www.hoaxbuster.com' + link + '?rub=reactions'
							}
						};
						entries.push(entry);
						fetchImages.push(function (callback) {
							http.get(entry.links.link, function (res) {
								var imageContent = '';
								res.on('data', function (chunk) {
									imageContent += chunk;
								});
								res.on('end', function () {
									var dom = new jsdom.JSDOM(imageContent);
										image = dom.window.document.querySelector('meta[name="twitter:image"]');

									image = image && image.getAttribute('content');

									if (image && image.indexOf('http://') !== -1) {
										image = 'https://images.weserv.nl/?url=' + encodeURIComponent(image.replace(/http:\/\//g, ''));
									}

									callback(null, image);
								});
							});
						});
					}
				});

				async.parallel(fetchImages, function(err, images) {
					images.forEach(function (current, index) {
						entries[offset + index].image = images[index];
					});
					if (next) {
						next(entries);
					}
				});
			});
		}).on("error", function (error) {
			console.log(error);
		});
	}

	function entriesSave(entries, next) {
		fs.writeFile('../data/zetetique/news.json', JSON.stringify(entries, undefined, '	'), function (error) {
			if (error) {
				console.log(error);
			}

			if (next) {
				next(entries);
			}
		});
	}

	function entriesSort(entries, next) {
		entries.sort(function (a, b) {
			return b.publish.date - a.publish.date;
		});

		if (next) {
			next(entries);
		}
	}

	menaceTheoriste(entries, function (entries) {
		espritCritique(entries, function (entries) {
			hoaxBuster(entries, function (entries) {
				theiereCosmique(entries, function (entries) {
					charlatans(entries, function (entries) {
						cortecs(entries, function (entries) {
							sciencetonnante(entries, function (entries) {
								astroscept(entries, function (entries) {
									sciencePop(entries, function (entries) {
										penserCritique(entries, function (entries) {
											curiologie(entries, function (entries) {
												bunkerD(entries, function (entries) {
													entriesSort(entries, function (entries) {
														entriesSave(entries, function () {
															console.log('News updated');
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
};