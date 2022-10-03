var onYtEmbedClick = function(jqObj, isExpanded) {
	jqObj.find("iframe").attr('src', isExpanded ? 	"https://www.youtube.com/embed?listType=playlist&list=PLODw8r-KjHlq4Jdi0A-UPWdO3MS9PlLub&autoplay=0&rel=0"
	: "");
}