	var agility_webrtc = {

		uuid : null,

		currentUser : null,
		
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
			publish_key 	: 'pub-c-24de4b19-9284-43ee-b600-5e7b38d31f5b',
			subscribe_key 	: 'sub-c-9cc28534-8892-11e3-baad-02ee2ddab7fe'
		},

		init : function(){

			var self = agility_webrtc;
			
			isPresenter = (document.URL.indexOf("presenter") > 0);
			
			agility_webrtc.currentUser = PUBNUB.init(agility_webrtc.credentials);	
			
			agility_webrtc.currentUser.subscribe({
				channel 	: agility_webrtc.channelName,
				callback 	: agility_webrtc.onChannelListMessage
			});
			
			self.setBinds();
			
			self.loadTemplates({
				templates_url : "javascripts/resources/templates.html"
			}, function(){			

				self.showPresentationScreen();

			})


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
		
		onChannelListMessage : function(message){

			var self = agility_webrtc;

			switch(message.type){				
				case "SLIDE":
					agility_webrtc.changeSlide(message.options);
				break;
			}

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
				
			});
			
			$(document).on("click",".slideCount li:not(.active)", function(e){
				
				e.preventDefault();
				e.stopPropagation();

				
				if( agility_webrtc.isPresenter ){

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




			});
			
			return this;
		
		}

	}
    
	agility_webrtc.init();

