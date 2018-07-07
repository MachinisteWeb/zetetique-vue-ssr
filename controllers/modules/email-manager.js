/* jshint node: true */
module.exports = function (NA) {
	return {
		sendEmail: function (to, subject, content, next) {
			var nodemailer = NA.modules.nodemailer,
				path = NA.modules.path,
				fs = NA.modules.fs,
				mailOptions = {
					from: '"Coup critique" <contact@coup-critique.com>',
					to: to,
					replyTo: '"Visiteur" <" + to + ">',
					subject: subject,
					text: content
				},
				transporter,
				file;

			if (NA.webconfig._smtp) {
				transporter = nodemailer.createTransport('smtps://' + NA.webconfig._smtp.login + ':' + NA.webconfig._smtp.password + '@in-v3.mailjet.com');
				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
						console.log(info);
						return next && next(false);
					}

					if (next) {
						next(true);
					}
				});
			} else {
				file = path.join(NA.serverPath, NA.webconfig._data, 'data', 'email', (+new Date()) + '_' + mailOptions.to + '.json');
				fs.writeFile(file, JSON.stringify(mailOptions, undefined, '	'), function (error) {
					if (error) {
						console.log(error);
						return next && next(false);
					}

					if (next) {
						next(true);
					}
				});
			}

		}
	};
};