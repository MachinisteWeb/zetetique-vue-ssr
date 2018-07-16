/* jshint node: true */
module.exports = function () {
	var https = require('https'),
		http = require('http'),
		jsdom = require('jsdom'),
		fs = require('fs'),
		entries = [],
		async = require('async');

	function findImageFromContent(options) {
		var fetcher,
			fetchedData;

		options = options || {};
		options.url = options.url || new Error('You need to define the `url` parameter from `options` object.');
		options.protocol = options.protocol || 'http';
		options.attribute = options.attribute || 'src';
		options.protocol = options.protocol || 'http';
		options.prefix = options.prefix || '';
		// options.targetEachContentImage : /* see `image` declaration */
		options.next = options.next || function () {
			console.log(fetchedData);
		};

		fetcher = (options.protocol === 'https') ? https : http;

		if (options.url instanceof Error) {
			throw options.url;
		}

		fetcher.get(options.url, function (res) {
			var imageContent = '';

			res.on('data', function (chunk) {
				imageContent += chunk;
			});

			res.on('end', function () {
				var globalDom = new jsdom.JSDOM(imageContent),
					image = options.targetEachContentImage ? options.targetEachContentImage(globalDom) : globalDom.window.document.querySelector('meta[property="og:image"]');

				if (image) {
					image = (options.prefix) ? options.prefix + image.getAttribute(options.attribute) : image.getAttribute(options.attribute);
				}

				if (image && image.indexOf('http://') !== -1) {
					image = 'https://images.weserv.nl/?url=' + encodeURIComponent(image.replace(/http:\/\//g, ''));
				}

				options.next(null, image);
			});
		});
	}

	function exploitRssContent(options) {
		var fetcher,
			fetchedData;

		options = options || {};
		options.url = options.url || new Error('You need to define the `url` parameter from `options` object.');
		options.protocol = options.protocol || 'http';
		options.entries = options.entries || [];
		options.limit = options.limit || Infinity;
		options.website = options.website || 'Pas de titre';
		options.image = options.image || '';
		options.imageAttribute = options.imageAttribute || 'src';
		options.imagePrefix = options.imagePrefix || '';
		options.imageProtocol = options.imageProtocol || 'http';
		options.websiteUrl = options.websiteUrl || '';
		// options.targetAllItems : /* see `nodeAllItems` declaration */
		// options.targetEachTitle : /* see `entry.title` assignment */
		// options.targetEachDescription : /* see `entry.description` assignment */
		// options.targetEachCategory : /* see `entry.category` assignment */
		// options.targetEachDate : /* see `entry.publish.date` assignment */
		// options.targetEachImage : /* see `entry.image` assignment */
		// options.targetEachLink : /* see `entry.links.link` assignment */
		// options.targetEachComment : /* see `entry.comments.link` assignment */
		// options.targetEachContentImage : /* see `targetEachContentImage` assignment */
		options.next = options.next || function () {
			console.log(fetchedData);
		};

		fetcher = (options.protocol === 'https') ? https : http;

		if (options.url instanceof Error) {
			throw options.url;
		}

		function selfEachCategory(node) {
			var categories = '';

			Array.prototype.forEach.call(node.getElementsByTagName('category'), function (category) {
				categories += category.innerHTML
					.replace(/<!--\[CDATA\[/g, '')
					.replace(/]]-->/g, '') +
					' - ';
			});

			return categories.replace(/ - $/g, '');
		}

		fetcher.get(options.url, function (res) {

			res.on('data', function (chunk) {
				fetchedData += chunk;
			});

			res.on('end', function () {
				var fetchImages = [],
					globalDom = new jsdom.JSDOM(fetchedData),
					offset = entries.length,
					nodeAllItems = options.targetAllItems ? options.targetAllItems(globalDom) : globalDom.window.document.getElementsByTagName('item');

				Array.prototype.forEach.call(nodeAllItems, function (nodeItem, index) {
					var entry = {};
					if (index < options.limit) {
						entry = {
							title: options.targetEachTitle ? options.targetEachTitle(nodeItem) : nodeItem.getElementsByTagName('title')[0].innerHTML
								.replace(/&amp;/g, '&')
								.replace(/&nbsp;/g, ' '),
							description: options.targetEachDescription ? options.targetEachDescription(nodeItem) : nodeItem.getElementsByTagName('description')[0].innerHTML
								.replace(/<!--\[CDATA\[<p-->/g, '<p>')
								.replace(/\n]]&gt;/g, ''),
							website: options.website,
							image: options.targetEachImage ? options.targetEachImage(nodeItem) : '',
							category: options.targetEachCategory ? options.targetEachCategory(nodeItem) : selfEachCategory(nodeItem)
								.replace(/<!--\[CDATA\[([-_ A-Za-z\u00C0-\u017F]+)\]\]-->/g, '$1'),
							publish: {
								date: options.targetEachDate ? options.targetEachDate(nodeItem) : new Date(nodeItem.getElementsByTagName('pubdate')[0].innerHTML)
							},
							links: {
								link: options.targetEachLink ? options.targetEachLink(nodeItem) : nodeItem.getElementsByTagName('comments')[0].innerHTML
									.replace(/#comments/g, '')
									.replace(/#respond/g, ''),
								website: options.websiteUrl
							},
							comments: {
								link: options.targetEachComment ? options.targetEachComment(nodeItem) : nodeItem.getElementsByTagName('comments')[0].innerHTML
							}
						};

						// Case no image exist
						if (!entry.image) {
							entry.image = options.image;
						}

						// Case image was not in https
						if (entry.image && entry.image.indexOf('http://') !== -1) {
							entry.image = 'https://images.weserv.nl/?url=' + encodeURIComponent(entry.image.replace(/http:\/\//g, ''));
						}

						options.entries.push(entry);

						// Case exist an image fetcher function
						if (!options.targetEachImage) {
							fetchImages.push(function (callback) {
								findImageFromContent({
									url: entry.links.link,
									protocol: options.imageProtocol,
									attribute: options.imageAttribute,
									prefix: options.imagePrefix,
									targetEachContentImage: options.targetEachContentImage,
									next: function (err, image) {
										callback(null, image);
	 								}
	 							});
							});
						}
					}
				});

				async.parallel(fetchImages, function(err, images) {
					if (!options.targetEachImage) {
						images.forEach(function (current, index) {
							if (images[index]) {
								options.entries[offset + index].image = images[index];
							}
						});
					}
					options.next(null, options.entries, fetchedData);
				});
			});

		}).on("error", function (error) {
			throw error;
		});
	}

	function menaceTheoriste(next) {
		exploitRssContent({
			website: 'La Menace Théoriste',
			url: 'http://menace-theoriste.fr/feed/',
			websiteUrl: 'http://menace-theoriste.fr/',
			image: 'https://s1-ssl.dmcdn.net/K0ejw/x1080-Mf5.jpg',
			imageAttribute: 'content',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
							.replace(/<!--\[CDATA\[<p-->/g, '<p>')
							.replace(/\n]]&gt;/g, '')
							.replace(/<p><\/p>/g, '')
							.replace(/<p>Cet article(.+)est apparu en premier sur(.+)<\/p>/g, '</p>');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function curiologie(next) {
		exploitRssContent({
			website: 'curiologie',
			url: 'http://curiologie.fr/feed/',
			websiteUrl: 'http://curiologie.fr/',
			limit: 8,
			targetEachImage: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[<img width="[0-9]+" height="[0-9]+" src="/g, '')
					.replace(/\?fit=.+/g, '');
			},
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+ssl=1">/g, '<p>')
					.replace(/]]&gt;/g, '...</p>');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function espritCritique(next) {
		exploitRssContent({
			website: 'A·S·T·E·C',
			url: 'https://www.esprit-critique.org/feed/',
			websiteUrl: 'https://www.esprit-critique.org/',
			image: 'https://www.esprit-critique.org/wp-content/uploads/2016/05/cropped-cropped-cropped-fond1-2-2-3.jpg',
			protocol: 'https',
			limit: 8,
			targetEachImage: function (node) {
				return '';
			},
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[<p-->/g, '<p>')
					.replace(/<a class="moretag" href="https:\/\/www.esprit-critique.org\/.+<\/a><p><\/p>/g, '...</p>')
					.replace(/<p>L’article(.+)est apparu en premier sur(.+)<\/p>/g, '</p>')
					.replace(/]]&gt;/g, '');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function charlatans(next) {
		exploitRssContent({
			website: 'Charlatans',
			url: 'http://charlatans.info/news/spip.php?page=backend',
			websiteUrl: 'http://charlatans.info/',
			imagePrefix: 'http://charlatans.info/news/',
			limit: 8,
			targetEachDescription: function (node) {
				return '<p>' + node.getElementsByTagName('description')[0].innerHTML
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/\n/g, '')
					.replace(/\r/g, '')
					.replace(/-<a(.*)/g, '</p>');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('dc:date')[0].innerHTML);
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('guid')[0].innerHTML;
			},
			targetEachComment: function (node) {
				return '';
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.imagegauchenews img');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function astroscept(next) {
		exploitRssContent({
			website: 'Astroscept(icisme)',
			url: 'https://astroscept.com/feed/',
			protocol: 'https',
			image: 'https://astroscept.files.wordpress.com/2017/04/cropped-astroscept-facebook.jpg',
			websiteUrl: 'https://astroscept.com/',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/&#8230; <a href="https:\/\/astroscept.com\/.+]]&gt;/g, '...</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+&#8230; <a href="/g, '')
					.replace(/"-->Lire.+]]&gt;/g, '');
			},
			targetEachComment: function (node) {
				return '';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:content');

				if (image && image[1] && image[1].getAttribute('url')) {
					return image[1].getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function sciencetonnante(next) {
		exploitRssContent({
			website: 'Science Étonnante',
			url: 'https://sciencetonnante.wordpress.com/feed/',
			protocol: 'https',
			websiteUrl: 'https://sciencetonnante.wordpress.com/',
			image: 'https://www.tipeee.com/api/v1.0/images/986125',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/&#8230; <a href="https:\/\/sciencetonnante\.wordpress\.com\/.+]]&gt;/g, '...</p>')
					.replace(/\]\]-->/g, '</p>');
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:content');

				if (image && image[1] && image[1].getAttribute('url')) {
					return image[1].getAttribute('url');
				}

				return '';
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+&#8230; <a href="/g, '')
					.replace(/" class="more-link">Lire.+]]&gt;/g, '');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function cortecs(next) {
		exploitRssContent({
			website: 'CorteX',
			url: 'https://cortecs.org/feed/',
			protocol: 'https',
			websiteUrl: 'https://cortecs.org/',
			imageProtocol: 'https',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a class="more-link" href="https:\/\/cortecs.org\/.+]]&gt;/g, '...</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+class="more-link" href="/g, '')
					.replace(/"-->Lire la suite.+&gt;/g, '');
			},
			targetEachComment: function (node) {
				return '';
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.entry-content img');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function sciencePop(next) {
		exploitRssContent({
			website: 'Science Pop',
			url: 'https://sciencepop.fr/feed/',
			protocol: 'https',
			websiteUrl: 'https://sciencepop.fr/',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+ssl=1">/g, '<p>')
					.replace(/]]&gt;/g, '</p>');
			},
			targetEachImage: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[<div--><img width="[0-9]+" height="[0-9]+" src="/g, '')
					.replace(/\?fit=.+/g, '');
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.entry-content img');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function penserCritique(next) {
		exploitRssContent({
			website: 'Penser Critique',
			url: 'https://www.penser-critique.be/feed/',
			protocol: 'https',
			imageProtocol: 'https',
			websiteUrl: 'https://www.penser-critique.be/',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a class(.*)]]&gt;/g, '</p>')
					.replace(/&#160;]]-->/g, '</p>');
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.featured-media img');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function theiereCosmique(next) {
		exploitRssContent({
			website: 'La Théière Cosmique',
			url: 'https://theierecosmique.com/feed/',
			protocol: 'https',
			imageProtocol: 'https',
			imageAttribute: 'content',
			websiteUrl: 'https://theierecosmique.com/',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a href(.+)]]&gt;/g, '</p>')
					.replace(/]]&gt;/g, '</p>')
					.replace(/]]-->/g, '');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function bunkerD(next) {
		exploitRssContent({
			website: 'Bunker D',
			url: 'http://www.bunkerd.fr/feed/',
			imageAttribute: 'content',
			websiteUrl: 'http://www.bunkerd.fr/',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a href(.+)]]&gt;/g, '</p>')
					.replace(/]]&gt;/g, '</p>')
					.replace(/]]-->/g, '');
			},
			targetEachCategory: function (node) {
				return 'Zététique';
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.featured-media img');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function hoaxBuster(next) {
		exploitRssContent({
			website: 'hoaxbuster',
			url: 'http://www.hoaxbuster.com/rss.xml',
			websiteUrl: 'http://www.hoaxbuster.com/',
			imageAttribute: 'content',
			limit: 8,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
					.replace(/<div>/g, '<p>').replace(/<\/div>/g, '</p>')
					.replace(/<p><img(.+)alt=\"\" \/>/g, '');
			},
			targetEachLink: function (node) {
				return 'http://www.hoaxbuster.com' + node.innerHTML
					.replace(/\n/g, '')
					.replace(/(.+)<link>/g, '')
					.replace(/ <description>(.+)/g, '');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('pubDate')[0].innerHTML
					.replace(/&lt;span class=\"date-display-single\" property=\"dc:date\" datatype=\"xsd:dateTime\" content=\"/g, '')
					.replace(/\"&gt;(.+)&lt;\/span&gt;/g, ''));
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('meta[name="twitter:image"]');
			},
			targetEachComment: function (node) {
				return 'http://www.hoaxbuster.com' + node.innerHTML
					.replace(/\n/g, '')
					.replace(/(.+)<link>/g, '')
					.replace(/ <description>(.+)/g, '') + '?rub=reactions';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function entriesSave(entries, next) {
		fs.writeFile('../data/zetetique/news.json', JSON.stringify(entries, undefined, '	'), function (error) {
			if (error) {
				console.log(error);
			}

			if (next) {
				next(null, entries);
			}
		});
	}

	function entriesSort(entries, next) {
		entries.sort(function (a, b) {
			return b.publish.date - a.publish.date;
		});

		if (next) {
			next(null, entries);
		}
	}

	async.parallel([function (callback) {
		menaceTheoriste(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		curiologie(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		espritCritique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		charlatans(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		astroscept(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		sciencetonnante(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		cortecs(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		sciencePop(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		penserCritique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		theiereCosmique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		bunkerD(function (err, entries) {
			callback(null, entries);
		});
	},function (callback) {
		hoaxBuster(function (err, entries) {
			callback(null, entries);
		});
	}], function(err, entries) {
		var result = entries.reduce(function (a, b) {
			return a.concat(b);
		}, []);
		entriesSort(result, function (err, entries) {
			entriesSave(entries, function () {
				console.log('News updated');
			});
		});
	});
};