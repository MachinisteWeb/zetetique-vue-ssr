/* jshint node: true */
module.exports = function () {
	return {
		bind: function (el) {
			var startX, startY, initialX, initialY;

			function move(gesture) {
				var deltaGestureX = gesture.clientX - initialX,
					deltaGestureY = gesture.clientY - initialY,
					deltaPositionX = startX + deltaGestureX,
					deltaPositionY = startY + deltaGestureY,
					limitX = parseInt(window.innerWidth - el.clientWidth, 10),
					limitY = parseInt(window.innerHeight - el.clientHeight, 10);

				el.style.bottom = 'auto';
				if (deltaPositionY <= 0) {
					el.style.top = '0px';
				} else if (deltaPositionY >= limitY) {
					el.style.top = limitY + 'px';
				} else {
					el.style.top = startY + deltaGestureY + 'px';
				}

				el.style.right = 'auto';
				if (deltaPositionX <= 0) {
					el.style.left = '0px';
				} else if (deltaPositionX >= limitX) {
					el.style.left = limitX + 'px';
				} else {
					el.style.left = startX + deltaGestureX + 'px';
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