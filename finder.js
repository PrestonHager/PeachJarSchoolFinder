
"use strict";

var appended = false;
var maxResults = 3;

let schools;
let districts;
let filteredSchools;
let geoSchools = {};
let scale = 2;

let noresults = "<li class='noresults'><span class='info'>No Results</span></li>";

const getSchoolsFromGeo = function(bounds) {

  let zone = {
    lat_lo: bounds.getSouthWest().lat(),
    lat_hi: bounds.getNorthEast().lat(),
    lng_lo: bounds.getSouthWest().lng(),
    lng_hi: bounds.getNorthEast().lng()
  }

  // round lat/lng to max scale
  zone.lat_hi = Math.ceil(zone.lat_hi/scale)*scale
  zone.lat_lo = Math.floor(zone.lat_lo/scale)*scale

  zone.lng_hi = Math.ceil(zone.lng_hi/scale)*scale
  zone.lng_lo = Math.floor(zone.lng_lo/scale)*scale

  // collect all geo schools scale by scale
  // console.log(zone);

  let foundSchoolZones = [];
  for (const key in geoSchools) {

    let keyArr = key.split(":");
    let keyLat = parseFloat(keyArr[0]);
    let keyLng = parseFloat(keyArr[1]);

    if (keyLat >= zone.lat_lo && keyLat <= zone.lat_hi &&
      keyLng >= zone.lng_lo && keyLng <= zone.lng_hi) {
      foundSchoolZones = foundSchoolZones.concat(geoSchools[key]);
    }

  };

  return foundSchoolZones;

}

const findInJson = function(data, search) {

  search = search.toLowerCase();

  let priority1 = []; // starts with
  let priority2 = []; // contains

  if (!Array.isArray(data)) {
    data = Object.values(data);
  }

  for (let i = 0; data.length > i; i += 1) {

    let item = data[i];

    if (item.name.toLowerCase().startsWith(search)) {
      priority1.push(item);
    } else if (item.name.toLowerCase().includes(search)) {
      priority1.push(item);
    }

    if (priority1.length >= maxResults) {
      break;
    }

  }

  return priority1.concat(priority2);

}

const findDistricts = function(search) {

  let results = findInJson(districts, search);

  $("#districts").html("");

  if (results.length == 0) {
    $("#districts").append(noresults);
  } else {
    results.forEach(result => {

      let li = $('<li/>', { 'data-district': JSON.stringify(result) });
      li.html(result.name+"<br><span class='info'>"+result.city+", "+result.state+"</span>");

      $("#districts").append(li);
    });
  }

}

const findSchools = function(search) {

  let results = findInJson(schools, search);

  $("#schools").html("");

  if (results.length == 0) {
    $("#schools").append(noresults);
  } else {
    results.forEach(result => {

      let li = $('<li/>', { 'data-school': JSON.stringify(result) });
      li.html(result.name+"<br><span class='info'>"+result.district_name+" | "+result.city+", "+result.state+"</span>");

      $("#schools").append(li);
    });
  }

}


const displaySuggestions = function(predictions, status) {
  if (status != google.maps.places.PlacesServiceStatus.OK) {
    // console.log(status);
    $("#locations").html("");
    $("#locations").append(noresults);
    return;
  }

  let m = 0;

  $("#locations").html("");

  if (predictions.length == 0) {
    $("#locations").append(noresults);
  } else {
    predictions.forEach(prediction => {

      if (m < maxResults) {

        let desc = prediction.description;
        desc = desc.replace(', USA', '');

        let li = $('<li/>', { 'data-location': JSON.stringify(prediction) });
        li.html(desc);

        $("#locations").append(li);
        // console.log(prediction);
      }
      m++;

    });
  }

  $("#locations li").removeClass("keyboard");
  $("#locations li:first-child").addClass("keyboard");

};


