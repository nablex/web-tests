// define the application module
var glueTests = angular.module('glueTests', ['ui.bootstrap', 'LocalStorageModule', 'nvd3ChartDirectives']);
// configure the local storage
// check for more options: https://github.com/grevory/angular-local-storage
glueTests.config(function (localStorageServiceProvider) {
	// this overrides the default prefix to ensure we don't overwrite other variables of our local storage
	localStorageServiceProvider.setPrefix('glueTests');
});

function log(message) {
	var log = document.getElementById("log");
	log.innerHTML += message + "<br/>"; 
	log.scrollTop = log.scrollHeight;
}

$(document).keypress(function(event) {
	if (event.which == 178) {
		$("#log").toggle(100);
	}
});

