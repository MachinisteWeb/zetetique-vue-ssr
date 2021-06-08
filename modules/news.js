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
								link: options.targetEachComment ? options.targetEachComment(nodeItem) : (nodeItem.getElementsByTagName('comments')[0] ? nodeItem.getElementsByTagName('comments')[0].innerHTML : '')
							}
						};

						// Case no image exist
						if (!entry.image) {
							entry.image = options.image;
						}

						// Case image was not in https
						if (entry.image && typeof entry.image === 'string' && entry.image.indexOf('http://') !== -1) {
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
			if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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

	function vlanx(next) {
		exploitRssContent({
			website: 'Vlanx',
			name: 'vlanx',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZ3-PmXGBBFv-lZ6yYDlUbQ',
			websiteUrl: 'https://www.youtube.com/channel/UCZ3-PmXGBBFv-lZ6yYDlUbQ/featured',
			image: 'https://yt3.ggpht.com/1CHh_6-1fdpFu861kpOzB8nyLVHSwGYqQRlvanuAlJkXIwIZVpXVOBicb7q_xaaweLatRXKN=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function mangayoh(next) {
		exploitRssContent({
			website: 'Mangayoh',
			name: 'mangayoh',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCImVxjIl3rIEoQIqeDIvKfA',
			websiteUrl: 'https://www.youtube.com/channel/UCImVxjIl3rIEoQIqeDIvKfA/featured',
			image: 'https://yt3.ggpht.com/e_qXC1fX3HtAiTWgQytgbHZMeYNmGPdzDXLTJfWsP05oc-zWU6x3rxXXuLBHpmaIye2oGvUehg=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function audeWTFake(next) {
		exploitRssContent({
			website: 'Aude WTFake',
			name: 'aude-wtfake',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8Ux-LOyEXeioYQ4LFzpBXw',
			websiteUrl: 'https://www.youtube.com/channel/UC8Ux-LOyEXeioYQ4LFzpBXw/featured',
			image: 'https://yt3.ggpht.com/VMY7dLZuV7T-zH1GBFIwIGcVqSxFeuZwuJIJ4v6Lb--XZB1d4Fe_8qLvj7eLL8Plcl6YAkCDbXk=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function unCreatif(next) {
		exploitRssContent({
			website: 'Un Créatif',
			name: 'un-creatif',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCAiy7bY8nTQCWrkSRh6Wu9w',
			websiteUrl: 'https://www.youtube.com/channel/UCAiy7bY8nTQCWrkSRh6Wu9w/featured',
			image: 'https://yt3.ggpht.com/UIv1UToxK2PHcrNEB0kms39xQsdvg4GTnG7Zd9jsFWhuRQOIIGjBxlhcf7WUGO7Qu_6kcuY7HA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function stupidEconomics(next) {
		exploitRssContent({
			website: 'Stupid Economics',
			name: 'stupid-economics',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCyJDHgrsUKuWLe05GvC2lng',
			websiteUrl: 'https://www.youtube.com/channel/UCyJDHgrsUKuWLe05GvC2lng/featured',
			image: 'https://yt3.ggpht.com/OmkpSVJd1JtPODzscllPrgWho603Otx4JM__wyIDBm6iliUX34Ewt-rJT99tnhSQOHZNs2oMOQ=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function marketingMania(next) {
		exploitRssContent({
			website: 'Marketing Mania',
			name: 'marketing-mania',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSmUdD2Dd_v5uqBuRwtEZug',
			websiteUrl: 'https://www.youtube.com/channel/UCSmUdD2Dd_v5uqBuRwtEZug/featured',
			image: 'https://yt3.ggpht.com/9JS5uB3TLXqc8cSKJEyJ9cT5kCY-wCKPMp63nqRVBake4IhF0U0RiXL2o3m0vZ7ThvNKexamFg=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function avocat911(next) {
		exploitRssContent({
			website: '911 AVOCAT',
			name: '911-avocat',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1g4lZctFqTpZDrJEiw9Qug',
			websiteUrl: 'https://www.youtube.com/channel/UC1g4lZctFqTpZDrJEiw9Qug/featured',
			image: 'https://yt3.ggpht.com/su_3Vo67aKSafxWbf_4LVItR_b4ehkgequtzx_dBqGyFjg6q_A-7Em0MjllP8HO5gC7NbdHNdg=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function angleDroit(next) {
		exploitRssContent({
			website: 'Angle Droit',
			name: 'angle-droit',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_KidpuCqhbvqZedgq2DPpA',
			websiteUrl: 'https://www.youtube.com/channel/UC_KidpuCqhbvqZedgq2DPpA/featured',
			image: 'https://yt3.ggpht.com/iFOaygKZRgmwBnZSXtN5atC4-zL-gVTvnr96-pzch-CjQ0Y7lVDK7-mGLvXp5SZCPLGFAd9l07g=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function passeSauvage(next) {
		exploitRssContent({
			website: 'Passé sauvage',
			name: 'passe-sauvage',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLhOJJbPciPdocXTaAk2SdA',
			websiteUrl: 'https://www.youtube.com/channel/UCLhOJJbPciPdocXTaAk2SdA/featured',
			image: 'https://yt3.ggpht.com/mMfATjrRcNgOQd_Xc92Jvm2cb5wEMinDgA8TQEVTOldsw1DU_KGwQxU5PiqgtojWZrUT8jBNRUM=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function scienceClic(next) {
		exploitRssContent({
			website: 'ScienceClic',
			name: 'scienceclic',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCV6uM3y-8TeO7JlCtcEN-Bg',
			websiteUrl: 'https://www.youtube.com/channel/UCV6uM3y-8TeO7JlCtcEN-Bg/featured',
			image: 'https://yt3.ggpht.com/kuSuKOmhLzvop5bLk7oK-rd2_tgVnIVbZsH7HsJzKCNaccCqK-3XGi5vIvO8-sckPf-bG9NDzA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function notaBene(next) {
		exploitRssContent({
			website: 'Nota Bene',
			name: 'nota-bene',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCP46_MXP_WG_auH88FnfS1A',
			websiteUrl: 'https://www.youtube.com/channel/UCP46_MXP_WG_auH88FnfS1A/featured',
			image: 'https://yt3.ggpht.com/LurAbImXUEJg_kKZE6E4TNEnSy-_i5egBpwRIb1tWXkG6zxzapilMlAVkxySzW8XYShS4Ztcvw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function splineLND(next) {
		exploitRssContent({
			website: 'Spline LND',
			name: 'spline-lnd',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLdmnkqdcTPHvVZ8aNdbf5A',
			websiteUrl: 'https://www.youtube.com/channel/UCLdmnkqdcTPHvVZ8aNdbf5A/featured',
			image: 'https://yt3.ggpht.com/7pWd51F8bAwJXJc30Avou2UCgiq9tPG6pv8zcc38FEz6DeSTrXM3GzwFDY3wRztksBimyRVHdA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function linguisticae(next) {
		exploitRssContent({
			website: 'Linguisticae',
			name: 'linguisticae',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCofQxJWd4qkqc7ZgaLkZfcw',
			websiteUrl: 'https://www.youtube.com/channel/UCofQxJWd4qkqc7ZgaLkZfcw/featured',
			image: 'https://yt3.ggpht.com/0orjO47e6pAI1xw40GpgFjm3hrzrRsyi8UthP01NmFZjO6aLgsKcHS0Hadzdd4QIwHej-eAdvw=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function psykoCouac(next) {
		exploitRssContent({
			website: 'PsykoCouac',
			name: 'psyko-couac',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsE6tdKFV2oSHFyDll72rWg',
			websiteUrl: 'https://www.youtube.com/channel/UCsE6tdKFV2oSHFyDll72rWg/featured',
			image: 'https://yt3.ggpht.com/m_BD-xX-njy2ZB1eTBtB3n0ZCS2PwB7QOV0QzzMDIBJULUl4-2nbEu2YCRoQXjDyVlI6L3XvNzE=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function entracteScience(next) {
		exploitRssContent({
			website: 'Entracte Science',
			name: 'entracte-science',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC5z-dw1g1G2_twr2-RAtdHQ',
			websiteUrl: 'https://www.youtube.com/channel/UC5z-dw1g1G2_twr2-RAtdHQ/featured',
			image: 'https://yt3.ggpht.com/Sk1YKqsVHVnugZNpdfCX_v91KHB_6Nuah_Bi94v1fvu4tmB2tf2b0PZ7-o7bRfrn8norTxYO=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function passeScience(next) {
		exploitRssContent({
			website: 'Passe-Science',
			name: 'passe-science',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsz9DiwPtgDvxJ-njWnieZw',
			websiteUrl: 'https://www.youtube.com/channel/UCsz9DiwPtgDvxJ-njWnieZw/featured',
			image: 'https://yt3.ggpht.com/B6YprRvQclZdJGa_kEsei5c_NmfeuPm4CIEM3pHKRvPxr2114E-uEcHibZGl_DK56Ey35_S-R40=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function marieWild(next) {
		exploitRssContent({
			website: 'Marie Wild',
			name: 'marie-wild',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCI7DUjUYcPOLZ0pRuk4klkw',
			websiteUrl: 'https://www.youtube.com/channel/UCI7DUjUYcPOLZ0pRuk4klkw/featured',
			image: 'https://yt3.ggpht.com/31JQu51WQ7jbGNkoSycQ6xL2Fs1Y3oEEvw8odzP_bzxZIFjg-kCtRn4A8AeeZ2X34GS14RYOog=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function scilabus(next) {
		exploitRssContent({
			website: 'Scilabus',
			name: 'scilabus',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCeR8BYZS7IHYjk_9Mh5JgkA',
			websiteUrl: 'https://www.youtube.com/channel/UCeR8BYZS7IHYjk_9Mh5JgkA/featured',
			image: 'https://yt3.ggpht.com/feKbIV64rYVR1_D0Csi2yetfgRN_uSM4dwuX04B9qm5hHshsNXNdJMxQrrWNl621htV7UhKj=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function leVortex(next) {
		exploitRssContent({
			website: 'Le Vortex',
			name: 'le-vortex',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZxLew-WXWm5dhRZBgEFl-Q',
			websiteUrl: 'https://www.youtube.com/channel/UCZxLew-WXWm5dhRZBgEFl-Q/featured',
			image: 'https://yt3.ggpht.com/NAUuIM3oxvMFG6NNUSTy9x9Cep8CgkOjaQcX1uBZPHg356kpztdKdHZJAzAQy4VuosSQzBiUBA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function lesRevuesDuMonde(next) {
		exploitRssContent({
			website: 'Les Revues du Monde',
			name: 'les-revues-du-monde',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCnf0fDz1vTYW-sl36wbVMbg',
			websiteUrl: 'https://www.youtube.com/channel/UCnf0fDz1vTYW-sl36wbVMbg/featured',
			image: 'https://yt3.ggpht.com/_NFmpbR37yKDOTjlrUzZ6oqxosPEoWxTfepZZ8GHyQaSi167Yk3zLQoCLvl4jcs4vsB6GEr-=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function bonelessArcheologie(next) {
		exploitRssContent({
			website: 'Boneless Archéologie',
			name: 'boneless-archeologie',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7ktqoCpxEbP9TV-xQLTonQ',
			websiteUrl: 'https://www.youtube.com/channel/UC7ktqoCpxEbP9TV-xQLTonQ/featured',
			image: 'https://yt3.ggpht.com/W5CfDfRnv5nztirRNnujs8DMnN3uCs0ao7hgZy67VuaDn8UBpu0RGFbj2_bEBtj07DrFJJtX=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function scienceDeComptoir(next) {
		exploitRssContent({
			website: 'Science de comptoir',
			name: 'science-de-comptoir',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCE_LWXcsdp7cWbo4DR4ZA-A',
			websiteUrl: 'https://www.youtube.com/channel/UCE_LWXcsdp7cWbo4DR4ZA-A/featured',
			image: 'https://yt3.ggpht.com/40_DmiwS-2TVnhyXln_ydQjKYrX5Fiy7fJn8k9ZtaaXaLzPbpldofrGweAlw_smoW5y7uda6ew=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function cEstUneAutreHistoire(next) {
		exploitRssContent({
			website: 'C\'est une autre histoire',
			name: 'c-est-une-autre-histoire',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCKjDY4joMPcoRMmd-G1yz1Q',
			websiteUrl: 'https://www.youtube.com/channel/UCKjDY4joMPcoRMmd-G1yz1Q/featured',
			image: 'https://yt3.ggpht.com/CtmNyshezk1BTWPy4PxSb_JKjozAEmPLXJw3cIy16QINRuzItpHij-6NfU2h-7BMjz3P6eLh=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function laPsyQuiParle(next) {
		exploitRssContent({
			website: 'La Psy Qui Parle',
			name: 'la-psy-qui-parle',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCjFDAyjR5j8KqzxIkgCYgmA',
			websiteUrl: 'https://www.youtube.com/channel/UCjFDAyjR5j8KqzxIkgCYgmA/featured',
			image: 'https://yt3.ggpht.com/K3ph8lDQQVw2RDwjxhm3-jsH8Q_NlyNyrLBjSFFOtw02K0vG6byup0LBCp6pxw2_OWqX5MpxKA=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function avidesDeRecherche(next) {
		exploitRssContent({
			website: 'Avides de recherche',
			name: 'avides-de-recherche',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4Jrte_YtwWfANKNyzse5iA',
			websiteUrl: 'https://www.youtube.com/channel/UC4Jrte_YtwWfANKNyzse5iA/featured',
			image: 'https://yt3.ggpht.com/3GeF2i7WeMgAXRWdvD9Gkitwp2kg_G5-icePyvWXKKxr1rQmhidd9PVMqy25SM4s7N-NOqvV=w2560-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function fouloscopie(next) {
		exploitRssContent({
			website: 'Fouloscopie',
			name: 'fouloscopie',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLXDNUOO3EQ80VmD9nQBHPg',
			websiteUrl: 'https://www.youtube.com/channel/UCLXDNUOO3EQ80VmD9nQBHPg/featured',
			image: 'https://yt3.ggpht.com/b5sYQYVnABhtEEqnTJZaXKjyMi61xVqBMiYGk_h-lEvXjBOrXCR7Fa9pjDH650R0_Q6itNOX1T0=w2560-fcrop64=1,00005a57ffffa5a8-nd-c0xffffffff-rj-k-no',
			imageProtocol: 'https',
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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

	function debunkerDesEtoiles(next) {
		exploitRssContent({
			website: 'DeBunKer des Etoiles',
			name: 'debunker-des-etoiles',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC_56vSO35nctESDan8agevg',
			websiteUrl: 'https://www.youtube.com/channel/UC_56vSO35nctESDan8agevg/featured',
			image: 'https://yt3.ggpht.com/fnT-j7wGBvyHnnumwYHgIRicyO8fsw5cjpCaQTcQlqjXyVnTL1B5y9GVEVwmCFlQP8C126o=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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
			limit: 4,
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

	function heuReka(next) {
		exploitRssContent({
			website: 'Heu?reka',
			name: 'heu-reka',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7sXGI8p8PvKosLWagkK9wQ',
			websiteUrl: 'https://www.youtube.com/c/HeurekaFinanceEco/featured',
			image: 'https://yt3.ggpht.com/44K3iI0ec3qqa_vBh5mgOi-ZPh_KQ60DXEX8cBFFOn-Hc7_LuHB5lW2OXXYCtX3pqLjvFZj58g=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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
			limit: 4,
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

	function dirtyBiology(next) {
		exploitRssContent({
			website: 'DirtyBiology',
			name: 'dirty-biology',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtqICqGbPSbTN09K1_7VZ3Q',
			websiteUrl: 'https://www.youtube.com/user/dirtybiology/featured',
			image: 'https://yt3.ggpht.com/LO6Sp_zmqtv2VFRmiCh6i_PpqyhPkZIJwawumIBrPDVVOBZ1TDQef35qKIcqHYPpPztjwHun9Jw=w2120-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function cyrusNorth(next) {
		exploitRssContent({
			website: 'Cyrus North',
			name: 'cyrus-north',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCah8C0gmLkdtvsy0b2jrjrw',
			websiteUrl: 'https://www.youtube.com/user/LeCoupdePhil/featured',
			image: 'https://yt3.ggpht.com/7DktqYyl4zB7Nj7Bm73Bqvu5ZFtFdn0MP86FcvCZoktNM_4h2SuIDxytpgLif55KNPaYKYa6Pw=w1138-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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

	function scienceEtonnante(next) {
		exploitRssContent({
			website: 'ScienceEtonnante',
			name: 'science-etonnante',
			protocol: 'https',
			url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCaNlbnghtwlsGF-KzAFThqA',
			websiteUrl: 'https://www.youtube.com/user/ScienceEtonnante/featured',
			image: 'https://yt3.ggpht.com/sn6Cq01kzb_X0RAI4O2L9hiVtqcMeLFt68ZkRnVvCz5uXTx4YsLxOOkg0qalsAACOFYDuYtD=w1138-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
			imageProtocol: 'https',
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
	function laMenaceTheoriste(next) {
		exploitRssContent({
			website: 'La Menace Théoriste',
			name: 'la-menace-theoriste',
			url: 'https://menace-theoriste.fr/feed/',
			websiteUrl: 'https://menace-theoriste.fr/',
			image: 'https://menace-theoriste.fr/wp-content/uploads/2015/08/menace_theo2-300x145.png',
			imageAttribute: 'content',
			limit: 4,
			protocol: 'https',
			imageProtocol: 'https',
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
			url: 'https://curiologie.fr/feed/',
			websiteUrl: 'https://curiologie.fr/',
			protocol: 'https',
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			limit: 4,
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
			url: 'https://lepharmachien.com/feed/',
			protocol: 'https',
			imageProtocol: 'https',
			image: 'https://i0.wp.com/lepharmachien.com/wp-content/uploads/2012/09/apropos_moi_2015.png',
			websiteUrl: 'https://lepharmachien.com/',
			limit: 4,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/\]\]-->/g, '</p>')
					.replace(/&#8230; <a href="https:\/\/lepharmachien.com\/.+]]&gt;/g, '...</p>');
			},
			targetEachLink: function (node) {
				return node.innerHTML.split('<pubdate>')[0].split('<comments>')[0].split('<link>')[1];
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.post-thumbnail-ctn img');
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	function scepticismeScientifique(next) {
		exploitRssContent({
			website: 'Scepticisme Scientifique',
			name: 'scepticisme-scientifique',
			url: 'https://www.scepticisme-scientifique.com/feed/',
			protocol: 'https',
			image: 'https://www.scepticisme-scientifique.com/wp-content/uploads/2015/07/logo1-300x213.png',
			websiteUrl: 'https://www.scepticisme-scientifique.com/',
			limit: 4,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/\]\]-->/g, '</p>')
					.replace(/&#8230; <a href="https:\/\/scepticisme-scientifique.com\/.+]]&gt;/g, '...</p>');
			},
			targetEachImage: function (node) {
				return node.getElementsByTagName('itunes:image')[0].getAttribute('href');
			},
			targetEachLink: function (node) {
				return node.getElementsByTagName('guid')[0].innerHTML;
			},
			next: function (err, extractData, fetchedData) {
				next(null, extractData);
			}
		});
	}

	/* function sciencetonnante(next) {
		exploitRssContent({
			website: 'Science Étonnante',
			name: 'science-etonnante',
			url: 'https://sciencetonnante.wordpress.com/feed/',
			protocol: 'https',
			websiteUrl: 'https://sciencetonnante.wordpress.com/',
			image: 'https://www.tipeee.com/api/v1.0/images/986125',
			limit: 4,
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
	} */

	function cortecs(next) {
		exploitRssContent({
			website: 'CorteX',
			name: 'cortex',
			url: 'https://cortecs.org/feed/',
			protocol: 'https',
			websiteUrl: 'https://cortecs.org/',
			imageProtocol: 'https',
			image: 'https://cortecs.org/wp-content/uploads/2013/05/cropped-cortecs_logo_long1.png',
			limit: 4,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/]]-->/g, '</p>');
			},
			targetEachLink: function (node) {
				const regex = /<link>(.*)/gm;
				let m;

				while ((m = regex.exec(node.innerHTML)) !== null) {
				    if (m.index === regex.lastIndex) {
				        regex.lastIndex++;
				    }

					return m[1];
				}

			},
			targetEachComment: function (node) {
				return '';
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.chapo-img');
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
			limit: 4,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[.+ssl=1">/g, '<p>')
					.replace(/]]&gt;/g, '</p>');
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.post-image img');
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
			limit: 4,
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
			limit: 4,
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

	function zetEthique(next) {
		var i = 0;
		exploitRssContent({
			website: 'Zet Ethique',
			name: 'zet-ethique',
			url: 'https://zet-ethique.fr/feed/',
			websiteUrl: 'https://zet-ethique.fr/',
			protocol: 'https',
			imageProtocol: 'https',
			image: 'https://scontent-cdg2-1.xx.fbcdn.net/v/t1.0-9/66736128_2228973764031743_5085801363674234880_n.jpg?_nc_cat=100&_nc_oc=AQkaajwPu2D2-TM-DAlhcXceXZGgju5aLthZLDhnWH5lS7he90XDv6S8Eus0L6CX4cM&_nc_ht=scontent-cdg2-1.xx&oh=86163d1629b99a15b62c426f1e83cce2&oe=5E54DFC3',
			imageAttribute: 'src',
			limit: 4,
			targetEachDescription: function (node) {
				return node.getElementsByTagName('description')[0].innerHTML
					.replace(/<!--\[CDATA\[/g, '<p>')
					.replace(/<a href(.+)]]&gt;/g, '</p>')
					.replace(/]]&gt;/g, '</p>')
					.replace(/]]-->/g, '');
			},
			targetEachLink: function (node) {
				return node.innerHTML.split('<pubdate>')[0].split('<comments>')[0].split('<link>')[1];
			},
			targetEachContentImage: function (globalDom) {
				return globalDom.window.document.querySelector('.post-image img') || globalDom.window.document.querySelector('img[data-attachment-id]');
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
			limit: 4,
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
			limit: 4,
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
		debunkerDesEtoiles(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		heuReka(function (err, entries) {
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
		scepticismeScientifique(function (err, entries) {
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
		laMenaceTheoriste(function (err, entries) {
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
		vlanx(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		angleDroit(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		avocat911(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		stupidEconomics(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		marketingMania(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		unCreatif(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		mangayoh(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		audeWTFake(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		passeSauvage(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		splineLND(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		scienceClic(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		notaBene(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		linguisticae(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		psykoCouac(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		entracteScience(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		passeScience(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		marieWild(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		scilabus(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		leVortex(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		lesRevuesDuMonde(function (err, entries) {
			callback(null, entries);
		})
	}, function (callback) {
		bonelessArcheologie(function (err, entries) {
			callback(null, entries);
		})
	}, function (callback) {
		scienceDeComptoir(function (err, entries) {
			callback(null, entries);
		})
	}, function (callback) {
		avidesDeRecherche(function (err, entries) {
			callback(null, entries);
		})
	}, function (callback) {
		cEstUneAutreHistoire(function (err, entries) {
			callback(null, entries);
		})
	}, function (callback) {
		laPsyQuiParle(function (err, entries) {
			callback(null, entries);
		})
	}, function (callback) {
		fouloscopie(function (err, entries) {
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
	}/*, function (callback) {
		sciencetonnante(function (err, entries) {
			callback(null, entries);
		});scienceEtonnante
	}*/, function (callback) {
		scienceEtonnante(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		cyrusNorth(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		dirtyBiology(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		cortecs(function (err, entries) {
			callback(null, entries);
		});
	}/*, function (callback) {
		sciencePop(function (err, entries) {
			callback(null, entries);
		});
	}*/, function (callback) {
		penserCritique(function (err, entries) {
			callback(null, entries);
		});
	}, function (callback) {
		theiereCosmique(function (err, entries) {
			callback(null, entries);
		});
	}/*, function (callback) {
		zetEthique(function (err, entries) {
			callback(null, entries);
		});
	}*/, function (callback) {
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