const keyUpDown = function(direction) {

  let currentNode = $("#results-dropdown ul.results li.keyboard");
  let allNodes = $("#results-dropdown ul.results li");

  let currentPos, pos;
  let max = allNodes.length;

  let i =0;
  allNodes.each(function() {
    let node = $(this);
    if (node.hasClass('keyboard')) {
      currentPos = i;
      return;
    }
    i++;
  });

  if (direction == 'down') {
    pos = currentPos + 1;
  } else if (direction == 'up') {
    pos = currentPos - 1;
  }

  if (pos < 0) {
    pos = 0;
  }
  if (pos >= max) {
    pos = max-1
  }

  $("#results-dropdown ul.results li").removeClass('keyboard');
  $("#results-dropdown ul.results li").eq(pos).addClass('keyboard');

}




let service;
let currentPos = {
  lat: 33.0358003,
  lng: -117.25942320000001
};

let geocoder;
let map;

var distance = function(lat1, lon1, lat2, lon2) {
  var radlat1 = Math.PI * lat1 / 180;
  var radlat2 = Math.PI * lat2 / 180;
  var theta = lon1 - lon2;
  var radtheta = Math.PI * theta / 180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = dist * 180 / Math.PI;
  dist = dist * 60 * 1.1515;
  dist = dist * 1.609344;

  return dist;
};

var sortData = function(data, lat, lng) {

  data.sort(function(a, b) {
    return distance(lat, lng, a.lat, a.lng) - distance(lat, lng, b.lat, b.lng);
  });

  return data;

}

var sortByName = function(data) {

  data.sort(function(a, b) {

    var textA = a.name.toUpperCase();
    var textB = b.name.toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;

  });

  return data;

}

let markers = [];
let markerIDs = [];
let filteredRules = {};

let activeMarkers = [];

let districtsOnMap = {};

var setFilterRules = function(type, refID) {

  filteredRules = {};

  if (type == 'school') {
    filteredRules['school_id'] = refID;
  } else if (type == 'district') {
    filteredRules['district_id'] = refID;
  }

  // console.log(filteredRules, type, refID);

}

let previousSelectedMarker;
let previousIcon;

const highlightMarker = function(id) {

  if (previousSelectedMarker) {
    previousSelectedMarker.setIcon(previousIcon);
    previousSelectedMarker.setZIndex(100);
  }

  // change marker
  if (id in activeMarkers) {
    let marker = activeMarkers[id];
    previousSelectedMarker = marker;
    previousIcon = marker.getIcon();
    marker.setIcon('pin_selected.png');
    marker.setZIndex(99999999);
  }

}

const highlightListSchool = function(id) {

  $("li.list-school").removeClass('selected');
  $('li.list-school[data-id="'+id+'"]').addClass('selected');

}

let selectedId = null;

const highlightSchool = function(id, showInfo = true) {

  // if (openInfowindow) {
  //   openInfowindow.close();
  // }

  selectedId = id;
  highlightMarker(id);
  highlightListSchool(id);
  if (showInfo) {
    new google.maps.event.trigger( activeMarkers[id], 'click' );
  }

}

const unhighlightSchool = function() {
  $("li.list-school").removeClass('selected');
  if (previousSelectedMarker) {
    previousSelectedMarker.setIcon(previousIcon);
    previousSelectedMarker.setZIndex(100);
  }
  selectedId = null;
  previousSelectedMarker = null;
  previousIcon = null;
  if (openInfowindow) {
    openInfowindow.close();
  }
  openInfowindow = null;
}

$(document).on('click', ".gm-ui-hover-effect", function() {
  unhighlightSchool()
});


