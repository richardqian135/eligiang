(function (){
	function walkmeGetCookie(name) {
		var i, x, y, ARRcookies = document.cookie.split(";");
	 
		for (i = 0; i < ARRcookies.length; i++) {
			x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
			y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
			x = x.replace(/^\s+|\s+$/g, "");
	 
			if (x == name) {
				return y;
			}
		}
	 
		return null;
	}

	function writeToLog(message) {
		if (logEnabled) {
			console.log(message);
		}
	}

	var logEnabled = walkmeGetCookie("walkme_prelib_log_enabled");
	var originalDataLoadedCallback = window.walkme_data_finished_loading_callback;

	window.walkme_data_finished_loading_callback = function() {
		if (originalDataLoadedCallback) {
			originalDataLoadedCallback();
		}

		var siteConfig = _walkMe.getSiteConfig();

		if (!siteConfig.ShowWalkMe) {
			writeToLog("No onboarding");
			siteConfig.ShowWalkMe = 1;
			siteConfig.TodoListSettings.isActive = 0;
		}
		else {
			writeToLog("With onboarding");
		}
	};

	if (window.walkme_pre_lib_loaded){
		walkme_pre_lib_loaded();
	}
})();