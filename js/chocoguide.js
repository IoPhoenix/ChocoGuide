
// Structure
// ------------------------------------------------

const body = document.querySelector("body"),
	mapContainer = document.getElementById("map-canvas"),
	form = document.querySelector("form"),
	search = document.querySelector(".search"),
	icon = document.querySelector(".icon"),
	aboutAuthor = document.querySelector(".about"),
	questionMark = document.querySelector(".question-mark"),
	validCodes = document.querySelector(".valid-codes"),
	infoboxArray = [],
	reset = document.querySelector(".reset"),
	zipCodes = [94102, 94103, 94104, 94105, 94107, 94108, 94109, 94110, 94111, 94112, 94114, 94115, 94116, 94117, 94118, 94121, 94122, 94123, 94124, 94127, 94129, 94130, 94131, 94132, 94133, 94134, 94158];
let markerMap = new Map(),
	geocoder,
	map,
	marker,
	infobox,
	checkbox;



// Events
// ==============================================================

// load the initial google map
google.maps.event.addDomListener(window, "load", initialize);

// make the map responsive
google.maps.event.addDomListener(window, "resize", resizeMap);


// add event listener to the form
form.addEventListener("submit", checkInput);


// open/close text about the author when clicking on the cable car icon
icon.addEventListener("click", function(e) {
	aboutAuthor.classList.toggle("open-about");
});

// open text with valid zip codes when clicking on question mark icon
questionMark.addEventListener("click", function() {
	validCodes.classList.toggle("show-instructions");
});

reset.addEventListener("click", startNewSearch);

// close about author box or box with valid zip codes
// when clicking anywhere on the page
document.addEventListener("click", closeAuthorOrZipCodesBox);



// Function
// ==============================================================

function initialize() {
	geocoder = new google.maps.Geocoder();
	const latlng = new google.maps.LatLng(37.773972, -122.431297);
	const mapOptions = {
		scrollwheel: false,
		zoom: 12,
		center: latlng,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		panControl: false,
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.RIGHT_BOTTOM
		},
		zoomControl: true,
		zoomControlOptions: {
			style: google.maps.ZoomControlStyle.LARGE,
			position: google.maps.ControlPosition.LEFT_CENTER
		}
	}
  map = new google.maps.Map(mapContainer, mapOptions);
}


function resizeMap() {
	const center = map.getCenter();
	google.maps.event.trigger(map, "resize");
	map.setCenter(center);
};

// check that correct zip code is given
function checkInput(e) {
	e.preventDefault();
	if (zipCodes.indexOf(parseInt(search.value)) === -1) {
		alert("Please enter a proper San Francisco zip code!");
	} else {
		getShopsFromYelp();
	}
}

// Authentication keys
const apiKey = 'my_api_key';

function getShopsFromYelp() {
	const zip = search.value,
		term = "store",
		categories = "candy,chocolate",
		limitNumber = 10,
		radius = 3200;


	parameters = [];
	parameters.push(['term', term]);
	parameters.push(['location', zip]);
	parameters.push(['limit', limitNumber]);
	parameters.push(['categories', categories]);
	parameters.push(['radius', radius]);    
		

	const url = 'https://api.yelp.com/v3/businesses/search';
	const parameterMap = $.param(parameters, true);

	// make AJAX call to Yelp Api
	$.ajax({
		url: url,
		headers: {
			'Content-Type':'application/json',
			'Authorization': `Bearer ${apiKey}`
		},
		data: parameterMap,
		cache: true,
		dataType: 'jsonp',
		jsonp: false,
		jsonpCallback: 'calculateEachAddress',


	// A function to be called if the request fails
		error: function(jqXHR, textStatus, errorThrown) {
			alert('Something went wrong. Please try again later!');
			console.log('Status code: ' + jqXHR.status);
			console.log('errorThrown: ' + errorThrown + ', jqXHR.responseText: ' +jqXHR.responseText);
		}
	})
	.always(function() {
		console.log("AJAX request finished");
	});
}


// clear markers and infoboxes from previous search
// calculate address and display each shop on a map
function calculateEachAddress(json) {
	search.value = "";
	closeAllInfoboxes();
	clearMarkers();
	json.businesses.forEach(displayOnMap);
}


