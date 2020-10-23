// index_script.js
// by Preston Hager

var schools;
var selectedSchools = []; // Used to optimize school selection.
let minStudents = 0;
let maxStudents = 2000;

// Add a nice animation to the dropdown menu.
$("div#grade-option-selection-current").click(function(e) {
  $(this).siblings("ul").toggleClass("dropdown-shown");
  $(this).siblings("ul").slideToggle(400);
});

// Click on a grade option in the dropdown to select it.
$("li.grade-option.option").click(function(e) {
  $(this).toggleClass("selected");
  $("p#loading-info").show();
  let updateSelectedGradesPromise = (new Promise(updateSelectedOptions))
    .then(res => $("p#loading-info").hide())
    .catch(err => console.log(err));
});

// Minimum and maximum constraints on the total students selections.
$("input#student-number-min").change(function(e) {
  if (parseInt($(this).val()) < 0) {
    $(this).val(0);
  } else if (parseInt($(this).val()) > parseInt($(this).siblings("input").val())) {
    $(this).val(parseInt($(this).siblings("input").val()) - 1);
  }
  minStudents = parseInt($(this).val());
  $("p#loading-info").show();
  let updateSelectedTotalsPromise = (new Promise(updateSelectedOptions))
    .then(res => $("p#loading-info").hide())
    .catch(err => console.log(err));
});
$("input#student-number-max").change(function(e) {
  if (parseInt($(this).val()) < parseInt($(this).siblings("input").val())) {
    $(this).val(parseInt($(this).siblings("input").val()) + 1);
  }
  maxStudents = parseInt($(this).val());
  $("p#loading-info").show();
  let updateSelectedTotalsPromise = (new Promise(updateSelectedOptions))
    .then(res => $("p#loading-info").hide())
    .catch(err => console.log(err));
});

// Called when either 'total student' number or grade options have been changed.
async function updateSelectedOptions(resolve, reject) {
  $("ul#schools-list").empty();
  selectedSchools = schools.filter(function(el) {
    if (el.total_students == undefined) { return false; }
    let totalStudents = parseInt(el.total_students.replace(/,/g, ''));
    return totalStudents > minStudents && totalStudents < maxStudents;
  });
  for (var i=0; i < selectedSchools.length; i++) {
    let schoolItem = $("<li></li>")
      .append(
        $("<div></div>").append(
          $("<p></p>").text(selectedSchools[i]["name"] + " - " + selectedSchools[i]["city"]),
          $("<p></p>").text("Total Students: " + selectedSchools[i]["total_students"])));
    schoolItem.attr("id", "school-item-"+i);
    $("ul#schools-list").append(schoolItem);
  }
  resolve();
}

// For some reason the slideToggle animation is
// the wrong way at first and so this is how we fix it.
function fixDropdowns() {
  $("ul#grade-option-selection").slideDown(0);
  $("ul#grade-option-selection").slideUp(0);
}

// This is so that the style 'position: absolute' can be used.
// It will take the width of the parent element and subtract
// the border width to get the actual needed width.
function fixDropdownWidth() {
  $("ul#grade-option-selection").css({
    'width': ($("div#grade-option-selection-current").parent().width() - 4 + 'px')
  });
}

// Get the schools JSON file.
// If hardRefresh is set to true it will pull the
// data rather than only using the browser memory.
function getSchools(hardRefresh) {
  schools = JSON.parse(localStorage.getItem('schools'));
  if (schools == null || hardRefresh) {
    $.getJSON("https://srv-file9.gofile.io/download/OoIzh3/better_school_data.json", function(data) {
      localStorage.setItem('schools', JSON.stringify(data));
      schools = data;
    });
  }
}

$(document).ready(function() {
  fixDropdowns();
  fixDropdownWidth();
  let searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('selected')) {
    let selectedElements = parseInt(searchParams.get('selected'));
    if (selectedElements & 0b10000) {
      $("li#pk-k-grade-option").addClass("selected");
    }
    if (selectedElements & 0b01000) {
      $("li#1-5-grade-option").addClass("selected");
    }
    if (selectedElements & 0b00100) {
      $("li#6-8-grade-option").addClass("selected");
    }
    if (selectedElements & 0b00010) {
      $("li#9-12-grade-option").addClass("selected");
    }
    if (selectedElements & 0b00001) {
      $("li#ce-grade-option").addClass("selected");
    }
  }
  getSchools();
  $("p#loading-info").show();
  let listUpdatePromise = (new Promise(updateSelectedOptions))
    .then(res => $("p#loading-info").hide())
    .catch(err => console.log(err));
  // let listUpdatePromise = new Promise(updateSelectedOptions);
});
