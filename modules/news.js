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
		options.name = options.name || 'pas-de-titre';
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
							name: options.name,
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
			if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
				options.next(null, options.entries, fetchedData);
			} else {
				throw error;
			}
		});
	}

	// Vidéos
	function espritCritique(next) {
		exploitRssContent({
			website: 'Esprit Critique',
			name: 'esprit-critique',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0yPCUmdMZIGtnxSnx5_ifA',
			websiteUrl: 'https://www.youtube.com/channel/UC0yPCUmdMZIGtnxSnx5_ifA/featured',
			image: 'https://yt3.ggpht.com/qAPDHe_R3PnrXgE4ODA8U_eXGmw-ygEGL3A79iorYB37kevxGcP0LmyisUBxmJL65EtOl_I=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function parLeDebut(next) {
		exploitRssContent({
			website: 'Par Le Début',
			name: 'par-le-debut',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCDvU86s09gZEQUHJLKE9GKA',
			websiteUrl: 'https://www.youtube.com/channel/UCDvU86s09gZEQUHJLKE9GKA/featured',
			image: 'https://yt3.ggpht.com/Xm7fPhjxEaEQncw_SHzKdB-CMRfSrCZPtpethZls-3SaO-BoEfh9iKBDNhdOODzqmzImGjV_daQ=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function science4All(next) {
		exploitRssContent({
			website: 'Science4All',
			name: 'science-4-all',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0NCbj8CxzeCGIF6sODJ-7A',
			websiteUrl: 'https://www.youtube.com/channel/UC0NCbj8CxzeCGIF6sODJ-7A/featured',
			image: 'https://yt3.ggpht.com/zhDNZmboFR6zRS7x69ZqQWQm38XXQi7NMXT9q-x3ys00YZHP6AmQDN0P86_97ShCi7VZuL4t2DU=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function reveilleur(next) {
		exploitRssContent({
			website: 'Le Réveilleur',
			name: 'le-reveilleur',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1EacOJoqsKaYxaDomTCTEQ',
			websiteUrl: 'https://www.youtube.com/channel/UC1EacOJoqsKaYxaDomTCTEQ/featured',
			image: 'https://yt3.ggpht.com/zf47Pb6SPw7sXPUULITgyIx8tF80nTemCE5RrCfbXqETX3rLOETY0lhGwwol711fzN7SUUB4=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function matadon(next) {
		exploitRssContent({
			website: 'Matadon',
			name: 'matadon',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCljzenfKIP4yauZGpK4TTAw',
			websiteUrl: 'https://www.youtube.com/user/TheMightyMatadon/featured',
			image: 'https://yt3.ggpht.com/zf47Pb6SPw7sXPUULITgyIx8tF80nTemCE5RrCfbXqETX3rLOETY0lhGwwol711fzN7SUUB4=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function risqueAlpha(next) {
		exploitRssContent({
			website: 'Risque Alpha',
			name: 'risque-alpha',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJ7_Ld2cIVY5MM3NcKW3D8A',
			websiteUrl: 'https://www.youtube.com/channel/UCJ7_Ld2cIVY5MM3NcKW3D8A/featured',
			image: 'https://yt3.ggpht.com/4Ps5g_ptW4JsqVuTWQgBKLjoTDppbuGlxWwO30odyGP2lzWaFVhb8yfIPtaQ_SPP_Tc3u1Vitg=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function medifact(next) {
		exploitRssContent({
			website: 'Medifact',
			name: 'medifact',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCOhW7sWI8IeAi0ZYe-P3qRg',
			websiteUrl: 'https://www.youtube.com/channel/UCOhW7sWI8IeAi0ZYe-P3qRg/featured',
			image: 'https://yt3.ggpht.com/FuoPODH2-vsDC2nvpRKgKCNsmlyl9QDlMS_Kbp6-CLdgg8v4mUmOwTTCE1haNmyPa8N95xkM=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function mrPhi(next) {
		exploitRssContent({
			website: 'Monsieur Phi',
			name: 'monsieur-phi',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqA8H22FwgBVcF3GJpp0MQw',
			websiteUrl: 'https://www.youtube.com/channel/UCqA8H22FwgBVcF3GJpp0MQw/featured',
			image: 'https://yt3.ggpht.com/Hzm10g4imhPhaZVJCmx2SjWTLgY2b3KRhqa2h2qAtlHzITPBQ3Ofmx9fkHrepss-znFvLSEO4xI=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function defakator(next) {
		exploitRssContent({
			website: 'Defakator',
			name: 'defakator',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCU0FhLr6fr7U9GOn6OiQHpQ',
			websiteUrl: 'https://www.youtube.com/user/UCU0FhLr6fr7U9GOn6OiQHpQ/featured',
			image: 'https://yt3.ggpht.com/Dcc5cOZuKONGJGd6YUW0-NOhUjvJ55S6cT3ONO4wh9gcHU22_vFYqo9qnKuIWObCSnpMEov5jMg=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function chatSceptique(next) {
		exploitRssContent({
			website: 'Le chat sceptique',
			name: 'le-chat-sceptique',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCOuIgj0CYCXCvjWywjDbauw',
			websiteUrl: 'https://www.youtube.com/channel/UCOuIgj0CYCXCvjWywjDbauw/featured',
			image: 'https://yt3.ggpht.com/vjjryEVa3HxPclnL1igV1FgvHaMZ61js3xulqV2bV_jO-wbmaJZJTkMZyWhHUNmyOBbfLcaq1w=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function troncheBiais(next) {
		exploitRssContent({
			website: 'La Tronche en Biais',
			name: 'la-tronche-en-biais',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCq-8pBMM3I40QlrhM9ExXJQ',
			websiteUrl: 'https://www.youtube.com/user/TroncheEnBiais/featured',
			image: 'https://yt3.ggpht.com/R9lPriy76OEsNoI0f7RJ7tjLnastZpHNW2MB3DcNFkCCjI0ZgUOF2bvU4g1tCkEp9j095ROb=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function mondeRiant(next) {
		exploitRssContent({
			website: 'Un Monde Riant',
			name: 'un-monde-riant',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8T_vTz76WUsudvxPk6SLEw',
			websiteUrl: 'https://www.youtube.com/user/TheBigpeha/featured',
			image: 'https://yt3.ggpht.com/6awNwD9iUneQdWcfAmJ2Cv61OAyZWYfrOZptmu2pnghXEaxued5EldeeJ2ANukBP5ur6OHsG=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function hygieneMentale(next) {
		exploitRssContent({
			website: 'Hygiène Mentale',
			name: 'hygiene-mentale',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCMFcMhePnH4onVHt2-ItPZw',
			websiteUrl: 'https://www.youtube.com/user/fauxsceptique/featured',
			image: 'https://yt3.ggpht.com/s1FBgYGVHYhWtMjeMpmIax0-El4OawhPpEyZG7962v-RWPvATgkRxSq7j6xBMlzy9vXX3GoWqK4=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function mrSamTV(next) {
		exploitRssContent({
			website: 'Mr. Sam - Point d\'interrogation',
			name: 'mr-sam-point-d-interrogation',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCh2YBKhYIy-_LtfCIn2Jycg',
			websiteUrl: 'https://www.youtube.com/user/SamuelBuisseret/featured',
			image: 'https://yt3.ggpht.com/Yq-5ofi9GzxYjQNb-SlKY_dWFHbId-K9QlaHUApxA7qL6QVZZVLVomobCPK3XzVuLC3se4Tu=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 3,
			targetAllItems: function (globalDom) {
				return globalDom.window.document.getElementsByTagName('entry');
			},
			targetEachDate: function (node) {
				return new Date(node.getElementsByTagName('published')[0].innerHTML);
			},
			targetEachDescription: function (node) {
				var content = node.getElementsByTagName('media:description')[0].innerHTML.split(/\r|\n/g)[0] || node.getElementsByTagName('media:description')[0].innerHTM;
				return content;
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachComment: function (node) {
				return node.getElementsByTagName('link')[0].getAttribute('href');
			},
			targetEachCategory: function (node) {
				return 'Youtube';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:thumbnail')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	// Images
	function ebbh(next) {
		exploitRssContent({
			website: 'Evidence Based Bonne Humeur',
			name: 'evidence-based-bonne-humeur',
			protocol: 'https',
			url: 'https://fetchrss.com/rss/5c13a1698a93f87d2f8b45675c13a1dc8a93f8d3338b4567.xml',
			websiteUrl: 'https://www.facebook.com/RoMEBBH/',
			image: 'https://i.pinimg.com/564x/ca/c2/de/cac2defef244980e06aa6144f5875940.jpg',
			imageProtocol: 'https',
			limit: 5,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
							.replace(/<!--\[CDATA\[/g, '<p>')
							.replace(/<[/ -]*br[/ -]*>/g, '')
							.replace(/<img src=(.*)>/g, '')
							.replace(/<span style="font-size:12px; color: gray;">(.+)]]&gt;/g, '</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('guid')[0].innerHTML;
			},
			targetEachComment: function (node) {
				return '';
			},
			targetEachCategory: function (node) {
				return 'Facebook';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:content')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function coupCritique(next) {
		exploitRssContent({
			website: 'Coup Critique',
			name: 'coup-critique',
			protocol: 'https',
			url: 'https://fetchrss.com/rss/5c13a1698a93f87d2f8b45675c13a26c8a93f8b2368b4567.xml',
			websiteUrl: 'https://www.facebook.com/CoupEspritCritique/',
			image: 'https://www.coup-critique.com/media/images/more.jpg',
			imageProtocol: 'https',
			limit: 5,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
							.replace(/<!--\[CDATA\[/g, '<p>')
							.replace(/<[/ -]*br[/ -]*>/g, '')
							.replace(/<img src=(.*)>/g, '')
							.replace(/<span style="font-size:12px; color: gray;">(.+)]]&gt;/g, '</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('guid')[0].innerHTML;
			},
			targetEachComment: function (node) {
				return '';
			},
			targetEachCategory: function (node) {
				return 'Facebook';
			},
			targetEachImage: function (node) {
				var image = node.getElementsByTagName('media:content')[0];

				if (image && image.getAttribute('url')) {
					return image.getAttribute('url');
				}

				return '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	// Articles
	function menaceTheoriste(next) {
		exploitRssContent({
			website: 'La Menace Théoriste',
			name: 'la-menace-theoriste',
			url: 'http://menace-theoriste.fr/feed/',
			websiteUrl: 'http://menace-theoriste.fr/',
			image: 'https://s1-ssl.dmcdn.net/K0ejw/x1080-Mf5.jpg',
			imageAttribute: 'content',
			limit: 5,
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
			name: 'curiologie',
			url: 'http://curiologie.fr/feed/',
			websiteUrl: 'http://curiologie.fr/',
			limit: 5,
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

	function astec(next) {
		exploitRssContent({
			website: 'A·S·T·E·C',
			name: 'a-s-t-e-c',
			url: 'https://www.esprit-critique.org/feed/',
			websiteUrl: 'https://www.esprit-critique.org/',
			image: 'https://www.esprit-critique.org/wp-content/uploads/2016/05/cropped-cropped-cropped-fond1-2-2-3.jpg',
			protocol: 'https',
			limit: 5,
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
			name: 'charlatans',
			url: 'http://charlatans.info/news/spip.php?page=backend',
			websiteUrl: 'http://charlatans.info/',
			imagePrefix: 'http://charlatans.info/news/',
			limit: 5,
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
			name: 'astroscept-icisme',
			url: 'https://astroscept.com/feed/',
			protocol: 'https',
			image: 'https://astroscept.files.wordpress.com/2017/04/cropped-astroscept-facebook.jpg',
			websiteUrl: 'https://astroscept.com/',
			limit: 5,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/\]\]-->/g, '</p>')
					.replace(/&#8230; <a href="https:\/\/astroscept.com\/.+]]&gt;/g, '...</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('guid')[0].innerHTML;
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

	function lepharmachien(next) {
		exploitRssContent({
			website: 'Le Pharmachien',
			name: 'le-pharmachien',
			url: 'http://lepharmachien.com/feed/',
			protocol: 'http',
			image: 'https://i0.wp.com/lepharmachien.com/wp-content/uploads/2012/09/apropos_moi_2015.png',
			websiteUrl: 'http://lepharmachien.com/',
			limit: 5,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/\]\]-->/g, '</p>')
					.replace(/&#8230; <a href="https:\/\/lepharmachien.com\/.+]]&gt;/g, '...</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('guid')[0].innerHTML;
			},
			targetEachComment: function (node) {
				return (node.getElementsByTagName('comments')[0]) ? node.getElementsByTagName('comments')[0].innerHTML : '';
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function sciencetonnante(next) {
		exploitRssContent({
			website: 'Science Étonnante',
			name: 'science-etonnante',
			url: 'https://sciencetonnante.wordpress.com/feed/',
			protocol: 'https',
			websiteUrl: 'https://sciencetonnante.wordpress.com/',
			image: 'https://www.tipeee.com/api/v1.0/images/986125',
			limit: 5,
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
					.replace(/" class="more-link">Lire.+]]&gt;/g, '')
					.replace(/" class="more-link"-->Lire.+]]&gt;/g, '');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function cortecs(next) {
		exploitRssContent({
			website: 'CorteX',
			name: 'cortex',
			url: 'https://cortecs.org/feed/',
			protocol: 'https',
			websiteUrl: 'https://cortecs.org/',
			imageProtocol: 'https',
			limit: 5,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a class="more-link" href="https:\/\/cortecs.org\/.+]]&gt;/g, '...</p>');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+class="more-link" href="/g, '')
					.replace(/"-->(Continuer la lecture|Lire la suite).+&gt;/g, '');
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
			name: 'science-pop',
			url: 'https://sciencepop.fr/feed/',
			protocol: 'https',
			websiteUrl: 'https://sciencepop.fr/',
			limit: 5,
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
			name: 'penser-critique',
			url: 'https://www.penser-critique.be/feed/',
			protocol: 'https',
			imageProtocol: 'https',
			websiteUrl: 'https://www.penser-critique.be/',
			limit: 5,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a class(.*)]]&gt;/g, '</p>')
					.replace(/&#160;]]-->/g, '</p>')
					.replace(/]]-->/g, '</p>');
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
			name: 'la-theiere-cosmique',
			url: 'https://theierecosmique.com/feed/',
			protocol: 'https',
			imageProtocol: 'https',
			imageAttribute: 'content',
			websiteUrl: 'https://theierecosmique.com/',
			limit: 5,
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
			name: 'bunker-d',
			url: 'http://www.bunkerd.fr/feed/',
			imageAttribute: 'content',
			websiteUrl: 'http://www.bunkerd.fr/',
			limit: 5,
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
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function hoaxBuster(next) {
		exploitRssContent({
			website: 'hoaxbuster',
			name: 'hoaxbuster',
			url: 'http://www.hoaxbuster.com/rss.xml',
			websiteUrl: 'http://www.hoaxbuster.com/',
			imageAttribute: 'content',
			limit: 5,
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
		coupCritique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		ebbh(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		parLeDebut(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		espritCritique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		science4All(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		reveilleur(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		mrPhi(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		chatSceptique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		mondeRiant(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		troncheBiais(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		defakator(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		hygieneMentale(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		mrSamTV(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		matadon(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		risqueAlpha(function (err, entries) {
			callback(null, entries);
		});
	},function (callback) {
		medifact(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		menaceTheoriste(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		curiologie(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		astec(function (err, entries) {
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
		lepharmachien(function (err, entries) {
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
	},function (callback) {
		sciencePop(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		penserCritique(function (err, entries) {
			callback(null, entries);
		});
	} , function (callback) {
		theiereCosmique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		bunkerD(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
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