const drawMarkers = function() {

  // showSpinner();
  // $(".spinner-box").show();

  // previousSelectedMarker = null;

// console.log("GETTING SCHOOLS")
  // console.log(map.getBounds());
  // get bounds
  let extra = 0; //0.05;
  let bounds = map.getBounds();
  let zone = {
    lat_lo: bounds.getSouthWest().lat()-extra,
    lat_hi: bounds.getNorthEast().lat()+extra,
    lng_lo: bounds.getSouthWest().lng()-extra,
    lng_hi: bounds.getNorthEast().lng()+extra
  }

  // console.log(zone);
  let inBoundsSchools = getSchoolsFromGeo(bounds);

  let newMarkers = [];
// console.log("GOT SCHOOLS")

  // re center markers
  // let pos = {
  //   lat: map.getCenter().lat(),
  //   lng: map.getCenter().lng()
  // }
  // schools = sortData(schools, pos.lat, pos.lng);

  // clear markers
  // markers.forEach(marker => {
  //   marker.setMap(null);
  // });
  // markers = [];

  let outs = 0;
  let maxOuts = 300;

  districtsOnMap = {};

  // console.log("BUILDING");

  // put markers on school as we loop
  inBoundsSchools.forEach(school => {

    // if (outs >= maxOuts) {
    //   return;
    // }

    let markerBuilt = markerIDs.includes(school.school_id);

    // console.log(school.lat, school.lng);
    if (isInZone(zone, school.lat, school.lng)) {
// console.log("ZONE");
      if (school.school_id in activeMarkers ) {
        newMarkers[school.school_id] = activeMarkers[school.school_id];
        // console.log("ADDING CACHE", school.school_id);
      } else {

        // console.log(outs);
        let nameDiv = $('<div/>', {class: "school-name"});
        nameDiv.html(school.name);

        let distDiv = $('<div/>', {class: "district-state"});
        distDiv.html(school.district_name + " | " + school.city + ", " + school.state);

        let gradeDiv = $('<div/>', {class: "grades"});
        gradeDiv.html("Grades: " + school.grade_low + "-" + school.grade_high);

        let infoDiv = $('<div/>', {class: "info-window"});
        infoDiv.html(nameDiv.get(0).outerHTML + distDiv.get(0).outerHTML + gradeDiv.get(0).outerHTML);
        infoDiv.attr('data-id', school.school_id);

        const infowindow = new google.maps.InfoWindow({
          content: infoDiv.get(0).outerHTML
        });

        let marker = new google.maps.Marker({
          // map,
          icon:'pin.png',
          title: school.name,
          position: {lat:school.lat, lng:school.lng}
        });

        marker.addListener("click", () => {
          if (openInfowindow) {
            openInfowindow.close();
          }
          openInfowindow = infowindow;
          let sid = $(infowindow.content).data('id');

          highlightSchool(sid, false);

          infowindow.open(map, marker);
        });

        // markers.push(marker);
        // markerIDs.push(school.school_id);

        // console.log("ADDING CALC", school.school_id);
        newMarkers[school.school_id] = marker;
        // activeMarkers[school.school_id] = marker;

      }


      let canTrackForList = true;

      // checlk filter and update marker png if needed
      // console.log(filteredRules)
      if (Object.keys(filteredRules).length > 0) {

        let k = Object.keys(filteredRules)[0];
        let v = filteredRules[k];

        // console.log(filteredRules, k, v, school[k]);
        if (school[k] != v) {
          newMarkers[school.school_id].setIcon('available.png');
          canTrackForList = false;
        } else {
          if (newMarkers[school.school_id].getIcon() != 'pin.png') {
            newMarkers[school.school_id].setIcon('pin.png');
            // console.log('changin icon');
          }
        }
      } else {
        if (newMarkers[school.school_id].getIcon() != 'pin.png') {
          newMarkers[school.school_id].setIcon('pin.png');
          // console.log('changin icon');
        }
      }

      if (canTrackForList) {

        // add school by district
        if (!(school.district_id in districtsOnMap)) {
          districtsOnMap[school.district_id] = {
            'district': districts[school.district_id],
            'schools': []
          };
        }

        districtsOnMap[school.district_id].schools.push(school);

      }


    } else {

      // outs++;
      // console.log(school);
    }

  });

// console.log("FOREACH COMPLETE")

  let activeKeys = Object.keys(activeMarkers);
  let newKeys = Object.keys(newMarkers);

  var removals = activeKeys.filter(x => newKeys.indexOf(x) === -1);
  var adds = newKeys.filter(x => activeKeys.indexOf(x) === -1);

// console.log("ADDS", adds.length);
  adds.forEach(addID => {
    let mk = newMarkers[addID];
    mk.setMap(map);
    activeMarkers[addID] = mk;
  });

// console.log("REMOVES", removals.length);
  removals.forEach(removeID => {
    let mk = activeMarkers[removeID];
    mk.setMap(null);
    delete activeMarkers[removeID];
  });

  // add districts to lists
// console.log("LIST");
  listSchools(districtsOnMap, newKeys.length);

  if (selectedId) {
    highlightSchool(selectedId);
  }
// console.log("DONEE");
  // hideSpinner();
  // $(".spinner-box").hide();

}

