var puppeteer = require('puppeteer'),
	fs = require('fs'),
	sharp = require('sharp');


fs.readFile('../../data/zetetique/variations/fr-fr/resources.json', 'utf-8', function (err, content) {
	var data = JSON.parse(content);

	(async function () {
		var type = 'word';
		var number = '001';
		var browser = await puppeteer.launch({ ignoreHTTPSErrors: true });
		var page = await browser.newPage();
		var card = data.body[type].cards[number - 1];
		var urls = {
			'cafe': 'cafe-critique',
			'brain': 'mon-cerveau-et-moi',
			'speak': 'a-qui-tu-causes',
			'word': 'le-mot-du-jour'
		};

		page.setViewport({
			width: 2048,
			height: Math.ceil((card.height * 2048) / 250)
		});

		await page.goto('https://www.zetetique.local/fiches/' + urls[type] + '/' + card.number + '/', { waitUntil: 'networkidle2' });

		await page.evaluate((sel) => {
		    var elements = document.querySelectorAll(sel);
		    for(var i=0; i< elements.length; i++){
		        elements[i].parentNode.removeChild(elements[i]);
		    }
		}, ".cc-window.cc-banner.cc-type-info.cc-theme-block.cc-bottom, .page-card--share-buttons, .page-card--next, .the-header, .the-navigation");

		await page.screenshot({ path: '../assets/' + card.image, fullPage: true });

		await browser.close();

		sharp('../assets/' + card.image)
			.resize(600, Math.ceil((card.height * 600) / 250))
			.toFile('../assets/' + card.image.replace(/cc-/g, 'mini-cc-').replace(/mcem-/g, 'mini-mcem-').replace(/aqtc-/g, 'mini-aqtc-').replace(/aqtc-/g, 'mini-lmdj-'), function (err, info) {
				console.log('done');
			});
	}());
});