$(function() { //jQuery handler for doing things once the DOM is ready

	$('.grid-item-toggle .grid-item-body, .grid-item-toggle .grid-item-body-alt').on('click', function(e) {
		//prevent toggling element size if user was selecting text -- if not, they will have just deselected any previously selected text by clicking
		if(document.getSelection().type === 'Range') return;
		//also prevent hyperlink interception
		if(e.target.nodeName === "A") return;
		e.preventDefault();
		var par = $(this).closest('.grid-item');
		var inner = $(this).closest('.grid-inner');
		//toggles previously selected element off, when applicable:
		if(!par.hasClass("grid-item-focus")) {
			var cElem = $('.grid-item-focus');
			if(cElem.length !== 0) {
				cElem.toggleClass('grid-item-focus');
				var cInner = cElem.find('.grid-inner');
				collapsePreview(cInner);
				var func = window[cElem.data("grid-toggle-action")];
				if(func !== undefined)
					func(cElem, false);
			}
		}
		par.toggleClass('grid-item-focus');
		var newState = par.hasClass('grid-item-focus');
		if(newState) expandPreview(inner);
		else collapsePreview(inner);
		var func = window[par.data("grid-toggle-action")];
		if(func !== undefined)
			func(par, newState);
	});
	
	var expandPreview = function($inner) {
		var origPos = $inner.offset();
		var origW = $inner.width();
		var origH = $inner.height();
		$inner.finish().css({
			position: 'fixed',
			top: origPos.top  - $(window).scrollTop(),
			left: origPos.left,
			width: origW,
			height: origH,
			'z-index': 2})
			.animate({
			top: '10%',
			left: '10%',
			width: '80%',
			height: '80%'}, 200);
	}
	var collapsePreview = function($inner) {
		if($inner === undefined || $inner.length === 0) return;
		var origPos = $inner.offset();
		var origW = $inner.width();
		var origH = $inner.height();
		
		$inner.css({visibility: 'hidden', position: '', top: '', left: '', width: '', height: ''});
		var newPos = $inner.offset();
		var newW = $inner.width();
		var newH = $inner.height();
		$inner.css({visibility: '', position: 'fixed', top: origPos.top - $(window).scrollTop(), left: origPos.left, width: origW, height: origH});
		$inner.finish()
			.animate({
			top: newPos.top - $(window).scrollTop(),
			left: newPos.left,
			width: newW,
			height: newH}, 200, function() {
				$inner.css({
					position: '',
					top: '',
					left: '',
					width: '',
					height: '',
					'z-index': ''
				});
			});
		
	}
	
	var getRem = function() {
		return parseInt($('html').css('font-size'))
	}
	
	var calculateGridBasis = function($container) {
		return window.getComputedStyle($container[0]).getPropertyValue('grid-template-columns').split("px ")[0];
	}
	
	var calculateGridSize = function($elem, useAlternate = false) {
		var colsize = calculateGridBasis($elem.closest('.grid-wrap'));
		
		var w = $elem.attr('data-width-basis');
		if(w === undefined) w = 1;
		var h = $elem.attr('data-height-basis');
		if(h === undefined) h = 1;
		return [w*colsize, h*colsize, w, h];
	}
	
	var calculateGridSizeRatio = function($elem) {
		var [wfr, hfr, wFrom, hFrom] = calculateGridSize($elem);
		var [wtr, htr, wTo, hTo] = calculateGridSize($elem, true);
		return [wFrom/wTo, hFrom/hTo];
	}
	
	var onWindowResize = function() {
		//find calculated column size and apply to elements
		$('.grid-item').each(function(i) {
			var [w, h, wr, hr] = calculateGridSize($(this));
			$(this).width(w);
			$(this).height(h); //square cells
			$(this).css({'grid-row': 'auto / span ' + hr, 'grid-column': 'auto / span ' + wr});
		});
	}
	
	$(window).resize(onWindowResize);
	
	onWindowResize();
});