const listSchools = function (dom,  num) {
// console.log(num);
  let div = $('<div/>');
  div.html("");

  if (num === 0) {
    $("ul.list-box").html(`<li class="noresults">
        <span class="info">Sorry, no schools found in this area.</span>
        <div class="text-bottom">Try searching a larger area, an alternative location, or a different spelling.</div>
      </li>`);
    return;
  } else if (num > 1000) {

    $("ul.list-box").html(`<li class="noresults">
        <span class="info">Sorry, too many schools in this area.</span>
        <div class="text-bottom">Try searching a smaller area, or an alternative location</div>
      </li>`);
    return;

  }

  // dom.forEach(d => {
  for (const dKey in dom) {
    const d = dom[dKey];

    let dTopDiv = $('<div/>', {class: "text-top"});
    dTopDiv.html(d.district.name);

    let dBottomRowDiv = $('<div/>', {class: "bottom-row"});
    let dBottomColLeftDiv = $('<div/>', {class: "bottom-left"});
    let dBottomColRightDiv = $('<div/>', {class: "bottom-right"});
    let dBottomSchoolCountDiv = $('<div/>', {class: "school-count"});
    dBottomSchoolCountDiv.html(d.schools.length + " Schools");

    dBottomColRightDiv.html(dBottomSchoolCountDiv.get(0).outerHTML);

    let dBottomDiv = $('<div/>', {class: "text-bottom"});
    dBottomDiv.html(d.district.city + ", " + d.district.state);

    let dLinkDiv = $('<div/>', {class: "text-link"});
    dLinkDiv.html("");

    if (d.district.url) {
      let aLinkA = $('<a/>');
      aLinkA.attr("href", decodeURIComponent(d.district.url));
      aLinkA.attr("target", "_blank");
      aLinkA.html("Flyer Guidelines");
      dLinkDiv.append(aLinkA.get(0).outerHTML);
    }

    dBottomColLeftDiv.html(dBottomDiv.get(0).outerHTML + dLinkDiv.get(0).outerHTML);
    dBottomRowDiv.html(dBottomColLeftDiv.get(0).outerHTML + dBottomColRightDiv.get(0).outerHTML);

    let dHeaderDiv = $('<div/>', {class: "list-district-header"});
    dHeaderDiv.html(dTopDiv.get(0).outerHTML + dBottomRowDiv.get(0).outerHTML);


    let sListUl = $('<ul/>', {class: "list-schools"});
    sListUl.html("");

    const schoolList = sortByName(d.schools);

    schoolList.forEach(s => {

      let sTopDiv = $('<div/>', {class: "text-top"});
      sTopDiv.html(s.name);

      let sBottomDiv = $('<div/>', {class: "text-bottom"});
      let gText = '';
      if (s.grade_low != null)
      sBottomDiv.html("Grades: " + s.grade_low + "-" + s.grade_high);

      let sSchoolLi = $('<li/>', {class: "list-school"});
      // sSchoolLi.data('id', s.school_id);
      sSchoolLi.attr('data-id', s.school_id);
      sSchoolLi.html(sTopDiv.get(0).outerHTML + sBottomDiv.get(0).outerHTML);

      sListUl.append(sSchoolLi.get(0).outerHTML);

    });

    let listGroupLi = $('<li/>', {class: "list-group"});
    listGroupLi.html(dHeaderDiv.get(0).outerHTML + sListUl.get(0).outerHTML);

    div.append(listGroupLi.get(0).outerHTML);

  };

  $("ul.list-box").html(div.html());


  // <li class="list-group">
  //   <div class="list-district-header">
  //     <div class="text-top">Solana Beach School District</div>
  //     <div class="text-bottom">San Diego, CA</div>
  //     <div class="text-link">
  //       <a href="#">Flyer Guideline</a>
  //     </div>
  //   </div>
  //   <ul class="list-schools">
  //     <li class="list-school">
  //       <div class="text-top">Solana Vista Elementary</div>
  //       <div class="text-bottom">Grades: KG-3</div>
  //     </li>
  //     <li class="list-school">
  //       <div class="text-top">Solana Vista Elementary</div>
  //       <div class="text-bottom">Grades: KG-3</div>
  //     </li>
  //     <li class="list-school">
  //       <div class="text-top">Solana Vista Elementary</div>
  //       <div class="text-bottom">Grades: KG-3</div>
  //     </li>
  //   </ul>
  // </li>

}

