/**
*  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
*  and show the axis tick label on the edge of the map.
*  Author: lanwei@cloudybay.com.tw
*/

L.LatLngGraticule = L.Layer.extend({
	options: {
		showLabel: true,
		opacity: 1,
		weight: 0.8,
		color: '#aaa',
		font: '12px Verdana',
		latLabelLeftMargin: 0,
		latLabelRightMargin: 0,
		lonLabelTopMargin: 5,
		lonLabelBottomMargin: 0,
		lngLineCurved: 0,
		latLineCurved: 0,
		zoomInterval: [
			{ start: 2, end: 2, interval: 40 },
			{ start: 3, end: 3, interval: 20 },
			{ start: 4, end: 4, interval: 10 },
			{ start: 5, end: 7, interval: 5 },
			{ start: 8, end: 20, interval: 1 }
		]
	},

	initialize: function (options) {

		//console.log(`[LatLngGraticule] INIT `);

		L.setOptions(this, options);

		var defaultFontName = 'Verdana';
		var _ff = this.options.font.split(' ');
		if (_ff.length < 2) {
			this.options.font += ' ' + defaultFontName;
		}

		if (!this.options.fontColor) {
			this.options.fontColor = this.options.color;
		}

		if (this.options.zoomInterval) {
			if (this.options.zoomInterval.latitude) {
				this.options.latInterval = this.options.zoomInterval.latitude;
				if (!this.options.zoomInterval.longitude) {
					this.options.lngInterval = this.options.zoomInterval.latitude;
				}
			}
			if (this.options.zoomInterval.longitude) {
				this.options.lngInterval = this.options.zoomInterval.longitude;
				if (!this.options.zoomInterval.latitude) {
					this.options.latInterval = this.options.zoomInterval.longitude;
				}
			}
			if (!this.options.latInterval) {
				this.options.latInterval = this.options.zoomInterval;
			}
			if (!this.options.lngInterval) {
				this.options.lngInterval = this.options.zoomInterval;
			}
		}
	},

	onAdd: function (map) {
		//console.log(`[LatLngGraticule] onAdd() `);
		this._map = map;

		if (!this._container) {
			this._initCanvas();
		}

		map._panes.overlayPane.appendChild(this._container);

		map.on('viewreset', this._reset, this);
		map.on('move', this._reset, this);
		map.on('moveend', this._reset, this);

		// 		if (map.options.zoomAnimation && L.Browser.any3d) {
		// 			map.on('zoom', this._animateZoom, this);
		// 		}

		this._reset();
	},

	onRemove: function (map) {
		//console.log(`[LatLngGraticule] onRemove() `);
		map.getPanes().overlayPane.removeChild(this._container);

		map.off('viewreset', this._reset, this);
		map.off('move', this._reset, this);
		map.off('moveend', this._reset, this);

		// 		if (map.options.zoomAnimation) {
		// 			map.off('zoom', this._animateZoom, this);
		// 		}
	},

	addTo: function (map) {
		//console.log(`[LatLngGraticule] addTo() `);
		map.addLayer(this);
		return this;
	},

	setOpacity: function (opacity) {
		//console.log(`[LatLngGraticule] setOpacity() | opacity: ${opacity}`);
		this.options.opacity = opacity;
		this._updateOpacity();
		return this;
	},

	bringToFront: function () {
		//console.log(`[LatLngGraticule] bringToFront() `);
		if (this._canvas) {
			this._map._panes.overlayPane.appendChild(this._canvas);
		}
		return this;
	},

	bringToBack: function () {
		//console.log(`[LatLngGraticule] bringToBack() `);
		var pane = this._map._panes.overlayPane;
		if (this._canvas) {
			pane.insertBefore(this._canvas, pane.firstChild);
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	_initCanvas: function () {
		//console.log(`[LatLngGraticule] _initCanvas() `);
		this._container = L.DomUtil.create('div', 'leaflet-image-layer Leaflet-Graticule');

		this._canvas = L.DomUtil.create('canvas', '');

		if (this._map.options.zoomAnimation && L.Browser.any3d) {
			L.DomUtil.addClass(this._canvas, 'leaflet-zoom-animated');
		} else {
			L.DomUtil.addClass(this._canvas, 'leaflet-zoom-hide');
		}

		this._updateOpacity();

		this._container.appendChild(this._canvas);

		L.extend(this._canvas, {
			onselectstart: L.Util.falseFn,
			onmousemove: L.Util.falseFn,
			onload: L.bind(this._onCanvasLoad, this)
		});
	},

	// 	_animateZoom: function (e) {
	// 		var map = this._map,
	// 			container = this._container,
	// 			canvas = this._canvas,
	// 			zoom = map.getZoom(),
	// 			center = map.getCenter(),
	// 			scale = map.getZoomScale(zoom),
	// 			nw = map.containerPointToLatLng([0, 0]),
	// 			se = map.containerPointToLatLng([canvas.width, canvas.height]),
	//
	// 			topLeft = map._latLngToNewLayerPoint(nw, zoom, center),
	// 			size = map._latLngToNewLayerPoint(se, zoom, center)._subtract(topLeft),
	// 			origin = topLeft._add(size._multiplyBy((1 / 2) * (1 - 1 / scale)));
	//
	// 		L.DomUtil.setTransform(container, origin, scale);
	// 	},

	_reset: function () {
		//console.log(`[LatLngGraticule] _reset() `);
		var container = this._container,
			canvas = this._canvas,
			size = this._map.getSize(),
			lt = this._map.containerPointToLayerPoint([0, 0]);

		L.DomUtil.setPosition(container, lt);

		container.style.width = size.x + 'px';
		container.style.height = size.y + 'px';

		canvas.width = size.x;
		canvas.height = size.y;
		canvas.style.width = size.x + 'px';
		canvas.style.height = size.y + 'px';

		this.__calcInterval();

		this.__draw(true);
	},

	_onCanvasLoad: function () {
		//console.log(`[LatLngGraticule] _onCanvasLoad() `);
		this.fire('load');
	},

	_updateOpacity: function () {
		//console.log(`[LatLngGraticule] _updateOpacity() `);
		//console.log(`... opacity: ${this.options.opacity}`);
		L.DomUtil.setOpacity(this._canvas, this.options.opacity);
	},

	__format_lat: function (lat) {
		//console.log(`[LatLngGraticule] __format_lat() `);
		if (this.options.latFormatTickLabel) {
			return this.options.latFormatTickLabel(lat);
		}

		return '' + lat;
	},

	__format_lng: function (lng) {
		//console.log(`[LatLngGraticule] __format_lng() `);
		if (this.options.lngFormatTickLabel) {
			return this.options.lngFormatTickLabel(lng);
		}

		return '' + lng;
	},

	__calcInterval: function () {
		//console.log(`[LatLngGraticule] __calcInterval() `);
		var zoom = this._map.getZoom();
		if (this._currZoom != zoom) {
			this._currLngInterval = 0;
			this._currLatInterval = 0;
			this._currZoom = zoom;
		}

		var interv;

		if (!this._currLngInterval) {
			try {
				for (var idx in this.options.lngInterval) {
					var dict = this.options.lngInterval[idx];
					if (dict.start <= zoom) {
						if (dict.end && dict.end >= zoom) {
							this._currLngInterval = dict.interval;
							break;
						}
					}
				}
			}
			catch (e) {
				this._currLngInterval = 0;
			}
		}

		if (!this._currLatInterval) {
			try {
				for (var idx in this.options.latInterval) {
					var dict = this.options.latInterval[idx];
					if (dict.start <= zoom) {
						if (dict.end && dict.end >= zoom) {
							this._currLatInterval = dict.interval;
							break;
						}
					}
				}
			}
			catch (e) {
				this._currLatInterval = 0;
			}
		}
	},

	__draw: function (label) {
		//console.log(`[LatLngGraticule] __draw() `);
		function _parse_px_to_int(txt) {
			if (txt.length > 2) {
				if (txt.charAt(txt.length - 2) == 'p') {
					txt = txt.substr(0, txt.length - 2);
				}
			}
			try {
				return parseInt(txt, 10);
			}
			catch (e) { }
			return 0;
		};

		var canvas = this._canvas,
			map = this._map,
			curvedLon = this.options.lngLineCurved,
			curvedLat = this.options.latLineCurved;

		if (L.Browser.canvas && map) {
			if (!this._currLngInterval || !this._currLatInterval) {
				this.__calcInterval();
			}

			var latInterval = this._currLatInterval,
				lngInterval = this._currLngInterval;

			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.lineWidth = this.options.weight;
			ctx.strokeStyle = this.options.color;
			ctx.fillStyle = this.options.fontColor;

			if (this.options.font) {
				ctx.font = this.options.font;
			}
			var txtWidth = ctx.measureText('0').width;
			var txtHeight = 12;
			try {
				var _font_size = ctx.font.split(' ')[0];
				txtHeight = _parse_px_to_int(_font_size);
			}
			catch (e) { }

			var ww = canvas.width,
				hh = canvas.height;

			var canvas_LeftTop = map.containerPointToLatLng(L.point(0, 0));
			var canvas_RightTop = map.containerPointToLatLng(L.point(ww, 0));
			var canvas_RightBottom = map.containerPointToLatLng(L.point(ww, hh));

			var _latitude_Bottom = canvas_RightBottom.lat,
				_latitude_Top = canvas_LeftTop.lat;
			var _longitude_Left = canvas_LeftTop.lng,
				_longitude_Right = canvas_RightTop.lng;

			var _point_per_lat = (_latitude_Top - _latitude_Bottom) / (hh * 0.2);
			if (_point_per_lat < 1) { _point_per_lat = 1; }

			/*
			if (_latitude_Bottom < -90) {
				_latitude_Bottom = -90;
			}
			else {
				_latitude_Bottom = parseInt(_latitude_Bottom - _point_per_lat, 10);
			}
			if (_latitude_Top > 90) {
				_latitude_Top = 90;
			}
			else {
				_latitude_Top = parseInt(_latitude_Top + _point_per_lat, 10);
			}
			*/

			_latitude_Bottom = parseInt(_latitude_Bottom - _point_per_lat, 10);
			_latitude_Top = parseInt(_latitude_Top + _point_per_lat, 10);

			var _point_per_lon = (_longitude_Right - _longitude_Left) / (ww * 0.2);
			if (_point_per_lon < 1) { _point_per_lon = 1; }
			if (_longitude_Left > 0 && _longitude_Right < 0) {
				_longitude_Right += 360;
			}
			_longitude_Right = parseInt(_longitude_Right + _point_per_lon, 10);
			_longitude_Left = parseInt(_longitude_Left - _point_per_lon, 10);

			var ll, latstr, lngstr, _lon_delta = 0.5;
			function __draw_lat_line(self, lat_tick) {
				ll = map.latLngToContainerPoint(L.latLng(lat_tick, _longitude_Left));
				latstr = self.__format_lat(lat_tick);
				txtWidth = ctx.measureText(latstr).width;

				if (curvedLat) {
					if (typeof (curvedLat) == 'number') {
						_lon_delta = curvedLat;
					}

					var __lon_left = _longitude_Left, __lon_right = _longitude_Right;
					if (ll.x > 0) {
						var __lon_left = map.containerPointToLatLng(L.point(0, ll.y));
						__lon_left = __lon_left.lng - _point_per_lon;
						ll.x = 0;
					}
					var rr = map.latLngToContainerPoint(L.latLng(lat_tick, __lon_right));
					if (rr.x < ww) {
						__lon_right = map.containerPointToLatLng(L.point(ww, rr.y));
						__lon_right = __lon_right.lng + _point_per_lon;
						if (__lon_left > 0 && __lon_right < 0) {
							__lon_right += 360;
						}
					}

					ctx.beginPath();
					ctx.moveTo(ll.x, ll.y);
					var _prev_p = null;
					for (var j = __lon_left; j <= __lon_right; j += _lon_delta) {
						rr = map.latLngToContainerPoint(L.latLng(lat_tick, j));
						ctx.lineTo(rr.x, rr.y);

						if (self.options.showLabel && label && _prev_p != null) {
							if (_prev_p.x < 0 && rr.x >= 0) {
								var _s = (rr.x - 0) / (rr.x - _prev_p.x);
								var _y = rr.y - ((rr.y - _prev_p.y) * _s);
								ctx.fillText(latstr, 0, _y + (txtHeight / 2));
							}
							else if (_prev_p.x <= (ww - txtWidth) && rr.x > (ww - txtWidth)) {
								var _s = (rr.x - ww) / (rr.x - _prev_p.x);
								var _y = rr.y - ((rr.y - _prev_p.y) * _s);
								ctx.fillText(latstr, ww - txtWidth, _y + (txtHeight / 2) - 2);
							}
						}

						_prev_p = { x: rr.x, y: rr.y, lon: j, lat: i };
					}
					ctx.stroke();
				}
				else {
					var __lon_right = _longitude_Right;
					var rr = map.latLngToContainerPoint(L.latLng(lat_tick, __lon_right));
					if (curvedLon) {
						__lon_right = map.containerPointToLatLng(L.point(0, rr.y));
						__lon_right = __lon_right.lng;
						rr = map.latLngToContainerPoint(L.latLng(lat_tick, __lon_right));

						var __lon_left = map.containerPointToLatLng(L.point(ww, rr.y));
						__lon_left = __lon_left.lng;
						ll = map.latLngToContainerPoint(L.latLng(lat_tick, __lon_left));
					}

					ctx.beginPath();
					ctx.moveTo(ll.x + 1, ll.y);
					ctx.lineTo(rr.x - 1, rr.y);
					ctx.stroke();
					if (self.options.showLabel && label) {
						var _yy = ll.y + (txtHeight / 2) - 2;
						ctx.fillText(latstr, self.options.latLabelLeftMargin, _yy);
						ctx.fillText(latstr, ww - (txtWidth + self.options.latLabelRightMargin), _yy);
					}
				}
			};


			if (latInterval > 0) {
				for (var i = latInterval; i <= _latitude_Top; i += latInterval) {
					if (i >= _latitude_Bottom) {
						__draw_lat_line(this, i);
					}
				}
				for (var i = 0; i >= _latitude_Bottom; i -= latInterval) {
					if (i <= _latitude_Top) {
						__draw_lat_line(this, i);
					}
				}
			}

			function __draw_lon_line(self, lon_tick) {
				lngstr = self.__format_lng(lon_tick);
				txtWidth = ctx.measureText(lngstr).width;
				var bb = map.latLngToContainerPoint(L.latLng(_latitude_Bottom, lon_tick));

				if (curvedLon) {
					if (typeof (curvedLon) == 'number') {
						_lat_delta = curvedLon;
					}

					ctx.beginPath();
					ctx.moveTo(bb.x, bb.y);
					var _prev_p = null;
					for (var j = _latitude_Bottom; j < _latitude_Top; j += _lat_delta) {
						var tt = map.latLngToContainerPoint(L.latLng(j, lon_tick));
						ctx.lineTo(tt.x, tt.y);

						if (self.options.showLabel && label && _prev_p != null) {
							if (_prev_p.y > 8 && tt.y <= 8) {
								ctx.fillText(lngstr, tt.x - (txtWidth / 2), txtHeight);
							}
							else if (_prev_p.y >= hh && tt.y < hh) {
								ctx.fillText(lngstr, tt.x - (txtWidth / 2), hh - 2);
							}
						}

						_prev_p = { x: tt.x, y: tt.y, lon: lon_tick, lat: j };
					}
					ctx.stroke();
				}
				else {
					var __lat_top = _latitude_Top;
					var tt = map.latLngToContainerPoint(L.latLng(__lat_top, lon_tick));
					if (curvedLat) {
						__lat_top = map.containerPointToLatLng(L.point(tt.x, 0));
						__lat_top = __lat_top.lat;
						if (__lat_top > 90) { __lat_top = 90; }
						tt = map.latLngToContainerPoint(L.latLng(__lat_top, lon_tick));

						var __lat_bottom = map.containerPointToLatLng(L.point(bb.x, hh));
						__lat_bottom = __lat_bottom.lat;
						if (__lat_bottom < -90) { __lat_bottom = -90; }
						bb = map.latLngToContainerPoint(L.latLng(__lat_bottom, lon_tick));
					}

					ctx.beginPath();
					ctx.moveTo(tt.x, tt.y + 1);
					ctx.lineTo(bb.x, bb.y - 1);
					ctx.stroke();

					if (self.options.showLabel && label) {
						ctx.fillText(lngstr, tt.x - (txtWidth / 2), txtHeight + (1 + self.options.lonLabelTopMargin));
						ctx.fillText(lngstr, bb.x - (txtWidth / 2), hh - (3  + self.options.lonLabelBottomMargin));
					}
				}
			};

			if (lngInterval > 0) {
				for (var i = lngInterval; i <= _longitude_Right; i += lngInterval) {
					if (i >= _longitude_Left) {
						__draw_lon_line(this, i);
					}
				}
				for (var i = 0; i >= _longitude_Left; i -= lngInterval) {
					if (i <= _longitude_Right) {
						__draw_lon_line(this, i);
					}
				}
			}
		}
	}

});

L.latlngGraticule = function (options) {
	return new L.LatLngGraticule(options);
};
