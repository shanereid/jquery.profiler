(function($){
	$.extend({
		'profilerUi':function() {
			var profiler = $.sirProfiler;
			var headID = document.getElementsByTagName("head")[0];
			var cssNode = document.createElement('link');
			cssNode.type = 'text/css';
			cssNode.rel = 'stylesheet';
			cssNode.href = '../ui/assets/styles.css';
			cssNode.media = 'screen';
			headID.appendChild(cssNode);
			
			var _currentGroup = 'endPoint';
			var _rendered = false;
			var _usedGroups = [];
			
			var _getResponseHtml = function(request) {
				var responseString = JSON.stringify(request.response);
				var responseHtml = _formatJson(responseString);
				return responseHtml;
			}
			
			profiler.subscribe('requestStart',function(request) {
				if(_rendered)
					_updateListPage(request);
			});
			
			profiler.subscribe('requestFinish',function(request) {
				if(_rendered)
					_updateListPage(request);
					
				console.log('This is correct, right?', _rendered);
			});
			
			var _updateListPage = function(newRequest) {
				var groupedRequest = profiler.getGroupedRequestsByMethod(_currentGroup, [newRequest]);
				var htmlString = '';
				
				var groupName;
				
				for(groupName in groupedRequest) {
				
				}
				
				if(_usedGroups.indexOf(groupName) == -1)
					_usedGroups.push(groupName);
				
				var groupId = _usedGroups.indexOf(groupName);
				
				htmlString += 
					'<div class="data-tier2" id="request-bottom-level-' + newRequest.id + '">' +
						'<div class="data-line">' +
							'<a class="dl-link"><span class="arrow"></span>' + profiler.getFormattedUrlForGroupType(_currentGroup, newRequest) + '</a>' +
							'<div class="status ' + newRequest.status + '">' +
								'<span class="data-status"></span>' +
							'</div>' +
							(newRequest.dataType == 'json'? '<a class="preview" title="See the Response" rel="' + newRequest.id + '"></a>' : '') +
						'</div>' +
						'<div class="data-tier3" style="height: ' + 44*2 + 'px">' +
							'<div class="data-details">' +
								'<span class="details-info">Duration</span>' +
								'<span>' + (newRequest.requestDuration >= 1000? Math.round(newRequest.requestDuration/100)/10 + 's' : newRequest.requestDuration + 'ms' ) + '</span>' +
							'</div>' +
							'<div class="data-details">' +
								'<span class="details-info">Request Method</span>' +
								'<span>' + newRequest.type + '</span>' +
							'</div>' +
						'</div>';
				if(newRequest.dataType == 'json') {
					htmlString +=
						'<div class="data-preview">' +
						_getResponseHtml(newRequest) +
						'</div>';
				}
				htmlString +=
					'</div>';
				
				$('#request-bottom-level-' + newRequest.id).remove();
				
				_cleanEmptyGroups();
				
				if($('#profiler-ui-header-'+groupId).length > 0) {
					$('#profiler-ui-header-'+groupId).append(htmlString);
					_changeGroupCount(groupId,1);
				} else {
					htmlString = '<div class="data-tier1" id="profiler-ui-header-' + groupId + '">' +
						'<a class="dc-link"><span class="arrow"></span>' + groupName + ' <span class="request-number">(1)</span></a>' +
							htmlString +
						'</div>';
					$('#debug-console .debug-data').append(htmlString);
				}
				
				$('#request-bottom-level-' + newRequest.id + ', #request-bottom-level-' + newRequest.id + ' .data-tier3, #request-bottom-level-' + newRequest.id + ' .data-preview').hide();
			};
			
			var _cleanEmptyGroups = function() {
				$('#debug-console .data-tier1').each(function(){
					if($(this).find('.data-tier2').length == 0)
						$(this).remove();
				});
			}
			
			var _changeGroupCount = function(groupId, difference) {
				var group = $('#profiler-ui-header-'+groupId);
				if(group.length > 0) {
					var currentCount = group.find('span.request-number');
					var intCount = parseInt(currentCount.html().replace(/[()]/gi, ''));
					var finalCount = "(" + (intCount + difference) + ")";
					
					currentCount.html(finalCount);
				}
			}
			
			var _renderListPage = function() {
				var htmlString = '';
				var requests = profiler.getGroupedRequestsByMethod(_currentGroup);
				for(var groupName in requests) {
					var requestGroup = requests[groupName];
					
					if(_usedGroups.indexOf(groupName) == -1)
						_usedGroups.push(groupName);
					
					var groupId = _usedGroups.indexOf(groupName);
					
					htmlString += 
						'<div class="data-tier1" id="profiler-ui-header-' + groupId + '">' +
							'<a class="dc-link"><span class="arrow"></span>' + groupName + ' <span class="request-number">(' + requestGroup.length + ')</span></a>';
					for(var requestIndex in requestGroup) {
						var request = requestGroup[requestIndex];
						
						htmlString += 
							'<div class="data-tier2">' +
								'<div class="data-line">' +
									'<a class="dl-link"><span class="arrow"></span>' + profiler.getFormattedUrlForGroupType(_currentGroup, request) + '</a>' +
									'<div class="status ' + request.status + '">' +
										'<span class="data-status"></span>' +
									'</div>' +
									(request.dataType == 'json'? '<a class="preview" title="See the Response" rel="' + request.id + '"></a>' : '') +
								'</div>' +
								'<div class="data-tier3" style="height: ' + 44*2 + 'px">' +
									'<div class="data-details">' +
										'<span class="details-info">Duration</span>' +
										'<span>' + (request.requestDuration >= 1000? Math.round(request.requestDuration/100)/10 + 's' : request.requestDuration + 'ms' ) + '</span>' +
									'</div>' +
									'<div class="data-details">' +
										'<span class="details-info">Request Method</span>' +
										'<span>' + request.type + '</span>' +
									'</div>' +
								'</div>';
						if(request.dataType == 'json') {
							htmlString +=
								'<div class="data-preview">' +
								_getResponseHtml(request) +
								'</div>';
						}
						htmlString +=
							'</div>';
					}
					htmlString += '</div>';
				}
				if($('#debug-console').length > 0)
					$('#debug-console .debug-data').html(htmlString);
				
				$('#debug-console ul.sort-bar a[title='+_currentGroup+']').addClass('active');
				
				var tier='#debug-console .data-tier2, #debug-console .data-tier3, #debug-console .data-preview';
				
				$(tier).hide();
			};
			
			var _render = function() {
				var htmlString =
					'<div id="debug-console">' +
						'<ul class="nav-bar">' + 
							'<li><a class="bar-button debug-type active" title="requests">Requests</a></li>' + 
							'<li><a class="bar-button debug-type" title="domain">Widgets</a></li>' + 
							'<li><a class="bar-button debug-type" title="console">Console</a></li>' + 
						'</ul>' +
						'<ul class="sort-bar">' + 
							'<li><a class="bar-button sort-by" title="endPoint">Endpoint</a></li>' + 
							'<li><a class="bar-button sort-by" title="domain">Domain</a></li>' + 
							'<li><a class="bar-button sort-by" title="protocol">Protocol</a></li>' + 
							'<li><a class="bar-button sort-by" title="requestMethod">Method</a></li>' + 
							'<li><a class="bar-button sort-by" title="requestDuration">Duration</a></li>' + 
						'</ul>' +
						'<div class="debug-data">' +
						'</div>' +
					'</div>';
				$('html').css('padding-bottom', '300px');
				$('body').prepend(htmlString);
				
				$('#debug-console .sort-bar .sort-by').live('click',function () {
					$('#debug-console .sort-bar .sort-by').removeClass('active');
					$(this).addClass('active');
					_currentGroup = $(this).attr('title');
					_renderListPage();
				});
				
				$('#debug-console a.preview').live('click',function() {
					$(this).parent().siblings('.data-preview').slideToggle(500);
				});
				
				$('#debug-console a.dc-link').live('click',function () {
					$(this).siblings('.data-tier2').slideToggle(500);
					$(this).toggleClass('active');
				});
				
				$('#debug-console a.dl-link').live('click',function () {
					$(this).parent().siblings('.data-tier3').slideToggle(500);
					$(this).toggleClass('active');
				});
				
				_renderListPage();
				_rendered = true;
			};
			
			// Modified version of https://github.com/jamiew/jsonview-chrome
			var _formatJson = function(jsonString) {
				this.data = jsonString;
				this.uri = document.location.href;
				
				if(/^\<pre.*\>(.*)\<\/pre\>$/.test(this.data)){  
					this.data = this.data.replace(/<(?:.|\s)*?>/g, ''); //Aggressively strip HTML.
				}
				
				var json_regex = /^\s*([\[\{].*[\}\]])\s*$/; // Ghetto, but it works
				var jsonp_regex = /^[\s\u200B\uFEFF]*([\w$\[\]\.]+)[\s\u200B\uFEFF]*\([\s\u200B\uFEFF]*([\[{][\s\S]*[\]}])[\s\u200B\uFEFF]*\);?[\s\u200B\uFEFF]*$/;
				var jsonp_regex2 = /([\[\{][\s\S]*[\]\}])\);/ // more liberal support... this allows us to pass the jsonp.json & jsonp2.json tests
				var is_json = json_regex.test(this.data);
				var is_jsonp = jsonp_regex.test(this.data);
				
				if(is_json || is_jsonp){
					
					// JSONFormatter json->HTML prototype straight from Firefox JSONView
					// For reference: http://code.google.com/p/jsonview
					function JSONFormatter() {
						// No magic required.
					}
					JSONFormatter.prototype = {
						htmlEncode: function (t) {
							return t != null ? t.toString().replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : '';
						},
						decorateWithSpan: function (value, className) {
							return '<span class="' + className + '">' + this.htmlEncode(value) + '</span>';
						},
						
						// Convert a basic JSON datatype (number, string, boolean, null, object, array) into an HTML fragment.
						valueToHTML: function(value) {
							var valueType = typeof value;
							
							var output = "";
							if (value == null) {
								output += this.decorateWithSpan('null', 'null');
							}
							else if (value && value.constructor == Array) {
								output += this.arrayToHTML(value);
							}
							else if (valueType == 'object') {
								output += this.objectToHTML(value);
							} 
							else if (valueType == 'number') {
								output += this.decorateWithSpan(value, 'num');
							}
							else if (valueType == 'string') {
								if (/^(http|https):\/\/[^\s]+$/.test(value)) {
									output += '<a href="' + value + '">' + this.htmlEncode(value) + '</a>';
								} else {
									output += this.decorateWithSpan('"' + value + '"', 'string');
								}
							}
							else if (valueType == 'boolean') {
								output += this.decorateWithSpan(value, 'bool');
							}
							
							return output;
						},
						
						// Convert an array into an HTML fragment
						arrayToHTML: function(json) {
							var output = '[<ul class="array collapsible">';
							var hasContents = false;
							for ( var prop in json ) {
								hasContents = true;
								output += '<li>';
								output += this.valueToHTML(json[prop]);
								output += '</li>';
							}
							output += '</ul>]';
							
							if ( ! hasContents ) {
								output = "[ ]";
							}
							
							return output;
						},
						
						// Convert a JSON object to an HTML fragment
						objectToHTML: function(json) {
							var output = '{<ul class="obj collapsible">';
							var hasContents = false;
							for ( var prop in json ) {
								hasContents = true;
								output += '<li>';
								output += '<span class="prop">' + this.htmlEncode(prop) + '</span>: ';
								output += this.valueToHTML(json[prop]);
								output += '</li>';
							}
							output += '</ul>}';
							
							if ( ! hasContents ) {
								output = "{ }";
							}
							
							return output;
						},
						
						// Convert a whole JSON object into a formatted HTML document.
						jsonToHTML: function(json, callback, uri) {
							var output = '';
							if( callback ){
								output += '<div class="callback">' + callback + ' (</div>';
								output += '<div id="json">';
							}else{
								output += '<div id="json">';
							}
							output += this.valueToHTML(json);
							output += '</div>';
							if( callback ){
								output += '<div class="callback">)</div>';
							}
							return this.toHTML(output, uri);
						},
						
						// Produce an error document for when parsing fails.
						errorPage: function(error, data, uri) {
							// var output = '<div id="error">' + this.stringbundle.GetStringFromName('errorParsing') + '</div>';
							// output += '<h1>' + this.stringbundle.GetStringFromName('docContents') + ':</h1>';
							var output = '<div id="error">Error parsing JSON: '+error.message+'</div>';
							output += '<h1>'+error.stack+':</h1>';      
							output += '<div id="json">' + this.htmlEncode(data) + '</div>';
							return this.toHTML(output, uri + ' - Error');
						},
						
						// Wrap the HTML fragment in a full document. Used by jsonToHTML and errorPage.
						toHTML: function(content, title) {
							return content;
						}
					};
					
					
					
					
					// Sanitize & output -- all magic from JSONView Firefox
					this.jsonFormatter = new JSONFormatter();
					
					// This regex attempts to match a JSONP structure:
					//    * Any amount of whitespace (including unicode nonbreaking spaces) between the start of the file and the callback name
					//    * Callback name (any valid JavaScript function name according to ECMA-262 Edition 3 spec)
					//    * Any amount of whitespace (including unicode nonbreaking spaces)
					//    * Open parentheses
					//    * Any amount of whitespace (including unicode nonbreaking spaces)
					//    * Either { or [, the only two valid characters to start a JSON string.
					//    * Any character, any number of times
					//    * Either } or ], the only two valid closing characters of a JSON string.
					//    * Any amount of whitespace (including unicode nonbreaking spaces)
					//    * A closing parenthesis, an optional semicolon, and any amount of whitespace (including unicode nonbreaking spaces) until the end of the file.
					// This will miss anything that has comments, or more than one callback, or requires modification before use.
					var outputDoc = '';
					// text = text.match(jsonp_regex)[1]; 
					var cleanData = '',
					callback = '';
					
					var callback_results = jsonp_regex.exec(this.data);
					if( callback_results && callback_results.length == 3 ){
						callback = callback_results[1];
						cleanData = callback_results[2];
					} else {
						cleanData = this.data;
					}
					
					// Covert, and catch exceptions on failure
					try {
						// var jsonObj = this.nativeJSON.decode(cleanData);
						var jsonObj = JSON.parse(cleanData);
						if ( jsonObj ) {        
							outputDoc = this.jsonFormatter.jsonToHTML(jsonObj, callback, this.uri);
						} else {
							throw "There was no object!";
						}
					} catch(e) {
						outputDoc = this.jsonFormatter.errorPage(e, this.data, this.uri);
					}
					
					
					return outputDoc;
				}
			};
			
			this.render = _render;
		}
	});
})(jQuery);

jQuery(document).ready(function(){
	$.extend({'sirProfilerUi':new $.profilerUi()});
	$.sirProfilerUi.render();
});