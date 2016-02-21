window.V = window.V || {};

(function($) {

	// recently used/favorites
	// TODO: move to index.js and only call on pages that use favorites
	V.Favorites = {
		initialize: function() {
			$('.recentlyused').hover(function(){
					$(this).find('.favorite').toggle();
			});
			$('.favorite').click(function(e){
				e.preventDefault();
				$(this).toggleClass('favorite-sticky');
				$.get("/controlpanel/my_favorites/update_favorites.cmp?sticky=" + $(this).attr('id'));
			});
			$('.recent_tracker').click(function(e){
                e.preventDefault();
				$.post("/controlpanel/my_favorites/update_favorites.cmp", { async: false, recent: $(this).attr('id') } );
                setTimeout("window.location.href= '"+$(this).attr('href')+"'",100);
            });

		}
	};


	// initialize top nav (from /controlpanel/beta/tabs.xmp)
	if(V && V.nav){
		YAHOO.util.Event.onContentReady("cp_nav", V.nav.initialize);
	}

	// initialize marketplace
	if(V && V.marketplace){
		V.marketplace.initialize();
	}

	// initialize quickstart
	if(V && V.quickstart){
		V.quickstart.initialize();
	}

	// initialize favorites
	V.Favorites.initialize();

	/*
	$('.btn-mobile-menu').click(function(e){
		e.preventDefault();
		$('#cp_stylesheet').toggleClass('mobile-menu-open');
	});
	*/


}(window.jQuery));
