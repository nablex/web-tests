glueTests.controller('mainController', function ($scope, $http, localStorageService, $interval, $timeout) {

	$scope.compiledDashboards = [];
	$scope.amountOfDashboards = 10;
	
	// support local storage for all data
	if (localStorageService.isSupported) {
		$scope.dashboards = localStorageService.get("dashboards");
		$scope.projects = localStorageService.get("projects");
		$scope.interestedProjects = localStorageService.get("interestedProjects");
		$scope.environments = localStorageService.get("environments");
		$scope.interestedEnvironments = localStorageService.get("interestedEnvironments");
	}
	if (!$scope.dashboards) {
		$scope.dashboards = [];
	}
	if (!$scope.projects) {
		$scope.projects = [];
	}
	if (!$scope.interestedProjects) {
		$scope.interestedProjects = [];
	}
	if (!$scope.environments) {
		$scope.environments = [];
	}
	if (!$scope.interestedEnvironments) {
		$scope.interestedEnvironments = [];
	}
	log("Initial dashboards: " + $scope.dashboards.length);
	log("Initial projects: " + $scope.projects.length);
	log("Initial interestedProjects: " + $scope.interestedProjects.length);
	log("Initial environments: " + $scope.environments.length);
	log("Initial interestedEnvironments: " + $scope.interestedEnvironments.length);

	$scope.reset = function() {
		$scope.dashboards = [];
		$scope.interestedProjects = [];
		$scope.interestedEnvironments = [];
		if (localStorageService.isSupported) {
			localStorageService.set("dashboards", $scope.dashboards);
			localStorageService.set("projects", $scope.projects);
			localStorageService.set("interestedProjects", $scope.interestedProjects);
			localStorageService.set("environments", $scope.environments);
			localStorageService.set("interestedEnvironments", $scope.interestedEnvironments);
		}
		$scope.loadProjects();
		$scope.loadEnvironments();
	};
	
	$scope.toggleInterestedEnvironment = function(environment) {
		var index = $scope.interestedEnvironments.indexOf(environment);
		// not yet in there, add it
		if (index < 0) {
			log("Adding '" + environment + "' to list of interested environments");
			$scope.interestedEnvironments[$scope.interestedEnvironments.length] = environment;
			for (var i = 0; i < $scope.interestedProjects.length; i++) {
				$scope.loadAllLatestDashboards([$scope.interestedProjects[i]], [environment], $scope.amountOfDashboards);
			}
		}
		else {
			log("Removing '" + environment + "' from list of interested environments");
			for (var i = $scope.dashboards.length - 1; i >= 0; i--) {
				if ($scope.dashboards[i].environment == environment) {
					$scope.dashboards.splice(i, 1);
				}
			}
			$scope.interestedEnvironments.splice(index, 1);
		}
		if (localStorageService.isSupported) {
			localStorageService.set("interestedEnvironments", $scope.interestedEnvironments);
		}
	};
	
	$scope.hasInterestedEnvironments = function() {
		return $scope.interestedEnvironments.length > 0;
	};
	
	$scope.isInterestedInEnvironment = function(environment) {
		return $scope.interestedEnvironments.indexOf(environment) >= 0;
	};
	
	$scope.toggleInterestedProject = function(favorite) {
		var index = $scope.interestedProjects.indexOf(favorite);
		// not yet in there, add it
		if (index < 0) {
			log("Adding new favorite project '" + favorite + "'")
			$scope.interestedProjects[$scope.interestedProjects.length] = favorite;
			for (var i = 0; i < $scope.interestedEnvironments.length; i++) {
				$scope.loadAllLatestDashboards([favorite], [$scope.interestedEnvironments[i]], $scope.amountOfDashboards);
			}
		}
		// in there, remove it
		else {
			log("Removing project '" + favorite + "' from favorites")
			for (var i = $scope.dashboards.length - 1; i >= 0; i--) {
				if ($scope.dashboards[i].projectId == favorite) {
					$scope.dashboards.splice(i, 1);
				}
			}
			$scope.interestedProjects.splice(index, 1);
		}
		if (localStorageService.isSupported) {
			localStorageService.set("interestedProjects", $scope.interestedProjects);
		}
	};
	$scope.getProjectLevel = function(project) {
		var level = 0;
		var position = -1;
		while (true) {
			position = project.indexOf("/", position + 1);
			if (position < 0) {
				break;
			}
			level++;
		}
		return level;
	};
	$scope.isInterestedProject = function(favorite) {
		return $scope.interestedProjects && $scope.interestedProjects.indexOf(favorite) >= 0;
	};
	// the "true" at the end makes it an "equality watch" which means it apparently keeps fully copies in memory to compare against
	$scope.$watch("dashboards", function(newValue, oldValue) {
		$scope.compiledDashboards = [];
		for (var i = 0; i < $scope.interestedProjects.length; i++) {
			var compiled = { projectId: $scope.interestedProjects[i], environments: []};
			for (var j = 0; j < $scope.interestedEnvironments.length; j++) {
				var latestDashboards = $scope.getLatestDashboards($scope.interestedProjects[i], $scope.interestedEnvironments[j], $scope.amountOfDashboards);
				latestDashboards.reverse();
				if (latestDashboards.length > 0) {
					var success = [];
					var failed = [];
					var total = [];
					var dates = [];
					var runtimes = [];
					var mostRun = 0;
					var longestRuntime = 0;
					for (var k = 0; k < latestDashboards.length; k++) {
						var runtime = new Date(latestDashboards[k].stopped).getTime() - new Date(latestDashboards[k].started).getTime();
						if (isNaN(runtime)) {
							runtime = 0;
						}
						if (runtime > longestRuntime) {
							longestRuntime = runtime;
						}
						// latestDashboards[k].dashboardId
						success[success.length] = [k, latestDashboards[k].amountSuccessful];
						failed[failed.length] = [k, latestDashboards[k].amountError];
						total[total.length] = [k, latestDashboards[k].amountRun];
						runtimes[runtimes.length] = [k, runtime];
						if (latestDashboards[k].amountRun > mostRun) {
							mostRun = latestDashboards[k].amountRun;
						}
						var month = latestDashboards[k].dashboardId.substring(0, 8).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$2") - 1;
						dates[dates.length] = latestDashboards[k].dashboardId.substring(0, 8).replace(/([0-9]{4})([0-9]{2})([0-9]{2})/, "$3 ") + $scope.months[month];
					}
					log("Longest: " + longestRuntime + " in " + runtimes);
					// rescale runtimes to match the same scaling as the amount of tests so we can fit it into one graph
					// note that the formatting functions also scale!! so basically we are working in tandem with that scaling
					for (var k = 0; k < runtimes.length; k++) {
						runtimes[k][1] = (runtimes[k][1] / longestRuntime) * mostRun;
						if (isNaN(runtimes[k][1])) {
							runtimes[k][1] = 0;
						}
					}
					log(">> " + runtimes);
					
					compiled.environments[compiled.environments.length] = {
						mostRun: mostRun,
						dates: dates,
						environment: $scope.interestedEnvironments[j], 
						dashboards: latestDashboards,
						graphData: [
							{ key: "Success", label: "Success", values: success, area: true, color: "#5cb85c" }, 
							{ key: "Failed", label: "Failed", values: failed, area: true, color: "#d9534f" },
							{ key: "Total", label: "Total", values: total, area: false, color: "#4866ff" },
							{ key: "Relative Runtime", label: "Relative Runtime", values: runtimes, area: false, color: "#ffde00" }
						]
					};
				}
			}
			if (compiled.environments.length > 0) {
				$scope.compiledDashboards[$scope.compiledDashboards.length] = compiled;
			}
		}
	}, true);
	$scope.getChartWidth = function(projectId) {
		return Math.min(400, screen.width - 50);
	};
	$scope.xDataFunction = function(id) {
		return function(data) { return data[0]; };
	};
	$scope.yDataFunction = function(mostRun) {
		return function(data) { return data[1]/mostRun; };
	};
	$scope.xFormattingFunction = function(dates) {
		return function(values) {
			return dates[values];
		};
	};
	$scope.yFormattingFunction = function(mostRun) {
		return function(d) {
			log("FORMATTING: " + d + " * " + mostRun);
			return Math.round(d * mostRun);
		};
	};
	$scope.getProjectCategory = function(projectId) {
		return projectId.replace(/(.*?)\/[^/]+$/, "$1");
	};
	$scope.getProjectName = function(projectId) {
		return projectId.replace(/.*?\/([^/]+)$/, "$1");
	};
	$scope.loadDashboard = function(projectId, environment, dashboardId) {
		$http.get("/project/dashboard/" + projectId + "/" + environment + "/" + dashboardId)
			.success(function(data, status, headers, config) {
				log("Loaded dashboard data for '" + projectId + "' on '" + environment + "' (" + dashboardId + ")");
				$scope.removeDashboard(projectId, environment, dashboardId);
				$scope.dashboards[$scope.dashboards.length] = { projectId: projectId, environment: environment, data: data, dashboardId : dashboardId };
				if (localStorageService.isSupported) {
					localStorageService.set("dashboards", $scope.dashboards);
				}
			})
			.error(function(data, status, headers, config) {
				log("Failed to load dashboard data for '" + projectId + "' on '" + environment + "' (" + dashboardId + ")");
			});
		
	};
	
	$scope.loadAllLatestDashboards = function(projects, environments, amount) {
		if (projects.length > 0 && environments.length > 0) {
			var queryProject = null;
			var queryEnvironment = null;
			for (var i = 0; i < projects.length; i++) {
				if (queryProject != null) {
					queryProject += "," + projects[i];
				}
				else {
					queryProject = projects[i];
				}
			}
			for (var i = 0; i < environments.length; i++) {
				if (queryEnvironment != null) {
					queryEnvironment += "," + environments[i];
				}
				else {
					queryEnvironment = environments[i];
				}
			}
			$http.get("/dashboards?projects=" + queryProject + "&environments=" + queryEnvironment + "&amount="  + amount)
				.success(function(data, status, headers, config) {
					log("Loaded all latest dashboards");
					for (var i = 0; i < data.length; i++) {
						$scope.removeDashboard(data[i].projectId, data[i].environment, data[i].dashboardId);
						$scope.dashboards[$scope.dashboards.length] = data[i];
						if (localStorageService.isSupported) {
							localStorageService.set("dashboards", $scope.dashboards);
						}
					}
				})
				.error(function(data, status, headers, config) {
					log("Failed to load all latest dashboards");
				});
		}
	};

	$scope.loadLatestDashboards = function(projectId, environment) {
		$http.get("/project/lastDashboardIds/" + projectId + "/" + environment + "/5")
			.success(function(data, status, headers, config) {
				log("Loaded latests dashboard ids for '" + projectId + "' on '" + environment);
				for (var i = 0; i < data.length; i++) {
					$scope.loadDashboard(projectId, environment, data[i]);
				} 
			})
			.error(function(data, status, headers, config) {
				log("Failed to load latest dashboard ids for '" + projectId + "' on '" + environment);
			});
	};
	
	$scope.getDashboard = function(projectId, environment, dashboardId) {
		for (var i = 0; i < $scope.dashboards.length; i++) {
			if ($scope.dashboards[i].projectId == projectId && $scope.dashboards[i].environment == environment && $scope.dashboards[i].dashboardId == dashboardId) {
				return $scope.dashboards[i];
			}
		}
		return null;
	};
	
	$scope.getLatestDashboards = function(projectId, environment, amount) {
		var allDashboards = [];
		for (var i = 0; i < $scope.dashboards.length; i++) {
			if ($scope.dashboards[i].projectId == projectId && $scope.dashboards[i].environment == environment) {
				allDashboards[allDashboards.length] = $scope.dashboards[i];
			}
		}
		allDashboards.sort(function(a, b) {
			if (a.dashboardId < b.dashboardId) {
				return -1;
			}
			else if (a.dashboardId > b.dashboardId) {
				return 1;
			}
			else {
				return 0;
			}
		});
		allDashboards.reverse();
		return allDashboards.slice(0, Math.min(allDashboards.length, amount));
	};
	
	$scope.removeDashboard = function(projectId, environment, dashboardId) {
		// first check if we have already have the dashboard and just need to refresh it
		var currentIndex = -1;
		for (var i = 0; i < $scope.dashboards.length; i++) {
			if ($scope.dashboards[i].projectId == projectId && $scope.dashboards[i].environment == environment && $scope.dashboards[i].dashboardId == dashboardId) {
				currentIndex = i;
				break;
			}
		}
		if (i >= 0) {
			$scope.dashboards.splice(i, 1);
			if (localStorageService.isSupported) {
				localStorageService.set("dashboards", $scope.dashboards);
			}
		}
	};
	
	// allows you to refresh the dashboards
	$scope.refreshDashboards = function() {
		$scope.loadAllLatestDashboards($scope.interestedProjects, $scope.interestedEnvironments, $scope.amountOfDashboards);
		// check for new data every 5 minutes
		$timeout(function() {
			$scope.refreshDashboards();
		}, 1000*60*5);
	};

	$scope.$watch("interestedEnvironments", function(newValue, oldValue) {
		// remove dashboards pointing to environments you are no longer interested in
		for (var i = $scope.dashboards.length - 1; i >= 0; i--) {
			if (newValue.indexOf($scope.dashboards[i].environment) < 0) {
				$scope.dashboards.splice(i, 1);
			}
		}
	});
	
	$scope.loadProjects = function() {
		$http.get('/projects')
			.success(function(data, status, headers, config) {
				log("Loaded project list data");
				$scope.projects = data;
				if (localStorageService.isSupported) {
					localStorageService.set("projects", $scope.environments);
				}
			})
			.error(function(data, status, headers, config) {
				log("Could not load project list");
			});
	};
		
	$scope.loadEnvironments = function() {
		$http.get("/environments")
			.success(function(data, status, headers, config) {
				log("Loaded environment data");
				var oldEnvironments = $scope.environments;
				$scope.environments = data;				
				if (localStorageService.isSupported) {
					localStorageService.set("environments", $scope.environments);
				}
				// make sure the interested environments that are no longer valid are removed
				for (var i = $scope.interestedEnvironments.length - 1; i >= 0; i--) {
					if ($scope.environments.indexOf($scope.interestedEnvironments[i]) < 0) {
						$scope.interestedEnvironments.slice(i, 1);
					}
				}
			})
			.error(function(data, status, headers, config) {
				log("Could not load environments");
			});
	};
	
	$scope.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	$scope.formatDate = function(date) {
		date = new Date(date);
		return date.getDate() + " " + $scope.months[date.getMonth()] + " " + date.getHours() + ":" + date.getMinutes();
	};
	$scope.getRuntime = function(start, end) {
		var startDate = new Date(start);
		var endDate = new Date(end);
		return Math.round((endDate - startDate) / (1000 * 60));
	};
	$scope.getRuntimeInSeconds = function(start, end) {
		var startDate = new Date(start);
		var endDate = new Date(end);
		return Math.round((endDate - startDate) / 1000);
	};

	$scope.getLabelClass = function(successful, total) {
		if (successful == total) {
			return "label-success";
		}
		else if (successful / total > 0.8) {
			return "label-warning";
		}
		else {
			return "label-danger";
		}
	};
	$scope.Math = window.Math;
	$scope.loadProjects();	
	$scope.loadEnvironments();
	$scope.refreshDashboards();
});

glueTests.filter('orderObjectBy', function() {
	return function(items, field, reverse) {
		var filtered = [];
		angular.forEach(items, function(item) {
			filtered.push(item);
		});
		filtered.sort(function (a, b) {
			return (a[field] > b[field] ? 1 : -1);
		});
		if(reverse) {
			filtered.reverse();
		}
		log("ordering!! " + field + " > " + JSON.stringify(items));
		log("ordered !! " + field + " > " + JSON.stringify(filtered));
		return filtered;
	};
});