let openInfowindow = null;

const isInZone = function(zone, lat, lng) {
  if (lat > zone.lat_lo && lat < zone.lat_hi &&
    lng > zone.lng_lo && lng < zone.lng_hi ) {
      return true;
  } else {
    return false;
  }
}

const creatSchoolFilters = function() {

  filteredSchools = {
    'all': geoSchools,
    'elementary': {},
    'middle': {},
    'high': {}
  };

  // let pushed = ['elementary', 'middle', 'high'];
  let pushed;

  schools.forEach(school => {

    let lowLat = Math.floor(school.lat/scale)*scale
    let lowLng = Math.floor(school.lng/scale)*scale
    let lowKey = `${lowLat}:${lowLng}`;

    if (!(lowKey in filteredSchools.elementary)) {
      filteredSchools.elementary[lowKey] = [];
    }
    if (!(lowKey in filteredSchools.middle)) {
      filteredSchools.middle[lowKey] = [];
    }
    if (!(lowKey in filteredSchools.high)) {
      filteredSchools.high[lowKey] = [];
    }

    pushed = [];

    switch (school.grade_low) {
      case 'ECE':
      case 'PK':
      case 'KG':
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        filteredSchools.elementary[lowKey].push(school);
        pushed.push('elementary');
        break;
      case 6:
      case 7:
      case 8:
      case '6':
      case '7':
      case '8':
        filteredSchools.middle[lowKey].push(school);
        pushed.push('middle');
        break;
      case 9:
      case 10:
      case 11:
      case 12:
      case '9':
      case '10':
      case '11':
      case '12':
      case 'CE':
        filteredSchools.high[lowKey].push(school);
        pushed.push('high');
        break;
      case 'UG':
      default:
        filteredSchools.elementary[lowKey].push(school);
        filteredSchools.middle[lowKey].push(school);
        filteredSchools.high[lowKey].push(school);
        pushed.push('elementary');
        pushed.push('middle');
        pushed.push('high');
        break;
    }

    switch (school.grade_high) {
      case 'ECE':
      case 'PK':
      case 'KG':
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        if (!pushed.includes('elementary')) {
          filteredSchools.elementary[lowKey].push(school);
          pushed.push('elementary');
        }
        break;
      case 6:
      case 7:
      case 8:
      case '6':
      case '7':
      case '8':
        if (!pushed.includes('middle')) {
          filteredSchools.middle[lowKey].push(school);
          pushed.push('middle');
        }
        break;
      case 9:
      case 10:
      case 11:
      case 12:
      case '9':
      case '10':
      case '11':
      case '12':
      case 'CE':
        if (!pushed.includes('high')) {
          filteredSchools.high[lowKey].push(school);
          pushed.push('high');
        }
        break;
      case 'UG':
      default:
        if (!pushed.includes('elementary')) {
          filteredSchools.elementary[lowKey].push(school);
          pushed.push('elementary');
        }
        if (!pushed.includes('middle')) {
          filteredSchools.middle[lowKey].push(school);
          pushed.push('middle');
        }
        if (!pushed.includes('high')) {
          filteredSchools.high[lowKey].push(school);
          pushed.push('high');
        }
        break;
    }

    if (pushed.includes('elementary') && pushed.includes('high') && !pushed.includes('middle')) {

      filteredSchools.middle[lowKey].push(school);
      pushed.push('middle');

    }

  });

}

const loadFilteredSchool = function(type) {

  switch (type) {
    case 'elementary':
      geoSchools = filteredSchools.elementary;
      break;
    case 'middle':
      geoSchools = filteredSchools.middle;
      break;
    case 'high':
      geoSchools = filteredSchools.high;
      break;
    case 'all':
    default:
      geoSchools = filteredSchools.all;
      break;
  }

}

// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">
function initAutocomplete() {

  map = new google.maps.Map(document.getElementById("map"), {
    center: currentPos,
    zoom: 12,
    mapTypeId: "roadmap",
    styles: [{"elementType":"geometry","stylers":[{"color":"#f5f5f5"}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#f5f5f5"}]},{"featureType":"administrative.land_parcel","elementType":"labels.text.fill","stylers":[{"color":"#bdbdbd"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#eeeeee"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"poi.business","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#e5e5e5"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#ffffff"}]},{"featureType":"road","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"road.arterial","elementType":"labels.text.fill","stylers":[{"color":"#757575"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#dadada"}]},{"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#616161"}]},{"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]},{"featureType":"transit","stylers":[{"visibility":"off"}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"color":"#e5e5e5"}]},{"featureType":"transit.station","elementType":"geometry","stylers":[{"color":"#eeeeee"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#c9c9c9"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#9e9e9e"}]}],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  }); // Create the search box and link it to the UI element.

  google.maps.event.addListenerOnce(map, 'idle', function(){
    const event = new Event('map_loaded');
    document.dispatchEvent(event);
  });
  // console.log(map.getCenter());

  geocoder = new google.maps.Geocoder();
  service = new google.maps.places.AutocompleteService();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      map.setCenter(pos);
      currentPos = pos;
    }, function() {
      // handleLocationError(true, infoWindow, map.getCenter());
    });
  }


  // load data
  $.getJSON("districts.json", function(data) {

    districts = {};
    data.forEach(district => {
      districts[district.district_id] = district;
    });

    // districts = sortData(data, pos.lat, pos.lng);

  });
  $.getJSON("schools.json", function(data) {

    data.forEach(s => {

      let lowLat = Math.floor(s.lat/scale)*scale
      let lowLng = Math.floor(s.lng/scale)*scale
      let lowKey = `${lowLat}:${lowLng}`;

      if (!(lowKey in geoSchools)) {
        geoSchools[lowKey] = [];
      }

      geoSchools[lowKey].push(s);

    });

    schools = data;

    // let pos = {
    //   lat: map.getCenter().lat(),
    //   lng: map.getCenter().lng()
    // }

    // schools = sortData(data, pos.lat, pos.lng);

    const event = new Event('schools_loaded');
    document.dispatchEvent(event);

  })

  let canRunBoundsChanged = false;

  map.addListener('bounds_changed', function () {
    var timer;
    console.log("BOUNDS");

    clearTimeout(timer);
    timer = window.setTimeout(function() {
      if (geoSchools && canRunBoundsChanged) {
        // console.log('BOUNDS CHANGED');
        // $(".spinner-box").show();
        drawMarkers();
      }
      canRunBoundsChanged = true;

    }, 500);

  });

  // map.addListener('tilesloaded', function () {
  //   var timer;

  //   clearTimeout(timer);
  //   timer = window.setTimeout(function() {
  //     console.log("TILE LOADED");
  //     $(".spinner-box").hide();
  //   }, 100);

  // });

  // map.addListener('idle', function () {
  //   var timer;

  //   clearTimeout(timer);
  //   timer = window.setTimeout(function() {
  //     console.log("IDEL");
  //     $(".spinner-box").hide();
  //   }, 1000);

  // });

}


$(function() {

  let searchText = "";
  let selectedText = "";

  $("#pac-input").keyup(function(e) {

    e.stopPropagation();

    let val = $(this).val();
    searchText = val;

    if (e.key === 'Enter' || e.keyCode === 13) {

      var noreslen = $("#results-dropdown").find("ul.results li.noresults").length;
      if (noreslen < 3) {

        $("li.keyboard").click();
        // $("ul#locations > li:first-child").click();
        togglePopup('hide');
        $("#pac-input").blur();
      }
      return;

    }

    // DOWN ARROW
    if (e.key === 'ArrowDown' || e.keyCode === 40) {

      keyUpDown('down');
      return;

    }
    // UP ARROW
    if (e.key === 'ArrowUp' || e.keyCode === 38) {

      keyUpDown('up');
      return;

    }

    if (val.length >= 2) {

      // $("#results-dropdown").show();
      togglePopup('show');

      service.getPlacePredictions(
        {
          types: ["(regions)"],
          componentRestrictions: {country: 'US'},
          // location: currentPos,
          input: val
        },
        displaySuggestions
      );

      findDistricts(val);

      findSchools(val);

    } else {
      // $("#results-dropdown").hide();
      togglePopup('hide', true);
    }


  });

  $("#pac-input").focus(function(e) {

    e.stopPropagation();

    var noreslen = $("#results-dropdown").find("ul.results li.noresults").length;

    if (searchText.length > 2 || noreslen < 3 && $("#results-dropdown").find("ul.results li").length > 0) {
      // $("#pac-input").val(searchText);
      // $("#results-dropdown").show();
      togglePopup('show');
    }
  });



  $(document).on('click','#results-dropdown ul.results li:not(.noresults)',function(e) {

    unhighlightSchool();

    let location = $(this).data('location') || null;
    let district = $(this).data('district') || null;
    let school = $(this).data('school') || null;

    // $("#results-dropdown").hide();
    togglePopup('hide');

    // console.log(location, district, school);

    if (location !== null) {

      selectedText = location.description;

      setFilterRules();

      // get geoloc
      geocoder.geocode({
        'placeId': location.place_id
      },
      function(responses, status) {
        if (status == 'OK') {

          // console.log(responses[0]);

          map.setCenter(responses[0].geometry.location);

          const bounds = new google.maps.LatLngBounds();

          if (responses[0].geometry.viewport) {
            // Only geocodes have viewport.
            bounds.union(responses[0].geometry.viewport);
          } else {
            bounds.extend(responses[0].geometry.location);
          }
          map.fitBounds(bounds);

          drawMarkers();

          // console.log(lat, lng);
        }
      });

      // console.log(location);
    } else if (district !== null) {

      selectedText = district.name;

      // console.log('district_id', district.district_id);
      setFilterRules('district', district.district_id);

      map.setCenter({lat:district.lat, lng:district.lng});
      map.setZoom(11);

      drawMarkers();

      // console.log(district);
    } else if (school !== null) {

      selectedText = school.name;

      setFilterRules('school', school.school_id);

      map.setCenter({lat:school.lat, lng:school.lng});
      map.setZoom(13);

      drawMarkers();

      // console.log(school);
    }

    $("#pac-input").val(selectedText);

  });

  // let state = 'closed';
  const togglePopup = function(state, keeptext = false) {

    if (state == 'hide') {
      $("#results-dropdown").hide();
      if (!keeptext) {
        let text = selectedText;
        if (text.length == 0) {
          text = searchText;
        }
        $("#pac-input").val(text);
      }
    } else if (state == 'show') {
      $("#results-dropdown").show();
      $("#pac-input").val(searchText);
    }
  }

  let tracking = 0;
  const initMarkers = function() {
    if (tracking >= 2) {
      // console.log("INIT MARKERS");
      drawMarkers();
    }
  }

  document.addEventListener('schools_loaded', function (e) {
    tracking++;
    initMarkers();

    // create filtered clones
    creatSchoolFilters();

  }, false);

  document.addEventListener('map_loaded', function (e) {
    console.log("LOADEDE");
    tracking++;
    initMarkers();
  }, false);


  $(document).on('change','#grade_filter',function(){
    loadFilteredSchool($(this).val());
    console.log("GRADE CHANGED");
    drawMarkers();
  });

  $('body').on('click', function(e) {
    let idx = e.target.id;
    if (!(idx == 'pac-input')) {
      togglePopup('hide');
      // $("#results-dropdown").hide();
    }

  });

  $(document).on('click', ".list-school", function() {
    highlightSchool($(this).data('id'));
  });


  const showList = function() {
    $(".fixed-left").addClass("enabled");
    $("#showhide-text").html("Hide List");
  }

  const hideList = function() {
    $(".fixed-left").removeClass("enabled");
    $("#showhide-text").html("Show List");
  }

  $(document).on('click', ".fixed-left:not(.enabled) .showhide-list", function() {
    showList();
  });
  $(document).on('click', ".fixed-left.enabled .showhide-list", function() {
    hideList();
  });

  $(document).on('click', ".fixed-left.enabled .list-school", function() {
    hideList();
  });




});
