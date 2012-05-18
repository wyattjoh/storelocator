/*
* storeLocator v1.1.3 - jQuery store locator plugin
* (c) Copyright 2012, Bjorn Holine (http://www.bjornblog.com)
* Released under the MIT license
* Distance calculation function by Chris Pietschmann: http://pietschsoft.com/post/2008/02/01/Calculate-Distance-Between-Geocodes-in-C-and-JavaScript.aspx
* Modified by Wyatt Johnson (http:www.wyattjohnson.ca) for accessing a JSON php generator
*/

(function($){
$.fn.storeLocator = function(options) {

  var settings = $.extend( {
      'mapDiv'        : 'map',
      'listDiv'       : 'list',
      'formID'        : 'user-location',
      'zoomLevel'     : 12,
      'pinColor'      : 'fe7569',
      'pinTextColor'  : '000000',
      'storeLimit'    : 26,
      'distanceAlert' : 60,
      'xmlLocation'   : 'locations.xml',
      'listColor1'    : 'ffffff',
      'listColor2'    : 'eeeeee',
      'bounceMarker'  : true,
      'slideMap'      : true,
      'modalWindow'   : false
  }, options);

  return this.each(function() {

  var $this = $(this);

  //Add modal window divs if set
  if(settings.modalWindow == true)
  {
    $this.wrap('<div id="overlay"><div id="modal-window"><div id="modal-content">');
    $('#modal-window').prepend('<div id="close-icon"><\/div>');
    $('#overlay').hide();
  }

  if(settings.slideMap == true)
  {
    //Let's hide the map container to begin
    $this.hide();
  }

  var userinput, olat, olng, marker, letter, geocoder, storenum;
  var locationset = new Array();

  //Calculate geocode distance functions - you could use Google's distance service instead
  var GeoCodeCalc = {};
  GeoCodeCalc.EarthRadiusInMiles = 3956.0;
  GeoCodeCalc.EarthRadiusInKilometers = 6367.0;
  GeoCodeCalc.ToRadian = function(v) { return v * (Math.PI / 180);};
  GeoCodeCalc.DiffRadian = function(v1, v2) {
  return GeoCodeCalc.ToRadian(v2) - GeoCodeCalc.ToRadian(v1);
  };
  GeoCodeCalc.CalcDistance = function(lat1, lng1, lat2, lng2, radius) {
  return radius * 2 * Math.asin( Math.min(1, Math.sqrt( ( Math.pow(Math.sin((GeoCodeCalc.DiffRadian(lat1, lat2)) / 2.0), 2.0) + Math.cos(GeoCodeCalc.ToRadian(lat1)) * Math.cos(GeoCodeCalc.ToRadian(lat2)) * Math.pow(Math.sin((GeoCodeCalc.DiffRadian(lng1, lng2)) / 2.0), 2.0) ) ) ) );
  };

  //Geocode function for the origin location
  geocoder = new google.maps.Geocoder();
  function GoogleGeocode() {
    this.geocode = function(address, callbackFunction) {
        geocoder.geocode( { 'address': address}, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            var result = {};
            result.latitude = results[0].geometry.location.lat();
            result.longitude = results[0].geometry.location.lng();
            callbackFunction(result);
          } else {
            alert("Geocode was not successful for the following reason: " + status);
            callbackFunction(null);
          }
        });
        
    };
  }

  //Process form input
  $(function() {
    $(document).on('submit', '#' + settings.formID, function(e){
      //Stop the form submission
      e.preventDefault();
      
      //Get the user input and use it
      var userinput = $('#' + settings.formID).serialize();
      userinput = userinput.replace("address=","");
      if (userinput == "")
        {
          //Show alert and stop processing
          alert("The input box was blank.");
        }
        else
        {
          var g = new GoogleGeocode();
          var address = userinput;
          g.geocode(address, function(data) {
            if(data != null) {
              olat = data.latitude;
              olng = data.longitude;
              mapping(olat, olng);
            } else {
              //Unable to geocode
              alert('ERROR! Unable to geocode address');
            }
          });

          //Replace spaces in user input
          userinput = userinput.replace(" ","+");
        }

    });
  });


  //Now all the mapping stuff
  function mapping(orig_lat, orig_lng){
  $(function(){
        //Parse xml with jQuery
        $.ajax({
        url: settings.JSONLocation,
        dataType: "json",
        success: function(data) {
        
          //After the store locations file has been read successfully
          var i = 0;
          
          $.each(data,function(){
            //Take the lat lng from the user, geocoded above
            var name = $(this).attr('name');
            var lat = $(this).attr('lat');
            var lng = $(this).attr('lng');
            var address = $(this).attr('address');
            var postal = $(this).attr('postal');
            var phone = $(this).attr('phone');
            var web = $(this).attr('web');
            web = web.replace("http://","");
            var hours1 = $(this).attr('hours1');
            var hours2 = $(this).attr('hours2');
            var hours3 = $(this).attr('hours3');
            var distance = GeoCodeCalc.CalcDistance(orig_lat,orig_lng,lat,lng, GeoCodeCalc.EarthRadiusInKilometers);
            
            //Create the array
            locationset[i] = new Array (distance, name, lat, lng, address, phone, web, hours1, hours2, hours3);

            i++;
          });
          
          //Sort the multi-dimensional array numerically
          locationset.sort(function(a, b) {
            var x = a[0];
            var y = b[0];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
          });

          //Check the closest marker
          if(locationset[0][0] > settings.distanceAlert)
          {
            alert("Unfortunately, our closest location is more than " + settings.distanceAlert + " kilometers away.");
          }
          
          //Create the map with jQuery
          $(function(){ 

              var storeName, storeAddress, storePhone, storeWeb, storeHours1, storeHours2, storeHours3;

              //Instead of repeating the same thing twice below
              function create_store_variables(loopcount)
              {
                storeName = locationset[loopcount][1];
                storeCoord = locationset[loopcount][2] + ',' + locationset[loopcount][3];
                storeAddress = locationset[loopcount][4];
                storePhone = locationset[loopcount][5];
                storeWeb = locationset[loopcount][6];
                storeHours1 = locationset[loopcount][7];
                storeHours2 = locationset[loopcount][8];
                storeHours3 = locationset[loopcount][9];
              }

              //Google maps settings
              var myOptions = {
                zoom: settings.zoomLevel,
                center: new google.maps.LatLng(locationset[0][2], locationset[0][3]),
                mapTypeId: google.maps.MapTypeId.ROADMAP
              };

              if(settings.slideMap == true)
              {
                //Slide in the map container
                $this.slideDown();
              }
              if(settings.modalWindow == true)
              {
                //Pop up the modal window
                $('#overlay').fadeIn();
                //Close modal when close icon is clicked
                $(document).on('click', '#close-icon', function(){
                    $('#overlay').hide();
                });
                //Close modal when background overlay is clicked
                $(document).on('click', '#overlay', function(){
                    $('#overlay').hide();
                });
                //Prevent clicks within the modal window from closing the entire thing
                $(document).on('click', '#modal-window', function(e){
                    e.stopPropagation();
                });
                //Close modal when escape key is pressed
                $(document).keyup(function(e){
                  if (e.keyCode == 27) { 
                    $('#overlay').hide();
                  }
                });
              }
              var map = new google.maps.Map(document.getElementById(settings.mapDiv),myOptions);      
              var markers = new Array();
              //Create one infowindow to fill later
              var infowindow = new google.maps.InfoWindow();

              //Avoid error if number of locations is less than the default of 26
              if((locationset.length-1) < settings.storeLimit-1)
              {
                storenum = locationset.length-1;
              }
              else
              {
                storenum = settings.storeLimit-1;
              }
              
              //Add markers and infowindows loop
              for (var y = 0; y <= storenum; y++) 
              { 
                var letter = String.fromCharCode("A".charCodeAt(0) + y);
                var point = new google.maps.LatLng(locationset[y][2], locationset[y][3]);             
                marker = createMarker(point, locationset[y][1], locationset[y][4], letter);
                markers[y] = marker;
                //Pass variables to the pop-up info windows
                create_store_variables(y);
                create_infowindow(marker, storeName, storeAddress, storePhone, storeWeb, storeHours1, storeHours2, storeHours3, storeCoord); 
               }
               
               //Creat the links that focus on the related marker
               $("#" + settings.listDiv).empty();
               $(markers).each(function(x, marker){
                //Let's decleare the store variables again to make it easier to read the html below - there's probably a better way to do this
                var letter = String.fromCharCode("A".charCodeAt(0) + x);
                create_store_variables(x);
                //This needs to happen outside the loop or there will be a closure problem with creating the infowindows attached to the list click
                listClick(letter, marker, storeName, storeAddress, storePhone, storeWeb, storeHours1, storeHours2, storeHours3, storeCoord);

              });

              function listClick(letter, marker, name, address, phone, web, hours1, hours2, hours3, coord)
              {
                $('<li />').html("<div class=\"list-label\">" + letter + "<\/div><div class=\"list-details\"><div class=\"list-content\"><div class=\"loc-name\">" + storeName + "<\/div> " + storeAddress + " <div class=\"loc-phone\">" + storePhone + "<\/div> <div class=\"loc-web\"><a href=\"http://" + storeWeb + "\" target=\"_blank\">Store Details</a><\/div><\/div><\/div>").click(function(){
                  map.panTo(marker.getPosition());
                  var listLoc = "left";
                  if(settings.bounceMarker == true)
                    {
                      marker.setAnimation(google.maps.Animation.BOUNCE) 
                      setTimeout(function() { marker.setAnimation(null); create_infowindow(marker, name, address, phone, web, hours1, hours2, hours3, listLoc, coord); }, 700);
                    }
                    else
                    {
                      create_infowindow(marker, name, address, phone, web, hours1, hours2, hours3, listLoc, coord);
                    }
                   
                  }).appendTo("#" + settings.listDiv);
              }

              //Add the list li background colors
              $("#" + settings.listDiv + " li:even .list-details").css('background', "#" + settings.listColor1);
              $("#" + settings.listDiv + " li:odd .list-details").css('background', "#" + settings.listColor2);
               
              //Custom marker function - alphabetical
              function createMarker(point, name, address, letter) {
                //Set up pin icon with the Google Charts API for all of our markers
                var pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=" + letter + "|" + settings.pinColor + "|" + settings.pinTextColor,
                  new google.maps.Size(21, 34),
                  new google.maps.Point(0,0),
                  new google.maps.Point(10, 34));
                var pinShadow = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_shadow",
                  new google.maps.Size(40, 37),
                  new google.maps.Point(0, 0),
                  new google.maps.Point(12, 35));
                
                //Create the markers
               var marker = new google.maps.Marker({
                    position: point, 
                    map: map,
                    icon: pinImage,
                    shadow: pinShadow,
                    draggable: false
                });

                return marker;
              }

              //Let's save some space - creates and address line if the variable is set
              function address_line(addressSegment)
              {
                var addressLine;

                if(addressSegment != "")
                {
                  addressLine = "<div>" + addressSegment + "<\/div>";
                }
                else
                {
                  addressLine = "";
                }

                return addressLine;
              }

              //Infowindows
              function create_infowindow(marker, name, address, phone, web, hours1, hours2, hours3, location, coord)
              {
//http://maps.google.com/maps?&q=to:' . $location_coord . '+(' . $location_name . ')
                var formattedAddress = "<div class=\"loc-name\">" + name + "<\/div>" + address + address_line(hours1) + address_line(hours2) + address_line(hours3) + address_line(phone) + "<div><a href=\"http://" + web + "\" target=\"_blank\">Store Details<\/a> - <a href=\"http://maps.google.com/maps?&q=to:" + coord + "+(" + name + ")\" target=\"_blank\">Directions</a><\/div>";
                
                //Opens the infowindow when list item is clicked
                if(location == "left")
                {
                    infowindow.setContent(formattedAddress);
                    infowindow.open(marker.get(settings.mapDiv), marker);
                }
                //Opens the infowindow when the marker is clicked
                else
                {
                  google.maps.event.addListener(marker, 'click', function() {
                      infowindow.setContent(formattedAddress);
                      infowindow.open(marker.get(settings.mapDiv), marker);
                  })
                }
              }

          });
        }   
      });
    });
  }

  });
};
})(jQuery);