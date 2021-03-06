/* --------------------------------------------------------------------

  Chevereto
  http://chevereto.com/

  @version	2.6.0
  @author	Rodolfo Berríos A. <http://rodolfoberrios.com/>
			<inbox@rodolfoberrios.com>

  Copyright (C) 2013 Rodolfo Berríos A. All rights reserved.
  
  BY USING THIS SOFTWARE YOU DECLARE TO ACCEPT THE CHEVERETO EULA
  http://chevereto.com/license

  --------------------------------------------------------------------

  admin.js
  This file contains all the chevereto admin js functions

  --------------------------------------------------------------------- */

$(function (){
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Globals */
	
	var active_class			= "active";
	var loading_class			= "loading";
	var checked_class			= "checked";
	var checkbox_class			= "checkbox";
	var selected_class			= "selected";
	var disabled_class			= "disabled";
	var no_change_class			= "no-change";
	
	var checkbox				= "."+checkbox_class;
	
	var filter_wrap				= "#filter-wrap";
	var filter					= "#filter";
	var filter_type				= "#filter-type";
	var filter_sort				= "#filter-sort";
	var select_label			= ".select-label";
	
	var input_login				= "input#login-password";
	
	var list					= "#list";
	var list_items				= "#list-items";
	var list_item				= ".list-item";
	var title					= ".title";
	var empty_msg				= "#empty-msg";
	
	var sidebar					= "#sidebar";
	var sidebar_actions			= "#sidebar-actions";
	var current_selection		= "#current-selection";
	var clear_current_selection = "#clear-current-selection";
	
	var context_menu			= "#context-menu";
	
	var shade					= "#shade";
	var shade_box				= "#shade-box";
	var shade_box_container 	= "#shade-box-container";
	var shade_box_content		= "#shade-box-content";
	
	var single_image			= "#single-image";
	var multi_list				= "#multi-list";
	var multi_list_selected 	= "#multi-list-selected";
	
	var input_search			= sidebar+" input#search";
	var search_input			= "#search-input";
	var remove_search			= ".remove-search";
	
	var mimic_select			= ".mimic-select";
	
	var placeholder				= ".placeholder";
	var placeholders			= input_login+", "+input_search;
	
	var box_actions				= "#box-actions";
	var div_actions				= "#actions";
	var action_do				= "#action-do";
	var action_cancel			= "#action-cancel";
	
	var loading_element 		= '<i class="'+loading_class+'" />';
	
	var files_per_page			= 50;
	
	var button_list_queue		= "";
	

	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Ajax Setup */

	$.ajaxSetup({
		cache: false,
		dataType: "json",
		contentType: "application/json; charset=utf-8",
		url: admin_json
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Window listener */

	// This will observe the window events to make it fit allways to 100% height
	function elements_dimention() {
		$(list).height(parseInt($(window).height()) - parseInt($(list_items).css("margin-top")));
		if(typeof $("html").attr("dir") == "undefined") {
			filter_wrap_left = "ltr";
		} else {
			filter_wrap_left = $(filter_wrap).css(($("html").attr("dir")=="ltr" ? "left" : "right"));
		}
		_width = parseInt($(window).width()) - parseInt(filter_wrap_left);
		$(filter_wrap+", "+list).css("width", _width);
	}
	$(window).load(elements_dimention).resize(elements_dimention);
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Document listener */
	
	if(is_filemanager()) {
		$("body")
			.drag("init", function(ev, dd) {
				if(inScrollRange(ev) || $(shade).is(":visible") || $(ev.target).hasParent(sidebar) || $(ev.target).hasParent(filter_wrap) || $(ev.target).hasParent(context_menu)) {
					return false;
				}
				$("input").blur();
			})
			.drag("start",function(ev, dd){
				$("#drag-selection, "+context_menu).remove();
				return $('<div id="drag-selection" />').appendTo("body");
			})
			.drag(function(ev, dd){
				$(dd.proxy).css({
					top: Math.min(ev.pageY, dd.startY),
					left: Math.min(ev.pageX, dd.startX),
					height: Math.abs(ev.pageY - dd.startY),
					width: Math.abs(ev.pageX - dd.startX)
				});
			})
			.drag("end",function(ev, dd){
				$(dd.proxy).remove();
			});
	}

	// Scroll pagination
	var scrollPage = 2; 
	var fileCount;
	var gettingPage = false;
	var total_upload_count;
	$(list_items).scroll(function(){
		if(gettingPage==true) return false;
		if($(list_items)[0].scrollHeight - $(list_items).scrollTop() == $(list_items).outerHeight() && fileCount==files_per_page && total_upload_count > files_per_page) {
			getFilelist(files_per_page*scrollPage-files_per_page+","+files_per_page);
			scrollPage++;
		}
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* HTML click listener */
	
	$("html").bind("click keyup", function(event) {
		if($(shade).exists() && event.keyCode==27) $(shade).trigger("click");
		$(select_label+"."+active_class, $(filter)).trigger("click");
		$(context_menu).remove();
	}).contextmenu(function(event) {
		$(context_menu).remove();
		if(!$(event.target).is("input")) event.preventDefault();
	});

	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Helper functions */

	function is_filemanager() {
		return $("body").attr("id")=="filemanager";
	}
	
	// Disabler/enabler target selector
	function disable(selector) {
		$(selector).addClass(disabled_class);
	}
	function renable(selector) {
		$(selector).removeClass(disabled_class);
	}
	function is_disabled(selector) {
		return ($(selector).hasClass(disabled_class)) ? true : false;
	}
	
	function append_empty_msg() {
		if($(empty_msg).exists()) return false;
		$(list_item, list_items).each(function() {
			if($(this).hasClass(selected_class)) $(this).click();
			$(this).remove();
		});
		$(clear_current_selection, sidebar).click();
		$(list_items).append($('<div id="'+empty_msg.replace("#", "")+'"><i id="icon-empty-images" class="icon-empty"></i> <span></span></div>').hide().fadeIn());
	}
	
	// Update the affected file changes in the file list
	function update_item_list(id, action, response) {
		
		$target = $(list_item+"#"+id, list);
		objectID = '"'+id+'"';
		
		switch(action) {
			case "delete":
				total_uploads_on_delete();
				$target.fadeOut(function() {
					$(this).click().remove();
					if(total_upload_count == 0) append_empty_msg();
				});
			break;
			case "rename":
				// Update the file array
				files[objectID]["image_name"] = response.image_name;
				files[objectID]["image_url"] = response.image_url;
				files[objectID]["image_thumb_url"] = response.image_thumb_url;
				// Update the target object
				rename = response.image_name+'.'+response.image_type;
				$target.find(title).text(rename).attr("href", response.image_url);
				$target.find("img").attr("src", response.image_thumb_url);
			break;
			case "resize":
				// Update the file array
				files[objectID]["image_size"] = response.image_size;
				files[objectID]["image_width"] = response.image_width;
				files[objectID]["image_height"] = response.image_height;
				// Update the target object
				$target.find("span.attr").text(response.image_width_height);
				$target.find("span.size").text(response.image_size);
			break;
		}
	}
	
	// Update the input values on ajax change
	function update_inputs($container, action, response) {
		switch(action) {
			case "rename":
				$container.find("input")
					.val(response.image_name)
					.attr("data-value", response.image_name);
			break;
			case "resize":
				$container.find("input.width")
					.val(response.image_width)
					.attr("data-value", response.image_width);
				$container.find("input.height")
					.val(response.image_height)
					.attr("data-value", response.image_height);
			break;
		}
	}
	
	// Placeholders
	$(placeholders).bind("change focus blur keyup", function(event) {
		$target = $(this).parent().children(placeholder);
		if($(this).val().length!==0 || $(this).val()!=="") {
			$target.hide();
		} else {
			$target.fadeIn("fast");
		}
	});
	// Focus placeholder
	$(placeholder).click(function() {
		$(this).parent().find("input").trigger("focus");
	});

	// Checkbox
	function toggle_checkbox($checkbox) {
		if(is_disabled("body")) return false;
		$checkbox.toggleClass(checked_class);
	}
	$(document).on("click", checkbox, function(event) {
		if(is_disabled("body")) return false;
		$(this).toggleClass(checked_class);
	});
		
	// update total uploads count
	var total_uploadsXHR = "";
	var total_upload_count = "";
	var total_uploads = function () {
		
		if(!is_filemanager()) return false;
		
		total_uploadsXHR = $.ajax({data: "action=uploaded",
			success: function(response) {
				image_singular_plural = (response.total == 1) ? lang.txt_image : lang.txt_images;
				total_upload_count = response.total;
				$("#total-files").html((response.total>0) ? response.total+" <b>"+image_singular_plural+"</b>" : "");
				setTimeout(function () {
					total_uploads();
				}, 10000); // update every 10sec
				if(response.total == 0) append_empty_msg();
			}
		});
		
	};
	
	// Update total uploads on delete
	var total_uploads_on_delete = function() {
		total_uploadsXHR.abort();
		total_upload_count -= 1;
		$("#total-files").html((total_upload_count>0) ? total_upload_count+" <b>"+(total_upload_count == 1 ? lang.txt_image : lang.txt_images)+"</b>" : "");
	};
	
	// Cast resize input
	function cast_resize_input(divclass, width, height) {
		if(divclass == "single-resize") {
			divid = ' id="'+divclass+'" ';
			divclass = "";
		} else {
			divid = "";
		}
		return '<div'+divid+' class="input-resize '+divclass+'">\
             		<div class="input input-width">\
             			<i class="icon icon-width"></i>\
             			<input type="text" class="numeric width" value="'+width+'" data-value="'+width+'" data-numeric="true" maxlength="4" />\
             		</div>\
             		<div class="input-by"><i class="icon icon-cross"></i></div>\
             		<div class="input input-height">\
             			<input type="text" class="numeric height" value="'+height+'" data-value="'+height+'" data-numeric="true" maxlength="4" />\
             			<i class="icon icon-height"></i>\
             		</div>\
             	</div>'
	};
	
	function wrap_on_multilist(html, ulclass) {
		ulclass = (typeof ulclass != "undefined") ? ulclass : "";
		return '<ul id="multi-list" class="'+ulclass+'">'+html+'</ul>';
	};
	
	function image_html(source, thumb) {
		src = (thumb==true) ? source.image_thumb_url : source.image_url;
		return '<img src="'+src+'" alt="" border=""/>';
	};

	function image_bbcode(source, thumb) {
		src = (thumb==true) ? source.image_thumb_url : source.image_url;
		return '[img]'+src+'[/img]';
	};
	
	function image_thumbs_html(source) {
		return '<a href="'+source.image_url+'">'+image_html(source, true)+'</a>';
	};
	
	function image_thumbs_bbcode(source) {
		return '[url='+source.image_url+']'+image_bbcode(source, true)+'[/url]';
	};

	function cast_ext_input(name, ext) {
		return '<div class="input input-ext"><input type="text" class="rename" value="'+name.replace('.'+ext, "")+'" data-value="'+name.replace('.'+ext, "")+'" /><span class="ext">'+ext+'</span></div>';
	};
	
	// This updates the scrollbar and the action-do button
	function updateMultilist() {
		$multilist = $(multi_list);
		if(!$multilist.exists()) return false;
		$("li:last-child", $multilist).css("border-bottom-style", "solid");
		if($multilist.hasScrollBar() && $multilist.hasClass("delete")) {
			$("li:last-child", $multilist).css("border-bottom-style", "none");
		}
		
		_selection_size = $("li."+selected_class, $multilist).size();
		if(_selection_size == 0) {
			_txt_selection = "";
		} else {
			if(_selection_size == 1) {
				_txt_selection = "1 " + lang.txt_image_selected;
			} else {
				_txt_selection = _selection_size + " " + lang.txt_images_selected;
			}
		}
		$(multi_list_selected).text(_txt_selection);

		$action_do = $(action_do, box_actions);
		
		if($(multi_list).find(".button-list.on:visible").size() > 1 || $(multi_list).find("li."+selected_class).size() > 0) {
			$action_do.fadeIn();
		} else {
			$action_do.hide();
		}

	};
	
	// Taken from http://stackoverflow.com/a/3331993
	function is_name_taken(files, target) { 
		var result = false;
		var val = $(target).val();
		for(var item in files) {
			if(typeof files[item] === 'object') {
				result = is_name_taken(files[item], target);
				if(result != false) return result;
			} else if(files[item] == val && item == "image_name" && files["image_type"] == $(target).closest(".input").find(".ext").text()) {
				result = true; //files.divid the divid from this "line"
				break; // assume first found wins            
			}
		}
		return result;
	};

	// Check the input change (serious conditions)
	function check_inputChange(target) {
		$target = $(target);
		if($target.attr("value") == $target.attr("data-value") || $.trim($target.val()).length == 0) {
			return false;
		} else {
			// Checks if the name exists on the current files object
			if($target.hasClass("rename")) {
				if(is_name_taken(files, target) || $(multi_list).find("."+loading_class).closest("li").find("input").first().val()==$target.val()) {
					return false; 
				}
			// Not remane, then resize...
			} else {
				// if over resize is false check if the value is greater than the actual size
				if(!config.over_resize && parseInt($target.val()) > parseInt($target.attr("data-value"))) {
					return false;
				}
			}
			
		}
		return true;
	};
	
	function rename_error(name, ext, status) {
		var alert_error;
		filename = name+"."+ext;
		switch(status) {
			case "ERR_RN:E1":
				alert_error = lang.error_name_taken+" | "+filename;
			break;
			case "ERR_RN:E2":
				alert_error = "Can't rename the image ("+((status=="ERR_RN:E1")? "dB" : "fs")+") | "+filename;
			break;
			case "ERR_RN:E4":
				alert_error = "Can't use multi-byte characters in Windows file system";
			break;
		}
		return alert_error;
	};
	
	// Box actions while ajax does is magic
	function working_box_actions() {
		$(div_actions, shade).append(loading_element).find("span").hide();
	};
	function renable_box_actions() {
		$("body").removeClass(disabled_class);
		$(div_actions, shade).find("."+loading_class).remove();
		$(div_actions, shade).find("span").show();
	};
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Logout function */

	$("#logout").click(function() {
		$(this).addClass(active_class);		
		$.ajax({data: "action=logout",
			success: function(response) {
				window.location = admin_url;
			}
		});
	});	
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* File list parser */
	
	var files;
	var first_load = true;
	getFilelist();
	
	function getFilelist(query_limit) {
		
		if(!is_filemanager()) return false;
		
		gettingPage = true;
		
		// kill the prev request 
		if(typeof xhr_filelist != "undefined") xhr_filelist.abort();
		
		$(filter_wrap).append($(loading_element).hide().fadeIn());
		
		// Check if the request has limits
		if(typeof query_limit != "undefined") {
			var limit = "&limit="+query_limit;
		} else {
			$(clear_current_selection+", body").click(); // Clear the current selection
			var limit = "";
			scrollPage = 2;
			$(list_items).find(list_item).fadeOut("fast", function() { 
				$(this).remove();
				$("body").scrollTop($("body").offset().top);
			});
		}
		
		// Buld the query
		FILE_LIST_QUERY = "action=filelist&type="+$(filter_type).attr("data-value")+"&sort="+$(filter_sort).attr("data-value")+limit;
		if($(input_search).hasClass(active_class)) FILE_LIST_QUERY += "&keyword="+$.trim($(input_search).val());
		
		var xhr_filelist = $.ajax({data: FILE_LIST_QUERY,
			success: function(response) {
				
				gettingPage = false;
				
				$("i."+loading_class, filter_wrap).remove();
					
				if(typeof query_limit == "undefined") {
					$(list_items).find(list_item).remove();
				}
				
				if(response.status_code==403) {
					append_empty_msg();
					return false;
				} else {
					$(empty_msg, list_items).remove();
				}
				
				if(typeof query_limit != "undefined") {
					files = $.extend(files,response); 
				} else {
					files = response;
				}
									
				fileCount = 0;
				
				$.each(response, function(index, value) {
					if($("#"+value.image_id, list).exists()) {
						return true;
					}
					th_width  = 110;
					th_height = parseInt(th_width*(config.thumb_height/config.thumb_width));
					image_name = (value.image_name.length >= 12) ? value.image_name.substring(0, 16)+"..." : value.image_name+"."+value.image_type;
					file_html = 
					 '<div class="'+list_item.replace(".", "")+'" id="'+value.image_id+'">\
							<a class="title link" href="'+value.image_shorturl+'" target="_blank">'+image_name+'</a><span class="'+checkbox_class+'"></span>\
							<div class="thumb">\
								<img src="'+value.image_thumb_url+'" alt="" width="'+th_width+'" height="'+th_height+'" />\
								<span class="attr">'+value.image_width+'x'+value.image_height+'</span>\
								<span class="size">'+value.image_size+'</span>\
							</div>\
							<div class="date">'+value.image_date+'</div>\
					  </div>';
					$(list_items).append($(file_html).hide());
					fileCount++;
				});
				
				$(list_item, list_items).fadeIn("fast").unbind("dropstart drop dropend");
					
				$(list_item)
					.bind("dropstart",function() {
						$(this).addClass(active_class);
					})
					.bind("drop", function(ev, dd) {
						$(this).click();
					})
					.bind("dropend",function() {
						$(this).removeClass(active_class);
					});
				$.drop({ multi: true });

			}
		});
		
		// Only on the first load..
		if(first_load) {
			total_uploads();
			first_load = false;
		} 

	}
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Filter */
	
	// Mimic select list (type selector)
	$("li", mimic_select).click(function(event){
		event.stopPropagation();
		if(!$(this).hasClass(active_class)) {
			$(this).addClass(active_class)
		} else {
			if($(this).parent().find("."+active_class).size()>1) {
				$(this).removeClass(active_class+" "+no_change_class);
			} else {
				$(this).addClass(no_change_class);
				$("html").click();
			}
		}
		var types = [];
		$(this).parent().find("."+active_class).each(function() {
			types.push($(this).attr("data-value"));
        });
		
		$select_label = $(this).closest(".selectable").find(select_label);
		if(types.length == 3) {
			types = "all";
		} else {
			types = types.join(" & ");
		}		
		$select_label.find("span").text(lang.txt_all);
		$(this).closest(filter_type).attr("data-value", types.replace(/\s&\s/g, ","));
	});
	$(select_label, mimic_select).click(function(event){
		event.stopPropagation();		
		if(!$(this).hasClass(active_class)) {
			$(this).parent().find("ul").show();
		} else {
			$(this).parent().find("ul").hide();
		}
		$(this).toggleClass(active_class);
	});
	
	// Apply filters
	$("li", filter).click(function(event) {
		if($(this).hasClass(no_change_class)) return false;
		if($(this).hasParent(filter_sort)) {
			$(this).closest(filter_sort).attr("data-value", $(this).attr("data-value")).find("li").removeClass(active_class+" "+no_change_class);
			$(this).addClass(active_class+" "+no_change_class);
		}
		getFilelist();
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Search */
	
	// Focus search input
	$("i", input_search).click(function() {
		$(this).offsetParent().find("input").trigger("focus");
	});
	
	// Search function
	$(document).on("click", search_input+" i", function() {
		if($(this).hasClass(remove_search.replace(".", ""))) {
			$(this).remove();
			$(input_search).removeClass(active_class).attr("searched", "").val("");
			$(input_search).blur();
			getFilelist();
		} else {
			$(input_search).focus();
		}
	});
	$(input_search)
		.keydown(function(event) {
			if(event.keyCode==32 && $.trim($(this).val())=='') {
				event.preventDefault();
				return false;
			}
		})
		.keyup(function() {
			if($.trim($(this).val())==$.trim($(this).attr("searched"))) {
				$(this).blur().focus();
				return false;
			}
			if($(this).val()=='') {
				$(this).removeClass(active_class).attr("searched", "");
				$(remove_search, search_input).remove();
			} else {
				$(clear_current_selection, sidebar).click();
				$(this).addClass(active_class).attr("searched", $.trim($(this).val()));
				$(remove_search, search_input).remove();
				$(search_input).append('<i class="'+remove_search.replace(".", "")+'" />');
			}
			getFilelist();
		});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Righ click actions */
	
	// Context menu (li options)
	$("body").on("click", context_menu, function(event) {
		event.stopPropagation();
		if($(event.target).is("li")) {
			switch($(event.target).attr("data-action")) {
				case "select-all":
					$(list_items).find(list_item).not("."+selected_class).click();
				break;
				case "clear-selection":
					$("a", current_selection).click();
				break;
				default:
					$('[data-action="'+$(event.target).attr("data-action")+'"]', sidebar).click();
				break;
			}
		}
	});
	
	$(document).on("contextmenu", list_items, function(event) {
		event.preventDefault();
		
		if($(event.target).hasParent(filter)) return false;
		
		general_context_options = '<ul class="sidebar-actions separated"><li data-action="select-all"><i class="icon icon-action select-all"></i>'+lang.txt_select_all+'</li><li data-action="clear-selection"><i class="icon icon-action clear-slection"></i>'+lang.txt_clear_selection+'</li></ul>';
		
		$list_item = $(event.target).closest(list_item);
		
		if($list_item.exists()) {
			if(!$list_item.hasClass(selected_class)) {
				$list_item_targets = $(list_items).find(list_item+"."+selected_class).not("#"+$list_item.attr("id"));
				if($list_item_targets.size() > 0) {
					$(sidebar_actions).addClass("switched");
					$list_item_targets.click();
				}
				$list_item.click();
			}
		}
		
		$("body").append($('<div id="'+context_menu.replace("#", "")+'" />'));
		
		// Cast context menu
		$context_menu = $(context_menu);
		$(sidebar_actions).clone().prependTo($context_menu.html(general_context_options));
		
		$context_menu.css({ left: 0, top: 0 }).css({left: event.pageX, top: event.pageY, width: $context_menu.width()+20, height:  $context_menu.height()});
		
		context_h   = $context_menu.outerHeight(true);
		context_w   = $context_menu.outerWidth(true);

		disable_context_target = false;
		
		if(current_selection_length==0) {
			disable_context_target = sidebar_actions+', li[data-action="clear-selection"]';
		} else {
			if($(list_item+":not(."+selected_class+")", list).size()==0) {
				disable_context_target ='li[data-action="select-all"]';
			}
		}
	
		if(disable_context_target != false) $context_menu.find(disable_context_target).addClass(disabled_class);
		
		// I need to tell if the context menu is visible or not in the client window...
		context_off = $context_menu.offset();
		window_h    = $(window).height();
		window_w    = $(window).width();
		
		X_Visible = context_off.left >= 0 && context_off.left + context_w < window_w;
		Y_Visible = context_off.top >= 0 && context_off.top + context_h < window_h;

		if(!Y_Visible) {
			$context_menu.css({top: window_h - context_h - (window_h - context_off.top)});
		}
		if(!X_Visible) {
			$context_menu.css({left: window_w - context_w - (window_w - context_off.left)});
		}
		
	});
	
	$(list_items).dblclick(function(event) {
		event.preventDefault();
		$("a", current_selection).click();
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* List item functions */
	
	// On item select -> Activate
	var current_selection_length = "";
	
	$(document)
		.on("click", list+" "+list_item, function(event) {
			
			$checkbox = $(this).find(checkbox);
			
			if($(this).hasClass(selected_class)) {
				$checkbox.removeClass(checked_class);
			} else {
				$checkbox.addClass(checked_class);
			}
			
			$(this).toggleClass(selected_class);
			
			current_selection_length = $(this).parent().find("."+selected_class).length;
			$current_selection = $(current_selection, sidebar);
			$sidebar_actions = $(sidebar_actions);
			
			if(current_selection_length == 0) {
				current_selection_attr = "empty";
				$current_selection.addClass("empty");
				$sidebar_actions.removeClass("activated");
				if($sidebar_actions.hasClass("switched")){
					$sidebar_actions.removeClass("switched").show();
				} else {
					$sidebar_actions.slideUp(800, "easeOutExpo");
				}
			} else {
				current_selection_attr = "selection";
				$current_selection.removeClass("empty");
				$sidebar_actions.addClass("activated").slideDown(1000, "easeOutExpo");
			}
			
			$current_selection.html(
				$current_selection.attr("data-"+current_selection_attr)
					.replace("$1", lang.txt_current_selection)
					.replace("$2", lang.button_clear)
					.replace("$3", lang.txt_no_image_selection)
			).find("span").text(current_selection_length);
			
		})
		.on("dblclick", list+" "+list_item, function() {
			$("a", current_selection).click();
			$(this).click();
		});
	
	// Stop propagation on title
	$(document).on("click", list_item+" "+title, function(event) {
		event.stopPropagation();
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Event observation */
	
	// Clear selection
	$(document).on("click", sidebar+" "+current_selection+" a", function() {
		$(list_items).find("."+selected_class).click();
	});
	
	// Focus code input
	$(document).on("click", "#codes input", function() {
		$(this).focus().select();
	});
	
	// Focus ext input
	$(document).on("click", ".ext", function() {
		$(this).parent().children("input").focus().select();
	});
	
	$(document).on("click",	shade_box+" img.thumb", function() {
		$(this).closest("li").find("input").first().focus().select();
	});
	
	$(document).on("click", shade_box+" .input i", function() {
		$(this).closest(".input").find("input").focus().select();
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Call Godlightbox */
		
	$("li", sidebar_actions).click(function() {

		action_to_do = $(this).attr("data-action");
		txt_action_to_do = $(this).text();
		single_close_action = false;
		shade_box_html = "";
		
		$("li", $(this).closest("ul")).removeClass(active_class);
		$(this).addClass(active_class);
		$(shade).remove();
		
		// Cast the shade html
		$("body").append('<div id="'+shade.replace("#","")+'"><div id="'+shade_box.replace("#", "")+'"><div id="'+shade_box_container.replace("#", "")+'"><div id="'+shade_box_content.replace("#", "")+'" action="'+action_to_do+'"></div></div></div></div>');
		
		// Append the box title and action
		html_box_actions = 
		'<div id="box-actions">\
			<div id="box-title"><i class="icon icon-action '+action_to_do+'"></i>'+txt_action_to_do+'</div>\
			<div id="actions"><span id="action-cancel" class="action-cancel button">'+lang.button_close+'</span><span id="action-do" class="action-do button"></span></div>\
		 </div>';
		$(shade_box_container).append(html_box_actions);
		
		$selected_items = $("."+selected_class, list_items);
		
		// Prepare the inner html...
		if(current_selection_length>1) {
			
			$(action_do, box_actions).hide();
			
			switch(action_to_do) {
				case "delete":
					multi_instance = lang.button_delete_selected;
					$selected_items.each(function() {
						file_id = $(this).attr("id");
						file_target = files['"'+file_id+'"'];
                        shade_box_html += 
						 '<li data-id="'+file_target.image_id+'">\
							<img src="'+file_target.image_thumb_url+'" alt="" class="thumb" />\
							<div>\
								<a href="'+file_target.image_url+'" class="link" target="_blank">'+file_target.image_name+'.'+file_target.image_type+'</a>\
								<span class="attr">'+file_target.image_width+'x'+file_target.image_height+' - '+file_target.image_size+'</span>\
							</div>\
							<span class="'+checkbox_class+'"></span>\
						 </li>';
                    });
					shade_box_html = wrap_on_multilist(shade_box_html, "delete") +
					'<div id="multi-list-footer">\
					 	<div id="'+multi_list_selected.replace("#", "")+'" />\
                     	<div id="multi-list-options"><span id="reset-selection">'+lang.txt_reset_selection+'</span><span class="pipe">|</span><span id="select-all">'+lang.txt_select_all+'</span></div>\
                	 </div>\
                	 <div id="delete-warn"><i class="icon icon-warn"></i>'+lang.txt_delete_confirm_multi+'</div>';
				break;
				case "rename":
					multi_instance = lang.button_rename_all;
					$selected_items.each(function() {
						file_id = $(this).attr("id");
						file_target = files['"'+file_id+'"'];
                        shade_box_html += 
						'<li data-id="'+file_id+'">\
							<img src="'+file_target.image_thumb_url+'" alt="" class="thumb" />\
							<div class="list-cnt">'+cast_ext_input(file_target.image_name, file_target.image_type)+'</div>\
							<div class="list-act"><span class="button-list off">'+lang.button_rename+'</span></div>\
						 </li>';
                    });
					shade_box_html = wrap_on_multilist(shade_box_html);
				break;
				case "resize":
					multi_instance = lang.button_resize_all;
					$selected_items.each(function() {
						file_id = $(this).attr("id");
						file_target = files['"'+file_id+'"'];
                        shade_box_html += 
						'<li data-id="'+file_id+'">\
							<img src="'+file_target.image_thumb_url+'" alt="" class="thumb" />\
							'+cast_resize_input("list-cnt", file_target.image_width, file_target.image_height)+'\
							<div class="list-act"><span class="button-list off">'+lang.button_resize+'</span></div>\
						</li>';
                    });
					shade_box_html = wrap_on_multilist(shade_box_html);
				break;
				case "codes":
					multi_instance = "codes";
					shade_box_thumbs = "";
					$selected_items.slice(0,5).each(function() {
						shade_box_thumbs += '<img src="'+files['"'+$(this).attr("id")+'"'].image_thumb_url+'" alt="" />';
					});
					// Populate the multicodes object
					multicodes = {"directlink":"","shorturl":"","viewer":"","html":"","bbcode":"","thumbs_html":"","thumbs_bbcode":""};
					$selected_items.each(function() {
						file_id = $(this).attr("id");
						file_target = files['"'+file_id+'"'];
						multicodes.directlink		+= file_target.image_url + '\n';
						multicodes.shorturl			+= file_target.image_shorturl + '\n';
						multicodes.viewer			+= file_target.image_viewer + '\n';
						multicodes.html				+= image_html(file_target) + '\n';
						multicodes.bbcode			+= image_bbcode(file_target) + '\n';
						multicodes.thumbs_html		+= image_thumbs_html(file_target) + '\n';
						multicodes.thumbs_bbcode	+= image_thumbs_bbcode(file_target) + '\n';
					});
					
					$.each(multicodes, function(i,v) {
						multicodes[i] = multicodes[i].slice(0,-1);
					});
					
					shade_box_html =
					 '<div id="sb-thumbnails">'+shade_box_thumbs+'</div>\
					  <div id="multicodes-select">\
					  	<select>\
					          <option value="multicodes_directlink">'+lang.txt_multicodes_directlink+'</option>\
							  <option value="multicodes_shorturl">'+lang.txt_show_directly_shorturl+'</option>\
							  <option value="multicodes_viewer">'+lang.txt_show_viewer_link+'</option>\
					          <option value="multicodes_html">'+lang.txt_multicodes_html+'</option>\
					          <option value="multicodes_bbcode">'+lang.txt_multicodes_bbcode+'</option>\
					          <option value="multicodes_thumbs_html">'+lang.txt_multicodes_thumbs_html+'</option>\
					          <option value="multicodes_thumbs_bbcode">'+lang.txt_multicodes_thumbs_bbcode+'</option>\
					      </select>\
					      <div id="multicodes-count">'+current_selection_length + " " + lang.txt_images_total+'</div>\
					  </div>\
					  <textarea id="multicodes" spellcheck="false">'+multicodes.directlink+'</textarea>';
				break;
			}

		} else {
			file_id = $selected_items.first().attr("id");
			file_target = files['"'+file_id+'"'];
			
			if(file_target.image_width >= 324) {
				_height = 324;
				_width = _height*file_target.image_width/file_target.image_height;
			} else {
				_height = file_target.image_height;
				_width = file_target.image_width;
			}
			
			if(_width >= 432) {
				_width = 432;
				_height = _width*file_target.image_height/file_target.image_width;
			}
			
			html_single_image = '<div id="single-image" data-id="'+file_id+'"><a href="'+file_target.image_url+'" target="_blank"><img src="'+file_target.image_url+'" alt="" width="'+_width+'" height="'+_height+'" style="margin-left: -'+(_width/2)+'px; margin-top: -'+(_height/2)+'px;" /></a></div>';
			
			switch(action_to_do) {
				case "delete":
					shade_box_html = '<div id="delete-warn"><i class="icon icon-warn"></i>'+lang.txt_delete_confirm_single+'</div>';
				break;
				case "rename":
					shade_box_html = '<div id="single-rename" class="input-rename">'+cast_ext_input(file_target.image_name, file_target.image_type)+'</div>';
				break;
				case "resize":
					shade_box_html = cast_resize_input("single-resize", file_target.image_width, file_target.image_height);
				break;
				case "codes":			
					shade_box_html = 
					 '<div id="sb-thumbnail">\
					  	<img src="'+file_target.image_thumb_url+'" alt="" />\
					  	<a class="link" href="'+file_target.image_url+'" target="_blank">'+file_target.image_name+'.'+file_target.image_type+'</a>\
					  	<span class="attr">'+file_target.image_width+'x'+file_target.image_height+' ('+file_target.image_size+')</span>\
					  </div>\
					  <div id="codes">\
					  	<div class="code-group">\
					  		<h4>'+lang.txt_show_directly+'</h4>\
					  		<input type="text" value="'+file_target.image_url+'" />\
							<input type="text" value="'+file_target.image_shorturl+'" />\
							<input type="text" value="'+file_target.image_viewer+'" />\
					  		<input type="text" value="'+image_html(file_target).htmlEntities()+'" />\
					  		<input type="text" value="'+image_bbcode(file_target).htmlEntities()+'" />\
					  	</div>\
					  	<div class="code-group">\
					  		<h4>'+lang.txt_thumb_plus_link+'</h4>\
					  		<input type="text" value="'+image_thumbs_html(file_target).htmlEntities()+'" />\
					  		<input type="text" value="'+image_thumbs_bbcode(file_target).htmlEntities()+'" />\
					  		<input type="text" value="'+file_target.image_thumb_url+'" />\
					  	</div>\
						<div class="code-group">\
					  		<h4>Uploader IP</h4>\
					  		<input type="text" value="'+file_target.uploader_ip+'" />\
					  	</div>\
					  </div>';
				break;
			}
			
			if(action_to_do.match(/delete|rename|resize/)) {
				shade_box_html = html_single_image + shade_box_html;
			}
			if(action_to_do.match(/rename|resize/)) {
				shade_box_html += '<div id="single-status" class="ok"><i class="icon"></i></div>';
			}
			
		}
		
		// multiaction
		if(current_selection_length>1) {
			action_do_txt = multi_instance;
		} else {
			action_do_txt = txt_action_to_do;
		}
		
		if(action_to_do=="delete") $(action_do, box_actions).addClass("delete");
		if(action_to_do=="codes") single_close_action = true;
		
		// Just close button
		if(single_close_action) {
			$("#actions", shade_box).find("span").each(function() {
				if($(this).hasClass("action-cancel")) {
					$(this).text(lang.button_close);
				} else {
					$(this).remove();
				}
            });
		}		
		$(action_do, box_actions).text(action_do_txt);

		// Fancy show the shade
		$(shade_box_content, shade).html(shade_box_html);
		
		// Hide the scroll
		$("body").css("overflow", "hidden");
		
		$(shade).fadeIn("normal", function() {			
			$(shade_box).show("normal", "easeOutExpo", function() {
				$(shade_box_content).fadeIn("slow");
				updateMultilist();
				if(action_to_do=="delete") {
					$(multi_list).find("li").click();
				}
			});
		});
		
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Close Godlightbox */
	
	$(document).on("click", shade, function() {
		if(is_disabled("body") || $(shade).find("."+loading_class).length > 0) return false;
		$(shade_box, this).fadeOut("fast", function() {
			// Show the scroll
			$("body").css("overflow", "visible");
			$(shade).fadeOut("fast", function() {
				$(this).remove();
				if($(shade_box_content).attr("action")=="delete" && $(multi_list).exists() && $(".list-item").size()==0) getFilelist();
			});
		});
		$("li."+active_class, sidebar_actions).removeClass(active_class);
	});
	
	// Stop Godlightbox close on shadebox click
	$(document).on("click", shade+" "+shade_box, function(event) {
		event.stopPropagation();
	});
	$(document).on("click", shade+" .action-cancel", function() {
		$(shade).trigger("click");
	});
	
	
	/* -------------------------------------------------------------------------------------------------------------------------------- */
	/* Actions Godlightbox */
	
	// Multilist delete
	$(document).on("click", "ul#multi-list.delete li", function(event) {
		if(is_disabled("body") || $(this).find("."+loading_class).exists()) return false;
		if($(event.target).is(checkbox)) {
			$(event.target).toggleClass(checked_class);
			$(this).closest("li").click();
			return false;
		}
		if($(event.target).not("a.link")) {
			$(this).toggleClass(selected_class).find(checkbox).toggleClass(checked_class);
			updateMultilist();
		}
	});
	
	// Multilist actions
	$(document).on("click", ".button-list.on", function() {
		
		var $li = $(this).closest("li");
		var $button_list = $(this);
		var fileID = $li.attr("data-id");
		var action = $(shade_box_content).attr("action");
		
		// Sanitize before!
		$input_rename = $li.find("input.rename");
		if(action=="rename" && $input_rename.val()!==$input_rename.val().sanitize()) {
			$input_rename.closest(".list-cnt").shake();
			$input_rename.focus().val($input_rename.val().sanitize());
			if(check_inputChange($input_rename)) {
				$(this).removeClass("off").addClass("on");		
			} else {
				$(this).removeClass("on").addClass("off");
			}
			return false;
		}
		
		$button_list.hide().parent().css("width", $(this).outerWidth(false)).append(loading_element);
		$li.find("input").prop(disabled_class, true);
		disable("body");
		updateMultilist();

		switch(action) {
			case "rename":
				arguments = "rename_name="+encodeURIComponent($li.find("input.rename").val());
			break;
			case "resize":
				arguments = "resize_width="+$li.find("input.width").val();
			break;
		}
		
		$.ajax({data: "action="+action+"&id="+fileID+"&"+arguments,
			success: function(response) {
				$li.find("."+loading_class).fadeOut("fast", function() {
					$(this).remove();
					$input = $li.find("input");
					$button_list.removeClass("on").addClass("off").show();

					if(response.status_code==200) {
						highlight = "yellow";
						update_inputs($li, action, response);
						update_item_list(fileID, action, response);
					} else {
						highlight = "red";
						$li.find(".list-cnt").shake(function() {
							
							if(action=="rename") {
								alert_error = rename_error($input.val(), $li.find(".ext").text(), response.status_code_txt);
							} else {
								alert_error = response.status_code_txt;
							}
							
							if(typeof alert_error !== "undefined") alert(alert_error);
							
							$input.each(function(index, element) {
								$(this).val($(this).attr("data-value"));
							});
						});
					}
					
					$li.highlight(highlight);
					$input.prop(disabled_class, false);
					
					if(response.status_code!==200) {
						$input.first().select().focus();
					}
					
					if(button_list_queue=="init") {
						$multilist.find("span.button-list.on").first().click();
					}
					
				});
				renable("body");			
			}
		});
		
	});
	
	// Keyactions
	$(document).on("keydown keyup blur", shade_box+" input", function(event) {
		switch(event.type) {
			case "keydown":
				key = event.keyCode;
				this_val = $(this).val();
				input_length = this_val.length;
				
				if(typeof $(this).attr("class")!=="undefined") {
					input_type = $.trim($(this).attr("class").replace(/width|height/g, ""));
					switch(input_type) {
						case "numeric":
							this_val = parseInt(this_val);
							if(this_val==0) $(this).val(0);
							event.keydown_numeric();
						break;
						case "rename":
							// Forbidden keys
							if(key==32) {
								event.preventDefault();
							}
						break;
					}
				}
					
			break;
			case "keyup":
				$this_button = $(this).closest("li").find(".button-list");
				$action_do = $("span#action-do", shade);
				
				if(check_inputChange(this)) {
					$action_do.show();
					$this_button.removeClass("off").addClass("on");		
				} else {
					$action_do.hide();
					$this_button.removeClass("on").addClass("off");
				}
				
				if($(this).hasParent(".input-width") || $(this).hasParent(".input-height")) {
					$(this).val($(this).val().replace(/[^0-9]/g,''));
					$width_height_parent = $(this).closest(".input-resize");
					$width_input  = $width_height_parent.find(".input-width input").first();
					$height_input = $width_height_parent.find(".input-height input").first();
					__width  = $width_input.attr("data-value");
					__height = $height_input.attr("data-value");
					if($(this).hasParent(".input-width")) {
						$height_input.val(parseInt(Math.round($width_input.val()*__height/__width)));
					} else if($(this).hasParent(".input-height")) {
						$width_input.val(parseInt(Math.round($height_input.val()*__width/__height)));
					}
				}
				
				if($(single_image).exists()) {
					if(event.keyCode==13) $(action_do).click();
				} else {
					if(event.keyCode==13) {
						$this_button.blur().click();
						if($this_button.hasClass("on")) $(this).closest("li").next("li").find("input").first().focus().select();
					}
					updateMultilist();
				}
			break;
			case "blur":
				$closest_parent = $(this).closest(".input-resize");
				if($.trim($(this).val()).length == 0 || ($(this).attr("data-numeric") == "true" && $(this).val() == 0) ) {
					$closest_parent.find("input").each(function() {
						$(this).val($(this).attr("data-value"));
					});
					$closest_parent.find("span.on").removeClass("on");
				}
				$closest_parent.find("i.icon").removeClass(active_class+" passive");
			break;
			case "focus":
				if($(this).hasParent(".input-width") || $(this).hasParent(".input-height")) {
					$(this).closest(".input").find("i.icon").addClass(active_class);
					$(this).closest(".input-resize").find("i.icon:not(."+active_class+")").addClass("passive");
				}
			break;
		}
	});
		
	// Multicodes changer
	$(document).on("change", "#multicodes-select select", function() {
		$("textarea#multicodes").html(multicodes[$(this).val().replace("multicodes_", "")]);
	});
	
	// Actions multilist delete
	$(document).on("click", "#multi-list-options span", function() {
		if(typeof $(this).attr("id") == "undefined") return false;
		$multilist_li = $("li", "ul#multi-list");
		switch($(this).attr("id")) {
			case "reset-selection":
				$multilist_li.filter("."+selected_class).each(function() { $(this).click() });
			break;
			case "select-all":
				$multilist_li.filter(":not(."+selected_class+")").click();
			break;
		}
	});
	
	// Procces
	$(document).on("click", box_actions+" "+action_do, function() {
		var $this_action = $(this);
		if($this_action.hasClass(active_class)) return false;
			
		if($("#single-image").exists()) {
			single = true;
			$input_rename = $(shade+" .input-ext input");
			// Check the name change			
			if( ($("#single-rename").exists() && !check_inputChange($input_rename)) || ($("#single-resize").exists() && !check_inputChange(shade+" .input-width input"))
			|| $("#single-rename").exists() && $input_rename.val() != $input_rename.val().sanitize() ) {
				$("#single-resize, #single-rename .input", shade).shake();
				$input_rename.focus().val($input_rename.val().sanitize());
				return false;
			}
		} else {
			single = false;
		}
		
		disable("body"); // Try to hook a timer later for observe very long loads? -RB
		
		var $shade_box_content = $(shade_box_content, shade);
		var action = $shade_box_content.attr("action");
		var $multilist = $(multi_list);
		
		/*** SINGLE EDIT ***/
		if(single) {
			var fileID = $("#single-image", shade).attr("data-id");
			var $parent = $(shade_box_content);
			working_box_actions();
			
			switch(action) {
				case "delete":
					arguments = "";
				break;
				case "rename":
					arguments = "rename_name="+encodeURIComponent($parent.find("input.rename").val());
				break;
				case "resize":
					arguments = "resize_width="+$parent.find("input.width").val();
				break;
			}
			
			$.ajax({data: "action="+action+"&id="+fileID+"&"+arguments,
				success: function(response) {
					renable_box_actions();
					
					if(response.status_code==200) {
						
						switch(action) {
							case "delete":
								renable("body");
								$(shade).click();
							break;
							case "rename":
							case "resize":
							default:
								highlight = "yellow";
							break;
						}
						update_inputs($parent, action, response);
						update_item_list(fileID, action, response);
						
					} else {
						
						highlight = "red";
						
						if(action=="rename") {
							alert_error = rename_error($parent.find("input.rename").val(), $parent.find(".ext").text(), response.status_code_txt);
						} else {
							alert_error = response.status_code_txt;
						}
						
						if(typeof alert_error !== "undefined") alert(alert_error);
						
						$("#single-resize, #single-rename .input", shade).shake();
					}
					
					if(typeof highlight != "undefined") $(shade_box).highlight(highlight);
					$("span#action-do", shade).hide();
					renable("body");
				}
			});
		
		/*** MULTI EDIT ***/
		} else {
			
			// Multiactions
			switch(action) {
				case "delete":
					renable("body");
					
					function delete_image_queue(selector) {
						if(!$(selector).exists()) return;
						var $multilist_li = $(selector);
						$multilist_li.removeClass(selected_class).find(checkbox).hide();
						$multilist_li.append(loading_element);
						var fileID = $multilist_li.attr("data-id");
						
						$.ajax({data: "action=delete&id="+fileID,
							success: function(response) {
								$multilist_li.find("."+loading_class).remove();
								if(response.status_code==200) {
									$multilist_li.addClass("deleted").fadeOut(function() {
										$multilist_li.remove();
										updateMultilist();
										update_item_list(fileID, "delete", response);
										if($multilist.find("li").length == 0) {
											$(shade).find("."+loading_class).remove();
											$(shade).click();
										} else {
											delete_image_queue($multilist.find("li."+selected_class).first());
										}
									})
								} else {
									updateMultilist();
									console.log(response.status_code_txt);
									$multilist_li.removeClass(selected_class).find(checkbox).removeClass(checked_class).show();
									delete_image_queue($multilist.find("li."+selected_class).first());
								}						
							}
						})
					}
					
					delete_image_queue($multilist.find("li."+selected_class).first());
					
					if($multilist.find("li .checkbox:visible").length == 0) {
						working_box_actions();
						$("#multi-list-options").hide();
					}
					updateMultilist();
				break;
				case "rename":
				case "resize":
				default:
					if($multilist.find("span.button-list.on").length>0) {
						button_list_queue = "init";
						$multilist.find("span.button-list.on").first().click();
					}
				break;
			}
			
		}

	})

})