/* jshint node:true */
module.exports = function () {
	return {
		bind: function (el, binding) {
			var startX, startY, initialX, initialY;

			function move() {
				var box = el.querySelector(binding.value),
					buttonLeftPosition = parseInt(el.style.left, 10),
					buttonTopPosition = parseInt(el.style.top, 10),
					boxWidth = ((box && box.clientWidth) || 0),
					boxHeight = ((box && box.clientHeight) || 0),
					leftSwitchLimit = buttonLeftPosition + el.clientWidth - boxWidth - 2 - 30,
					rightSwitchLimit = buttonLeftPosition + boxWidth + 2 + 30,
					topSwitchLimit = buttonTopPosition - boxHeight - 2 - 30,
					bottomSwitchLimit = buttonTopPosition + el.clientHeight + boxHeight + 2 + 30;

				if (leftSwitchLimit < 0) {
					el.classList.add('to-right');
				}

				if (rightSwitchLimit > window.innerWidth) {
					el.classList.remove('to-right');
				}

				if (topSwitchLimit < 0) {
					el.classList.add('to-bottom');
				}

				if (bottomSwitchLimit > window.innerHeight) {
					el.classList.remove('to-bottom');
				}

				return false;
			}

			function mousemove(e) {
				move(e);
			}

			function mouseup() {
				document.removeEventListener('mousemove', mousemove);
				document.removeEventListener('mouseup', mouseup);
			}

			function touchmove(e) {
				move(e.touches[0]);
			}

			function touchend() {
				document.removeEventListener('touchmove', touchmove);
				document.removeEventListener('touchend', touchend);
			}

			el.addEventListener('touchstart', function (e) {
				startX = el.offsetLeft;
				startY = el.offsetTop;
				initialX = e.touches[0].clientX;
				initialY = e.touches[0].clientY;
				document.addEventListener('touchmove', touchmove);
				document.addEventListener('touchend', touchend);
			});

			el.addEventListener('mousedown', function (e) {
				startX = el.offsetLeft;
				startY = el.offsetTop;
				initialX = e.clientX;
				initialY = e.clientY;
				document.addEventListener('mousemove', mousemove);
				document.addEventListener('mouseup', mouseup);
				return false;
			});
		}
	};
};