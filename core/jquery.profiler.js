(function($){
	$.extend({
		'sirProfile': function(settings) {		
			//Set up wrappers.
			if(!settings)
				var settings = {};
			
			$.extend({'oAjax':$.ajax});
			$.extend({
				'ajax':function(url, options) {
					$.sirProfiler.ajax(url, options);
					$.oAjax(url, options);
				}
			});
			
			var _requestIdCounter = 0;
			
			var _defaultOptions = {
				'profileRegex':/./,
				'durationThresholds':[100,250,500,1000,2000,3000,4000,5000,10000],
				'mockData': {}
			};
			
			var _settings = $.extend(_defaultOptions,settings);
			
			var _subscribers = {
				'requestStart': [],
				'requestFinish': []
			};
			
			var _requests = {
				'complete': [],
				'waiting': []
			};
			
			var _console = [];
			
			var _ajax = function(url, options) {
				if ( typeof url === "object" ) {
					options = url;
					url = options.url;
				}
				
				if(_settings.profileRegex.test(url)) {
					var request = $.extend({'id':_requestIdCounter++},options);
					if(options.success) {
						var originalFunction = options.success;
						options.success = _responseHandler(originalFunction, {'request':request});
					}
					request.requestTime = new Date();
					request.parsedUrl = _parseUri(request.url);
					request.status = 'waiting';
					_requests.waiting.push(request);
					
					if(_subscribers['requestStart'].length > 0) {
						for(var subscriberIndex in _subscribers['requestStart']) {
							var subscriberFunction = _subscribers['requestStart'][subscriberIndex];
							subscriberFunction(request);
						}
					}
				}
			};
			
			var _log = function() {
				console.originalLog.apply(this, arguments);
				_console.push({'type':'log','data':arguments,'time':(new Date()).getTime()});
			}
			
			var _warn = function() {
				console.originalWarn.apply(this, arguments);
				_console.push({'type':'warning','data':arguments,'time':(new Date()).getTime()});
			}
			
			var _error = function() {
				console.originalError.apply(this, arguments);
				_console.push({'type':'error','data':arguments,'time':(new Date()).getTime()});
			}
			
			if(typeof console != 'undefined') {
				console.originalLog = console.log;
				console.log = _log;
				
				console.originalWarn = console.warn;
				console.warn = _warn;
				
				console.originalError = console.error;
				console.error = _error;
			}
			
			var _subscribe = function(event, callbackFunction) {
				if(typeof _subscribers[event] != 'undefined') {
					_subscribers[event].push(callbackFunction);
				}
			}
			
			var _unsubscribe = function(event, callbackFunction) {
				if(typeof _subscribers[event] != 'undefined' && _subscribers[event].indexOf(callbackFunction) > -1) {
					_subscribers[event].splice(_subscribers[event].indexOf(callbackFunction), 1);
				}
			}
			
			var _responseHandler = function(nativeHandler, data) {
				if(typeof nativeHandler === 'object') {
					data = nativeHandler;
					nativeHandler = undefined;
				}
				
				return function(response) {
					data.request.responseTime = new Date();
					data.request.requestDuration = data.request.responseTime.getTime() - data.request.requestTime.getTime();
					if(data.request.dataType == 'json') {
						data.request.response = $.extend({},response);
						data.request.status = 'success';
						if(typeof response.status != 'undefined')
							data.request.status = response.status;
					} else {
						data.request.response = response;
						data.status = 'success';
					}
					var requestIndex = _requests.waiting.indexOf(data.request);
					if(requestIndex >= 0)
						_requests.waiting.splice(requestIndex, 1);
					_requests.complete.push(data.request);
					
					if(_subscribers['requestFinish'].length > 0) {
						for(var subscriberIndex in _subscribers['requestFinish']) {
							var subscriberFunction = _subscribers['requestFinish'][subscriberIndex];
							subscriberFunction(data.request);
						}
					}
					
					if(typeof nativeHandler === 'function') {
						for(regExIndex in _settings.mockData) {
							if(regExIndex.test(data.request.url))
								response = _settings.mockData[regExIndex];	
						}
						nativeHandler(response);
					}
				};
			};
			
			var _splitQueryString = function(request) {
				var queryString = request.parsedUrl.query;
				if(!queryString)
					return {};
					
				var queryPairs = query.split('&');
				var queryParameters = {};
				for (var i=0; i<queryPairs.length; i++) {
					if (queryPairs[i].indexOf('=') > 0) {
						var splitPair = queryPairs[i].split('=');
						var parameterKey = splitPair[0];
						var parameterValue = splitPair[1];
						queryParameters[parameterKey] = parameterValue;
					}
				}
				
				return queryParameters;
			}
			
			/*
			 *
			 * Slightly modified from http://blog.stevenlevithan.com/archives/parseuri
			 *
			 */
			var _parseUri = function(str) {
				var options = {
					strictMode: false,
					key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
					q:   {
						name:   "queryKey",
						parser: /(?:^|&)([^&=]*)=?([^&]*)/g
					},
					parser: {
						strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
						loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
					}
				};
				var	o   = options,
					m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
					uri = {},
					i   = 14;
				while (i--) uri[o.key[i]] = m[i] || "";
				uri[o.q.name] = {};
				uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
					if ($1) uri[o.q.name][$1] = $2;
				});
				return uri;
			};
			
			var _getGroupedRequestsByMethod = function(method, filteredRequests) {
				if(!method)
					var method = 'endPoint';
				var groupingMethods = {
					'endPoint': function(request) {
						return request.parsedUrl.path;
					},
					'domain': function(request) {
						return request.parsedUrl.host;
					},
					'protocol': function(request) {
						return request.parsedUrl.protocol;
					},
					'requestMethod': function(request) {
						return request.type;
					},
					'requestDuration': function(request) {
						if(request.status == 'waiting')
							return 'Response Pending';
						var duration = request.requestDuration;
						
						var previousThreshold = 0;
						var suffixed = function(time) {
							if(time >= 1000)
								return Math.round(time/100)/10+'s';
							else
								return time+'ms';
						}
						for(var thresholdIndex = 0; thresholdIndex < _settings.durationThresholds.length; thresholdIndex++) {
							var threshold = _settings.durationThresholds[thresholdIndex];
							if(duration <= threshold)
								return (previousThreshold > 0? 'Between ' + suffixed(previousThreshold+1) + ' and ' : 'Less than ') + suffixed(threshold);
							previousThreshold = threshold;
						}
						return suffixed(threshold) + '+';
					}
				};
				
				var groupingMethod = groupingMethods[method];
				var requests = _requests.complete.concat(_requests.waiting);
				
				if(filteredRequests)
					requests = filteredRequests;
				
				var numberOfRequests = requests.length;
				
				if(numberOfRequests == 0)
					return {};
				
				var groupedRequests = {};
				
				for(var requestIndex = 0; requestIndex < numberOfRequests; requestIndex++) {
					var request = requests[requestIndex];
					
					var requestGroup = groupingMethod(request);
					
					if(typeof groupedRequests[requestGroup] == 'undefined')
						groupedRequests[requestGroup] = [];
					groupedRequests[requestGroup].push(request);
				} 
				return groupedRequests;
			}
			
			var _getFilteredAndGroupedRequestsByType = function(filterType,filterValue,groupMethod,preFilteredRequests) {
				if(!preFilteredRequests)
					var preFilteredRequests = _requests.complete;
				
				var filteredRequests = _getFilteredRequestsByType(filterType,filterValue,preFilteredRequests);
				var groupedFilteredRequests = _getGroupedRequestsByMethod(groupMethod,filteredRequests);
				
				return groupedFilteredRequests;
			};
			
			var _getFormattedUrlForGroupType = function(groupType, request) {
				var formatMethods = {
					'endPoint': function(request) {
						return request.parsedUrl.query? '?'+request.parsedUrl.query:'[No Query String]';
					},
					'domain': function(request) {
						return request.parsedUrl.path;
					},
					'protocol': function(request) {
						return '<span class="domain">('+request.parsedUrl.host+')</span> '+request.parsedUrl.path;
					},
					'requestMethod': function(request) {
						return '<span class="domain">('+request.parsedUrl.host+')</span> '+request.parsedUrl.path;
					},
					'requestDuration': function(request) {
						return '<span class="domain">('+request.parsedUrl.host+')</span> '+request.parsedUrl.path;
					}
				}
				return formatMethods[groupType](request);
			};
			
			var _getFilteredRequestsByType = function(type, filter, preFilteredRequests) {
				var filterMethods = {
					'searchUrl':function(request, filter) {
						return (request.url.indexOf(filter) > -1);
					},
					'containsQueryParameter':function(request, filter) {
						var queryParameters = _splitQueryString(request);
						if(typeof filter == 'string' && typeof queryParameters[filter] != 'undefined')
							return true;
						if(typeof filter == 'object' && typeof queryParameters[filter['key']] != 'undefined' && queryParameters[filter['key']] == filter['value'])
							return true;
						else
							return false;
					},
					'usesProtocol':function(request, filter) {
						return filter.toLowerCase() == request.parsedUrl.protocol.toLowerCase();
					},
					'slowerThan':function(request, filter) {
						return (request.requestDuration > filter);
					},
					'fasterThan':function(request, filter) {
						return (request.requestDuration < filter);
					}
				}
				
				var filterMethod = filterMethods[type];
				
				var requests = _requests.complete;
				if(preFilteredRequests)
					requests = preFilteredRequests;
				
				var acceptedRequests = [];
				var numberOfRequests = requests.length;
				if(numberOfRequests == 0)
					return;
				
				for(var requestIndex = 0; requestIndex < numberOfRequests; requestIndex++) {
					var request = requests[requestIndex];
					
					if(filterMethod(request, filter))
						acceptedRequests.push(request);
				}
				
				return acceptedRequests;
			}
			
			var _getRequestById = function(id) {
				var waitingCount = _requests.waiting.length;
				var completeCount = _requests.complete.length;
				
				for(var completeIndex = 0; completeIndex < completeCount; completeIndex++) {
					var request = _requests.complete[completeIndex];
					if(request.id == id)
						return request;
				}
				for(var waitingIndex = 0; waitingIndex < waitingCount; waitingIndex++) {
					var request = _requests.waiting[waitingIndex];
					if(request.id == id)
						return request;
				}
				return false;
			};
			
			var _getConsoleData = function(logTypes) {
				var filteredLogs = [];
				for(var logEntryIndex in _console) {
					var logEntry = _console[logEntryIndex];
					if(logTypes.indexOf(logEntry['type']) > -1)
						filteredLogs.push(logEntry);
				}
				return filteredLogs;
			};
			
			// Map to public functions.
			this.settings = _settings;
			this.ajax = _ajax;
			this.subscribe = _subscribe;
			this.unsubscribe = _unsubscribe;
			
			this.log = _log;
			this.warn = _warn;
			this.error = _error;
			this.getConsoleData = _getConsoleData;
			
			this.getRequestById = _getRequestById;
			this.getFilteredRequestsByType = _getFilteredRequestsByType;
			this.getFormattedUrlForGroupType = _getFormattedUrlForGroupType;
			this.getFilteredAndGroupedRequestsByType = _getFilteredAndGroupedRequestsByType;
			this.getGroupedRequestsByMethod = _getGroupedRequestsByMethod;
		},
		'profile':function(settings){
			$.extend({'sirProfiler':new $.sirProfile(settings)});
		}
	});
})(jQuery);