function displayOnMap(business) {

	// get saved shops from local storage 
	// and set like status (red heart) in the relevant infobox
	const list = JSON.parse(localStorage.getItem("saved"));

	if (list !== null) {
		if (list[business["id"]] === true) {
			business.liked = true;
		}
	}

	const city = ", San Francisco, CA",
		storedAddress = business["location"]["address"][0] + city;


	// code address into coordinates and set marker on the map
  geocoder.geocode( { 'address': storedAddress}, function(result, status) {

		const p = result[0].geometry.location,
			lat = p.lat(),
			lng = p.lng();
		  map.setCenter(p);
		  

		  marker = new google.maps.Marker({
			map: map,
			position: new google.maps.LatLng(lat,lng),
			animation: google.maps.Animation.DROP,
			title: business["name"],
			icon: "images/icon1.png"
		  });

		  // save marker to markerMap for future use under relevant shop id
		markerMap.set(business["id"], marker);


		  // zoom in when clicking on marker
		  google.maps.event.addListenerOnce(marker,'click', zoomToMarker);


		  // create infobox structure and content for each business
		   const newInfobox = createInfoboxContent(business);


		   // if checkbox is checked (=shop is liked), save shop to local storage
		  checkbox.addEventListener("click", saveLikedShop);


		// change color of marker depending on liked/not liked status
		checkbox.addEventListener("click", changeMarkersColor);



		// mark liked shops with red marker
		if (business.liked === true) {
			checkbox.setAttribute("checked", true);
			marker.setIcon("images/icon2.png");
		}


		//create infoBox on a map
		  infobox = new InfoBox( {
			content: "",
			disableAutoPan: false,
			pixelOffset: new google.maps.Size(-150, 0),
			zIndex: null,
			boxStyle: { 
				 width: "300px"
			},
			closeBoxURL: "images/close.png",
			infoBoxClearance: new google.maps.Size(1, 1),
			isHidden: false,
			pane: "floatPane",
			enableEventPropagation: false
		});


		  // open infobox and update its content 
		google.maps.event.addListener(marker, 'click', function() {
			infobox.setContent(newInfobox);
			infobox.open(map, this);
		});


		// save each infobox to array for future use
		infoboxArray.push(infobox);
});
}

function zoomToMarker() {
	map.setZoom(14);
	map.setCenter(this.getPosition());
};


function createInfoboxContent(yelpBusiness) {

	// EXAMPLE STRUCTURE: 
	// <div class="wrapper">
	// 	<div class="text">
	//		<h3 class="name">Shop Name</h3>
	//		<img src="#" class="rating" alt="rating ruler">
	// 		<p>Shop Address</p>
	// 		<p class="link"><a href="#" target="_blank">Visit the website</a></p>
			// <label>
				//<input type="checkbox" class="checkbox" id="#" business_id="#">
				//<span class="heart"></span>
			//</label>
	// 	</div>
		//<img src="#" class="shop-image" alt="Image of the shop">
	// </div>

	checkbox = document.createElement("input");
	const infoboxContent = document.createElement("div"),
		image = document.createElement("img"),
		div = document.createElement("div"),
		name = document.createElement("h3"),
		address = document.createElement("p"),
		website = document.createElement("p"),
		websiteUrl = document.createElement("a"),
		ratingImage = document.createElement("img"),
		label    = document.createElement("label"),
		span = document.createElement("span");


	infoboxContent.classList.add("wrapper");
	image.classList.add("shop-image");
	image.setAttribute("src", yelpBusiness["image_url"]);
	image.setAttribute("alt", "Image of the shop");
	div.classList.add("text");
	name.classList.add("name");
	name.textContent = yelpBusiness["name"];
	address.textContent = yelpBusiness["location"]["address"][0] + ", " + yelpBusiness["location"]["city"] + ", " + yelpBusiness["location"]["postal_code"];
	website.classList.add("link");
	websiteUrl.textContent = "visit the website";
	websiteUrl.setAttribute("href", yelpBusiness["url"]);
	websiteUrl.setAttribute("target", "_blank");
	ratingImage.classList.add("rating");
	ratingImage.setAttribute("src", yelpBusiness["rating_img_url_large"]);
	ratingImage.setAttribute("alt", "Rating ruler");
	checkbox.classList.add("checkbox");
	checkbox.setAttribute("type", "checkbox");
	checkbox.setAttribute("id", yelpBusiness["id"]);
	checkbox.setAttribute("business_id", yelpBusiness["id"]);
	span.classList.add("heart");

	div.appendChild(name);
	div.appendChild(ratingImage);
	div.appendChild(address);
	website.appendChild(websiteUrl);
	div.appendChild(website);
	label.appendChild(checkbox);
	label.appendChild(span);
	div.appendChild(label);
	infoboxContent.appendChild(div);
	infoboxContent.appendChild(image);

	return infoboxContent;
}



function changeMarkersColor() {

	// give id to marker (id is equal to shop id)
	marker =  markerMap.get(this.getAttribute("business_id"));

	// change marker color depending on checked/ not checked status of checkbox
	if (this.checked) {
		marker.setIcon("images/icon2.png");
	} else {
		marker.setIcon("images/icon1.png");
	};
};



function saveLikedShop(event) {
	const id = event.target.id;
	let list = JSON.parse(localStorage.getItem("saved"));
	if (list === null) {
		list = {};
	}

	isChecked = event.target.checked;

	list[id] = isChecked;
	localStorage.setItem("saved", JSON.stringify(list));
};




function closeAllInfoboxes() {
	if (infoboxArray) {
		for (let i in infoboxArray) {
			infoboxArray[i].close();
		}
	}
};

function clearMarkers() {
	for (let marker of markerMap.values()) {
		marker.setMap(null);
		delete marker;
	}
	markerMap = new Map();
};

function closeAuthorOrZipCodesBox(e) {
	const target = e.target;

	if (target.className === 'icon' || target.className === 'question-mark') {
		return;
	} else {
		aboutAuthor.classList.remove("open-about");
		validCodes.classList.remove("show-instructions");
	}
};

// reset map
function startNewSearch() {
	closeAllInfoboxes();
	clearMarkers();
	map.setZoom(12);
	map.setCenter({lat:37.773972, lng:-122.431297});
	search.focus();
}

