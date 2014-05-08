	var agility_webrtc = {

		uuid : null,

		currentUser : null,
		
		last_time_votes_updated : Date.now(),
		
		isPresenter : false,

		slide_moods 	: [
			{ name : "Horrible" , count : 0, value : 0 },
			{ name : "Bad"		, count : 0, value : 1 }, 
			{ name : "Good"		, count : 0, value : 2 }, 
			{ name : "Great"	, count : 0, value : 3 },
			{ name : "Awesome"	, count : 0, value : 4 }
		],

		slide_pics 	: [
			{ pic_url : "images/presentation/01.png" },
			{ pic_url : "images/presentation/02.png" },
			{ pic_url : "images/presentation/03.png" }
		],

		current_slide : 0,

		channelMessages : [],

		presentationVotes : [],
		
		channelName : "agility_webrtc",
		
		credentials : {
			publish_key 	: 'PUB KEY HERE',
			subscribe_key 	: 'SUB KEY HERE'
		},
		
		streams 	: [],
		
		video_constraint_default : "qvga",

		video_constraints 	: [{
			name : "qvga",//Low def
			constraints : {
				mandatory : {
					maxWidth 	: 320,
					maxHeight 	: 180
				}
			}
		},{
			name : "vga",//Regular
			constraints : {
				mandatory : {
					maxWidth 	: 640,
					maxHeight 	: 360
				}
			}
		},{
			name : "hd",//Regular
			constraints : {
				mandatory : {
					maxWidth 	: 1280,
					maxHeight 	: 720
				}
			}
		}],

		init : function(){

			var self = agility_webrtc;
			
			isPresenter = (document.URL.indexOf("presenter") > 0);

			self.setBinds();
			
			self.loadTemplates({
				templates_url : "javascripts/resources/templates.html"
			}, function(){			

				self.showPresentationScreen();

			})
			
			//var UUID_from_storage = agility_webrtc.getFromStore("uuid");

			// if(UUID_from_storage){
			// 	agility_webrtc.uuid = UUID_from_storage.uuid;
			// } else {
			// 	agility_webrtc.uuid = PUBNUB.get_uuid();
			// 	agility_webrtc.setInStore({ "uuid" : agility_webrtc.uuid }, "uuid");
			// }

			self.checkUserMedia(function(){


				agility_webrtc.credentials.uuid = PUBNUB.uuid();

				agility_webrtc.currentUser = PUBNUB.init(agility_webrtc.credentials);	
				
				agility_webrtc.uuid = agility_webrtc.currentUser.UUID;
			
				console.log("I shall be known as uuid: " + agility_webrtc.uuid);

				agility_webrtc.currentUser.subscribe({
					channel 	: agility_webrtc.channelName,
					callback 	: agility_webrtc.onChannelListMessage
				});
				
				agility_webrtc.connectToCallChannel();
				
				agility_webrtc.connectToAnswerChannel();

				if(agility_webrtc.currentUser.onNewConnection){

					agility_webrtc.currentUser.onNewConnection(function(uuid){ 
						console.info("onNewConnection triggered...");
						agility_webrtc.publishStream({ uuid : uuid }); 
					});

				}					


			});


		},

		applyStyles 	: function(){

  
			var parHeight = $(window).height(); /*Get Screen Height*/
			var parWidth = $(window).width(); /*Get Screen Width*/			

			if(parWidth > 769){
				$('.commentsWindowWrap .commentsList').css('height',parHeight-288); //Update Card Holder Height
				$('.sliderWrap .slider').css('height',parHeight-364); /*Update Card Holder Height*/
				$('.sliderWrap .sliderEspectador').css('height',parHeight-320); /*Update Card Holder Height*/
			};

			if(parWidth < 768){
				$('.commentsWindowWrap .commentsList').css('height','auto'); /*Update Card Holder Height*/
				$('.sliderWrap .slider').css('height','auto'); /*Update Card Holder Height*/
				$('.sliderWrap .sliderEspectador').css('height','auto'); /*Update Card Holder Height*/
			};

		},
		
		checkUserMedia : function(callback){
				
			agility_webrtc.can_webrtc = !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||navigator.mozGetUserMedia ||navigator.msGetUserMedia);	
			console.log("This browser can use WebRTC: " + agility_webrtc.can_webrtc);
			if(agility_webrtc.can_webrtc === true){

				$.getScript( "javascripts/resources/vendor/webrtc-beta-pubnub.js" )
					.done(function( script, textStatus ) {
						if(typeof callback === 'function'){
							callback();
						}
					})
					.fail(function( jqxhr, settings, exception ) {
						console.log("there was an error");
					}
				);

			} else {
				if(typeof callback === 'function'){
					callback();
				}
			}

			return this;
								
		},
		
		requestStream : function(options,callback, errorCallback){
			
			console.log('requesting access to stream...');

			var is_presenter = agility_webrtc.currentUser ? agility_webrtc.currentUser.db.get('is_presenter') === "true" : false;

			var stream = _.find(agility_webrtc.streams, function(stream){ return stream.who === (is_presenter ? "presenter" : "mine"); });			

			if(stream != null){

				callback(stream.stream);

			} else {

				navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||navigator.mozGetUserMedia ||navigator.msGetUserMedia);	
				
				if(navigator.getUserMedia != null){

					navigator.getUserMedia(options, function(stream) {
					
						if(typeof callback === 'function'){
							callback(stream);
						}

					}, function(e) {

						console.log('No access to getUserMedia!', e);

						if(e.name === "PermissionDeniedError" && window.location.protocol !== "https:"){
							alert("Must be behind a SSL...");
						}
						
						if(typeof errorCallback === 'function'){
							errorCallback(e);
						}

					});					

				}

			}

		},
		
		callPerson 			: function(options){
			
			console.log('Going to call ' + options.username + ' ' + options.uuid);

			agility_webrtc.currentCallUUID = options.uuid;

			var modalCalling = $("#calling-modal");
			
			var message = "Calling " + options.username + "...";

			modalCalling.find('.calling').text(message);

			modalCalling.find(".btn-danger").data("calling-user", options.uuid);

			modalCalling.modal('show');

			$("#ringer")[0].play();

			modalCalling.removeClass("hide");

			console.log('Publishing call channel message. Caller: ' + agility_webrtc.uuid + ' Callee: ' + options.uuid);


			agility_webrtc.currentUser.publish({
				channel: 'call',
				message: {
					caller 	: {
						uuid 		: agility_webrtc.uuid,
						username 	: agility_webrtc.currentUser.db.get("username")
					},
					callee 	: { 
						uuid 		: options.uuid,
						username 	: options.username
					},
					action 	: "calling"
				}
			});

		},
		
		connectToCallChannel : function(){

			agility_webrtc.currentUser.subscribe({
				channel: 'call',
				callback: function(call) {

					switch(call.action){

						case "calling":

							if(call.caller.uuid !== agility_webrtc.uuid && call.callee.uuid === agility_webrtc.uuid){
								console.log('I am receiving a call from ' + call.caller.uuid);
								agility_webrtc.incomingCallFrom = call.caller.uuid;
								agility_webrtc.onIncomingCall({
									caller 		: call.caller.username,
									call_type 	: call.action
								});
							}

						break;

					}

					
				}
			});

		},
		
		onIncomingCall 		: function(options){

			var modalAnswer = $("#answer-modal");

			modalAnswer.removeClass("hide");		

			var message = "Incoming call...";

			modalAnswer
				.removeClass("hide").find('.caller')
				.text(message)
				.end().find('.modal-footer').show().end().modal('show');
			

			$("#ringer")[0].play();

		},
		
		onCallStarted 		: function(){
		
			console.log('onCallStarted!');
			$('#video-controls').show();
			$('#video-controls #time').html("00:00");
			agility_webrtc.currentCallTime = 0;
			clearInterval(agility_webrtc.timeInterval);
			agility_webrtc.timeInterval = setInterval(agility_webrtc.incrementTimer, 1000);

		},
		
		answerCall 		: function(from){

			console.info("Answering call from " + from);

			var video_constraints = _.find(agility_webrtc.video_constraints, function(video_constraint){
				return video_constraint.name === agility_webrtc.video_constraint_default;
			}).constraints;			

		 	agility_webrtc.requestStream({
		 		video : video_constraints,
		 		audio : true
		 	}, function(stream){

		 		agility_webrtc.currentCallUUID = agility_webrtc.incomingCallFrom;

				var my_stream = _.find(agility_webrtc.streams, function(stream){
					return stream.who === "mine";
				})

				if(my_stream){
					my_stream.stream = stream;
				} else {
					agility_webrtc.streams.push({ who : "mine", stream : stream });
				}	

				console.log('I will publish my stream to the caller ' + agility_webrtc.currentCallUUID);
			 	
			 	agility_webrtc.publishStream({ uuid : from  });

				var modalAnswer = $("#answer-modal");

				modalAnswer.modal("hide");	
				
				$("#ringer")[0].pause()

				console.log('Next I publish my answer to the caller ' + agility_webrtc.incomingCallFrom);
				agility_webrtc.currentUser.publish({
					channel: 'answer',
					message: {
						caller: {
							uuid 		: agility_webrtc.incomingCallFrom
						},
						callee: {
							uuid 		: agility_webrtc.uuid,
							username 	: agility_webrtc.currentUser.db.get("username")
						}
					}
				});


		 	}, function(){

		 		alert("Unable to access stream");

		 	})
			
		},
		
		publishStream : function(options){

			var stream = _.find(agility_webrtc.streams, function(stream){ return stream.who === "mine"; });

			var resumeStreaming = function(stream){

				agility_webrtc.incomingCallFrom = options.uuid;

				agility_webrtc.showStream({ who : "mine" , container : '#me'});

				console.log("Will publish my stream to " + options.uuid + " | Stream : " + stream);

				agility_webrtc.currentUser.publish({ 
					user: options.uuid, 
					stream: stream
				});

				agility_webrtc.currentUser.subscribe({
					user: options.uuid,
					stream: function(bad, event) {
						
						var remote_stream = _.find(agility_webrtc.streams, function(stream){
							return stream.who === "you";
						})

						if(remote_stream){
							remote_stream.stream = event.stream;
						} else {
							agility_webrtc.streams.push({ who : "you", stream : event.stream });
						}

						agility_webrtc.showStream({ who : "you" , container : '#you'});
						
						$("#conference-modal").removeClass("hide").modal("show");

						agility_webrtc.onCallStarted();

					},
					disconnect: function(uuid, pc) {

						//The caller disconnected the call...
						//Let's just hide the conference

						agility_webrtc.onEndCall();
						
					}
				});				


			}

			

			if(stream == null){

				var video_constraints = _.find(agility_webrtc.video_constraints, function(video_constraint){
				 	return video_constraint.name === agility_webrtc.video_constraint_default;
				}).constraints;

				agility_webrtc.requestStream({
					video : video_constraints,
					audio : true
				}, function(stream){

					var my_stream = _.find(agility_webrtc.streams, function(stream){
						return stream.who === "mine";
					})

					if(my_stream){
						my_stream.stream = stream;
					} else {
						agility_webrtc.streams.push({ who : "mine", stream : stream });
					}					

					resumeStreaming(stream);


				}, function(){

					alert("Unable to get stream");

				})

			} else {

				resumeStreaming(stream.stream);

			}

		},
		
		showStream  	: function(options){
			console.log('showing stream: ' + options.who);
			var stream = _.find(this.streams, function(stream){
				return stream.who === options.who;
			}).stream;

			var video = $(options.container)[0];

			if(video){
				video.src = window.URL.createObjectURL(stream);
				$(video).fadeIn(300);
			}

		},	

		connectToAnswerChannel : function(){

			agility_webrtc.currentUser.subscribe({
				channel: 'answer',
				callback: function(data) {
					
					if (data.caller.uuid === agility_webrtc.uuid) {
						
						console.log('Received an answer message from ' + data.callee.uuid);
						
						agility_webrtc.publishStream({ uuid :  data.callee.uuid });

						$("#calling-modal").modal('hide');

						$("#ringer")[0].pause();

						//The user answered the call
						agility_webrtc.onCallStarted();

					}

				}
			});

		},

		showPresentationScreen : function(){

			agility_webrtc.render({
				container 	: "#content",
				template 	: "#presentation_template",
				data 		: {
					user 		: agility_webrtc.currentUser,
					slide_moods : agility_webrtc.slide_moods,
					slides  : agility_webrtc.slide_pics
				}
			})	

		},


		render 				: function(options){

			var content = _.template($(options.template).html(), options.data );

			$(options.container).html(content);	

		},

		render_prepend		: function(options){

			var content = _.template($(options.template).html(), options.data );

			$(options.container).prepend(content);	

		},
		
		loadTemplates : function(options, callback){

			$("#templatesContainer").empty().remove();

			$('<div id="templatesContainer"></div>').appendTo('body');
			
			$('#templatesContainer').load(("javascripts/resources/templates.html?r=" + Date.now()), function(){

				if(typeof callback === "function"){
					callback();
				}

			})

		},

		setInStore 	: function(item, key){

			if(item == null){
				return false;
			}

			item = _.isString(item) ? item : JSON.stringify(item);
			
			window.localStorage.setItem(key, item);

		},
		getFromStore : function(key){
			
			return JSON.parse(window.localStorage.getItem(key));

		},
		
		storeMessageAndDisplayMessages : function(message){

			var self = agility_webrtc;
			self.channelMessages.push(message);
			console.log("Comment received: " + message.message);
			self.render_prepend({
				container 	: ".commentsList",
				template 	: "#channel_chat",
				data 		: {
					messages 		: self.channelMessages,
					this_message	: message,
					app 			: self
				}
			})	
			if($(".doneBtn").is(":visible")){
				$(".deleteBtn").fadeIn();
			}
		},
		
		changeSlide 		: function(options){
			
			if(options == null){
				options = {slide: 1}
			}

			$(".slider").carousel(options.slide);

			active_index = $(".carousel-inner .active").index();

			switch(options.slide){
				case "prev":
					active_index--;
				break;
				case "next":
					if(($(".slideCount li").length - 1) == active_index){
						active_index = 1
					} else {
				 		active_index++;
					}
				break;
				default:
					if(typeof options.slide === 'number')
					{
						active_index = options.slide;
					}	
				break;
			}	

			$(".slideCount li").removeClass("active");
			$($('.slideCount li')[active_index]).addClass("active");

			agility_webrtc.current_slide = active_index;
		},
		
		displayAnalyticsGraphic : function(data){

			if(agility_webrtc.presentationVotes.length > 30){
				agility_webrtc.presentationVotes = _.last(agility_webrtc.presentationVotes,2);
			}

			draw({
				data 		: agility_webrtc.presentationVotes,
				container 	: "#linesWarp",
				width 		: $("#linesWarp").width(),
				height 		: $("#linesWarp").height(),
				moods 		: agility_webrtc.slide_moods
			});

			$("text, .guideWarp").hide();

			if($(".data-point").length > 0){
				setTimeout(function(){

					$(".tipsy").hide();
					$(".data-point:last").trigger("mouseover")
					$(".area").addClass($(".data-point:last").attr("class").split(" ")[1]);
					
				}, 1000);
			}

			agility_webrtc.last_time_votes_updated = Date.now();

		},

		displayBarsGraphic 	: function(filtered_moods){

			$('.bargraph div.graphLabel[data-mood-name] div.bar').css({width:0});

			_.each(filtered_moods, function(mood){
				$('.bargraph div.graphLabel[data-mood-name="' + mood.name + '"] div.bar').animate({width: ((mood.percentage -1) + "%")}, 800, "swingFromTo")
				$('.bargraph div.graphLabel[data-mood-name="' + mood.name + '"] span.mood_count').html(mood.percentage + "%");
			})


		},

		filter_moods : function(){

			var filtered_moods = [];

			var mood_count, filtered_mood;

			_.each(agility_webrtc.slide_moods, function(mood){

				mood_count = _.countBy(agility_webrtc.presentationVotes, function(vote){ return vote.mood_name === mood.name; }).true || 0;

				filtered_mood = {
					name 		: mood.name,
					count 		: mood_count,
					percentage 	: (mood_count * 100 / agility_webrtc.presentationVotes.length).toFixed(2)
				}

				filtered_moods.push(filtered_mood);

			})

			return filtered_moods;

		},

		processVotes 	: function(vote){

			var mood = _.find(agility_webrtc.slide_moods, function(mood){ return mood.name === vote.mood_name; });

			vote.date = vote.created_on ? new Date(vote.created_on) : new Date();

			console.log("Vote " + mood.value + " cast at " + vote.date);

			vote.value = mood.value;

			agility_webrtc.presentationVotes.push(vote);

			filtered_moods = agility_webrtc.filter_moods();

			agility_webrtc.displayBarsGraphic(filtered_moods);

			if((Date.now() - agility_webrtc.last_time_votes_updated) > 500){
				agility_webrtc.displayAnalyticsGraphic();
			}


		},
		
		onChannelListMessage : function(message){

			var self = agility_webrtc;

			switch(message.type){				
				case "VOTE":
					agility_webrtc.processVotes(message);
				break;
				case "SLIDE":
					agility_webrtc.changeSlide(message.options);
				break;
				case "MESSAGE":
					console.log('Comment received - user can_webrtc: ' + message.user.can_webrtc);
					self.storeMessageAndDisplayMessages({
						from		: message.user.name,
						from_uuid 	: message.user.uuid,
						message 	: message.text.replace( /[<>]/g, '' ),
						id 			: message.id,
						can_webrtc 	: message.user.can_webrtc,
						type 		: message.type,
						is_your_message : (message.user.uuid === agility_webrtc.uuid) 	
					});
				break;
				case "DELETE_MESSAGE":
					$('.commentItem[data-message-id="' + message.id + '"]').animate({right:"-100%"}, 200, function(){
						$(this).empty().remove();
					})
				break;
			}

		},
		
		setInStore 	: function(item, key){

			if(item == null){
				return false;
			}

			item = _.isString(item) ? item : JSON.stringify(item);
			
			window.localStorage.setItem(key, item);

		},
		getFromStore : function(key){
			
			return JSON.parse(window.localStorage.getItem(key));

		},

		hideConference : function(){

			$('#conference-modal').modal('hide');

		},

		onEndCall 		: function(){

			agility_webrtc.hideConference();
			agility_webrtc.hideControls();
			agility_webrtc.stopTimer();
			agility_webrtc.stopStream();


		},	

		setCurrentCallTime : function(time){

			$('#video-controls #time').html(time);

		},


		stopStream 		: function(){

			/*
				
				Should not stop the stream if is the presenter...

			*/

			if(agility_webrtc.currentUser.db.get('is_presenter') !== "true"){

				var my_stream = _.find(agility_webrtc.streams, function(stream){
					return stream.who === "mine";
				})

				if(my_stream){
					my_stream.stream.stop();
					agility_webrtc.streams = _.reject(agility_webrtc.streams, function(stream){
						return stream.who === "mine";
					})
				}	

			}

		},		

		incrementTimer 		: function(){


			var minutes, seconds;
			agility_webrtc.currentCallTime += 1;
			var minutes = Math.floor(agility_webrtc.currentCallTime / 60);
			var seconds = agility_webrtc.currentCallTime % 60;
			if (minutes.toString().length === 1) {
				minutes = "0" + minutes;
			}
			if (seconds.toString().length === 1) {
				seconds = "0" + seconds;
			}
			agility_webrtc.setCurrentCallTime("" + minutes + ":" + seconds);

		},

		stopTimer 			: function(){

			clearInterval(agility_webrtc.timeInterval);

		},			

		hideControls : function(){

			$('#video-controls').hide();

		},

		hangupCall : function(){

			agility_webrtc.currentUser.closeConnection(agility_webrtc.currentCallUUID, function(){

				//Connection with the other person was closed...
				agility_webrtc.onEndCall();

			})


		},		
		
		setBinds : function(){

			$(document).on("click", ".control", function(e){
			
				e.preventDefault();
				e.stopPropagation();

				var total_slides = $(".slideCount li").length;

				var is_next = $(this).is(".nextSlide");

				var slide_to = $(".slideCount li.active").data("slide-to");

				if(slide_to != null){
					slide_to = (is_next ? (slide_to + 1) : (slide_to - 1));
				} else {
					slide_to = 0;
				}
				
				slide_to = slide_to < 0 ? (total_slides) : (slide_to === total_slides ? 0 : slide_to);

				slide_to = slide_to === total_slides ? total_slides - 1 : slide_to;

				slide_to = slide_to < 0 ? 0 : slide_to;
				
				$(".slideCount li").removeClass("active");
				$('.slideCount li[data-slide-to="' + slide_to  + '"]').addClass("active");

				$(".slider").carousel(slide_to);
				
				agility_webrtc.currentUser.publish({
					channel: agility_webrtc.channelName,
						message: {
						type: "SLIDE",
						options: { slide: slide_to }
					}
			    });
				
			})
			
			$(document).on("click",".slideCount li:not(.active)", function(e){
				
				e.preventDefault();
				e.stopPropagation();

				if( isPresenter ){

					var el = $(e.target);
					var slide_to = Number($(el).data("slide-to"));
					
					$(".slideCount li").removeClass("active");
					$('.slideCount li[data-slide-to="' + slide_to + '"]').addClass("active");

					agility_webrtc.currentUser.publish({
						channel: agility_webrtc.channelName,
							message: {
							type: "SLIDE",
							options: {slide: slide_to}
						}
					});
	
				}
			}),
			
			$(document).on("click", ".rateOption", function(e){

				var slide_mood = $(this).data("slide-mood");

				if($(this).is(".disabled")){
					return false;
				}

				$(".rateOption").addClass("disabled");

				var mood = _.find(agility_webrtc.slide_moods, function(mood){
					return mood.name === slide_mood;
				})

				$(this).animate({ opacity : 0.5 }, 400, function(){
					$(this).animate({ opacity : 1 }, 400);
					$(".rateOption").removeClass("disabled");
				})

				$(".title").animate({left : "-100%"}, 800);
				$(".thanks_for_rating").animate({left : "0"}, 800);
				
				_.delay(function(){

					$(".title").animate({left : "0"}, 800);
					$(".thanks_for_rating").animate({left : "-100%"}, 800);


				}, 2000);

				agility_webrtc.currentUser.publish({
					channel: agility_webrtc.channelName,
					message : {
						type 		: "VOTE",
						mood_name 	: slide_mood
					}
				});


			});
			
			$(document).on("click", "#btn_send_message", function(e){

				var message = $(".commentsHere").val().trim();

				if(message !== ""){

					var username = "attendee";
					
					agility_webrtc.currentUser.publish({
						channel: agility_webrtc.channelName,
						message : {
							type 	: "MESSAGE",
							text 	: message,
							user 	: {
								name 		: username,
								uuid 		: agility_webrtc.uuid,
								can_webrtc 	: agility_webrtc.can_webrtc
							},
							id 		: Date.now() + "-" + username.toLowerCase().replace(/ /g, '')
						}
					});
					
					console.log(agility_webrtc.uuid + " published comment " + message);

					$(".commentsHere").val("");

				} else {
					$(".commentsHere").val("");
				}

			});
			
			$(document).on("click", ".showCommentBox", function(e){
				$(this).fadeOut("fast");
				$(".commentSlideWrap").fadeIn("fast");
				$(".rateSlideWrap").fadeOut("fast");
			});
			
			$(document).on("click", ".hideCommentBox", function(e){
				$(this).fadeOut("fast");
				$(".showCommentBox").fadeIn("fast");
				$(".commentSlideWrap").fadeOut("fast");
				$(".rateSlideWrap").fadeIn("fast");
			});
			
			$(document).on("click", ".playerWindowWrap .btnShow", function(e){
				$(".playerWindowWrap").fadeOut("fast");
				$(".commentsWindowWrap").fadeIn("fast");
			});

			$(document).on("click", ".commentsWindowWrap .btnShow", function(e){

				$(".commentsWindowWrap").fadeOut("fast");
		    	$(".playerWindowWrap").fadeIn("fast");

			});
			
			$(document).on("click", ".cameraCall", function(e){

				e.preventDefault();

				$(".cameraCall").parents(".initialCall").fadeOut();
				$(".deleteBtn").fadeOut();
				$(".cameraBtn").fadeIn();
				$(".doneBtn").addClass('blue').fadeIn();
				$(".commentItem").addClass('active');
	
			})
			
			$(document).on("click", ".commentsCall", function(e){

	  			$(".commentsCall").parents(".initialCall").fadeOut();
    			$(".deleteBtn").fadeIn();
				$(".cameraBtn").fadeOut();
				$(".doneBtn").removeClass('blue').fadeIn();
				$(".commentItem").addClass('active');
	
			});
			
			$(document).on("click", ".doneBtn", function(e){

				e.preventDefault();

				$(".initialCall").fadeIn();
				$(".deleteBtn, .cameraBtn, .doneBtn, .screenShareBtn").fadeOut();
				$(".commentItem").removeClass('active');

			});
			
			$(document).on("click", ".deleteBtn", function(e){

				e.preventDefault();

				var message_id = $(this).data("message-id");

				$(this).parents('.commentItem').animate({right:"-100%"}, 200, function(){
					
					$(this).empty().remove();

					if($('.commentItem').length === 0 && $(".doneBtn").is(":visible")){
						$(".doneBtn").trigger("click");	
					}

					agility_webrtc.currentUser.publish({
						channel: agility_webrtc.channelName,
							message : {
							type 	: "DELETE_MESSAGE",
							id 		: message_id
						}
					});			

				});

			});
			
			$(document).on("click", "[data-user]", function(e){

				e.preventDefault();

				e.stopPropagation();

				$(".doneBtn").trigger("click");

				$(this).parents(".commentItem").find(".glyphicon-hand-up").removeClass("bouncing").hide();

				var name;

				var callingTo = {
					uuid 		: $(this).data('user'),
					username 	: $(this).data('user-username')
				}


				if(agility_webrtc.currentUser.db.get('is_presenter') === "true"){
					console.log('Going to call ' + callingTo.username + ' ' + callingTo.uuid);
					agility_webrtc.callPerson(callingTo);

				} else {

					var video_constraints = _.find(agility_webrtc.video_constraints, function(video_constraint){
						return video_constraint.name === agility_webrtc.video_constraint_default;
					}).constraints;						

					agility_webrtc.requestStream({
						video : video_constraints,
						audio : true
					}, function(stream){

						var my_stream = _.find(agility_webrtc.streams, function(stream){
							return stream.who === "mine";
						})

						if(my_stream){
							//Stream exists in the streams array, let's update the reference...
							my_stream.stream = stream;
						} else {
							agility_webrtc.streams.push({ who : "mine", stream : stream });
						}

						agility_webrtc.callPerson(callingTo);

					}, function(){

						alert("To call someone please allow access to audio and video...");

					})

				}



			});
			
			$(document).on("click", "#answer", function(e){

				e.preventDefault();
				e.stopPropagation();
				console.log('I have clicked to answer the call');
				agility_webrtc.answerCall(agility_webrtc.incomingCallFrom);

			})

			$(document).on("click", "#hangup", function(e){

				e.preventDefault();

				agility_webrtc.hangupCall();

			})
			
			return this;
		
		}

	}
    
	agility_webrtc.init();

