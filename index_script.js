// index_script.js
// by Preston Hager

var schools;
// var selectedSchools = []; // Used to optimize school selection.
let minStudents = 0;
let maxStudents = 2000;
// Variables used in the grade option selection for optimization.
var showDropdown = false;
var lastGradesSelected = '{"pkg": false, "elm": false, "mid": false, "high": false, "ce": false}';
var selectedGrades = [];

// Add a nice animation to the dropdown menu.
$("div#grade-option-selection-current").click(function(e) {
  $(this).siblings("ul").toggleClass("dropdown-shown");
  $(this).siblings("ul").slideToggle(400);
  if (showDropdown) {
    showDropdown = false;
    // Only run the update if the grades that are selected are different.
    let selectedGrades = getSelectedGrades();
    if (lastGradesSelected !== JSON.stringify(selectedGrades)) {
      let updateSelectedTotalsPromise = (new Promise(updateSelectedOptions))
        .catch(() => console.log(err));
      lastGradesSelected = JSON.stringify(selectedGrades);
    }
  } else {
    showDropdown = true;
  }
});

// Click on a grade option in the dropdown to select it.
$("li.grade-option.option").click(function(e) {
  $(this).toggleClass("selected");
  setSelectedGradesText();
});

// Minimum and maximum constraints on the total students selections.
$("input#student-number-min").change(function(e) {
  if (parseInt($(this).val()) < 0) {
    $(this).val(0);
  } else if (parseInt($(this).val()) > parseInt($(this).siblings("input").val())) {
    $(this).val(parseInt($(this).siblings("input").val()) - 1);
  }
  minStudents = parseInt($(this).val());
  console.log("min students changed to " + minStudents);
  let updateSelectedTotalsPromise = (new Promise(updateSelectedOptions))
    .catch((err) => console.log(err));
});
$("input#student-number-max").change(function(e) {
  if (parseInt($(this).val()) < parseInt($(this).siblings("input").val())) {
    $(this).val(parseInt($(this).siblings("input").val()) + 1);
  }
  maxStudents = parseInt($(this).val());
  let updateSelectedTotalsPromise = (new Promise(updateSelectedOptions))
    .catch((err) => console.log(err));
});

function getSelectedGrades() {
  var gradesSelected = {"pkg": false, "elm": false, "mid": false, "high": false, "ce": false};
  if ($("li#pk-k-grade-option").hasClass("selected")) {
    gradesSelected.pkg = true;
  }
  if ($("li#1-5-grade-option").hasClass("selected")) {
    gradesSelected.elm = true;
  }
  if ($("li#6-8-grade-option").hasClass("selected")) {
    gradesSelected.mid = true;
  }
  if ($("li#9-12-grade-option").hasClass("selected")) {
    gradesSelected.high = true;
  }
  if ($("li#ce-grade-option").hasClass("selected")) {
    gradesSelected.ce = true;
  }
  return gradesSelected;
}

function setSelectedGradesList() {
  selectedGrades = [];
  let gradesSelected = getSelectedGrades();
  if (gradesSelected.pkg)
    selectedGrades = selectedGrades.concat(["PK", "KG"]);
  if (gradesSelected.elm)
    selectedGrades = selectedGrades.concat(["1", "2", "3", "4", "5"]);
  if (gradesSelected.mid)
    selectedGrades = selectedGrades.concat(["6", "7", "8"]);
  if (gradesSelected.high)
    selectedGrades = selectedGrades.concat(["9", "10", "11", "12"]);
  if (gradesSelected.ce)
    selectedGrades = selectedGrades.concat(["CE"]);
}

function setSelectedGradesText() {
  var selectedGradesText = "";
  let gradesSelected = getSelectedGrades();
  if (gradesSelected.pkg) {
    selectedGradesText = "PK-KG";
  }
  if (gradesSelected.elm) {
    if (selectedGradesText.includes("KG")) {
      selectedGradesText = "PK-5";
    } else {
      selectedGradesText = "1-5";
    }
  }
  if (gradesSelected.mid) {
    if (selectedGradesText.includes("5")) {
      selectedGradesText = selectedGradesText.substring(0, selectedGradesText.length - 1) + "8";
    } else if (selectedGradesText.length == 0) {
      selectedGradesText = "6-8";
    } else {
      selectedGradesText += ", 6-8";
    }
  }
  if (gradesSelected.high) {
    if (selectedGradesText.includes("8")) {
      selectedGradesText = selectedGradesText.substring(0, selectedGradesText.length - 1) + "12";
    } else if (selectedGradesText.length == 0) {
      selectedGradesText = "9-12";
    } else {
      selectedGradesText += ", 9-12";
    }
  }
  if (gradesSelected.ce) {
    if (selectedGradesText.includes("12")) {
      selectedGradesText = selectedGradesText.substring(0, selectedGradesText.length - 2) + "CE";
    } else if (selectedGradesText.length == 0) {
      selectedGradesText = "CE";
    } else {
      selectedGradesText += ", CE";
    }
  }
  if (selectedGradesText === "") {
    selectedGradesText = "None";
  }
  $("div#selected-grades").text(selectedGradesText);
}

// Called when either 'total student' number or grade options have been changed.
function updateSelectedOptions(resolve, reject) {
  setSelectedGradesList();
  $("div#no-results").hide();
  $("p#loading-info").show();
  setTimeout(() => resolve(populateSchools(schools)), 0);
}

function populateSchools(selectedSchools) {
  $("ul#schools-list").empty();

  let iterator = generateSchoolItems(selectedSchools);

  Promise.all(iterator)
  .then(result => {
    setTimeout(() => {
      $("ul#schools-list").append(result);
    }, 0);
  })
  .then(() => {
    setTimeout(() => {
      $("p#loading-info").hide();
      if ($("ul#schools-list").is(":empty")) {
        $("div#no-results").show();
      }
    }, 0);
  });
}

// Test to see if a school is within the selected grades.
function schoolInGrades(school) {
  if (selectedGrades.indexOf(school.grade_low) >= 0) {
    return true;
  } else if (selectedGrades.indexOf(school.grade_high) >= 0) {
    return true;
  }
  return false;
}

function* generateSchoolItems(localSchools) {
  for (var i=0; i < localSchools.length; i++) {
    let school = localSchools[i]; // school variable to make it easier for us.
    // Check to see if the school is within the grade boundries selected.
    if (!schoolInGrades(school)) continue;
    // check the total number of students.
    if (school.total_students == undefined) continue;
    let totalStudents = parseInt(school.total_students.replace(/,/g, ''));
    if (totalStudents >= minStudents && totalStudents <= maxStudents) {
      let schoolItem = $("<li></li>")
        .append(
          $("<div></div>").addClass("school-item").append(
            $("<p></p>").addClass("padded-bottom").text(school.name + " - " + school.city + ", " + school.state),
            $("<p></p>").text("Total Students: " + totalStudents)));
      schoolItem.attr("id", "school-item-"+i);
      schoolItem.addClass("school-item");
      yield schoolItem;
    }
  }
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
  var def = $.Deferred();
  schools = JSON.parse(localStorage.getItem('schools'));
  if (schools == null || hardRefresh) {
    $.getJSON("https://peachjar-finder.s3-us-west-2.amazonaws.com/schools.json", function(data) {
      localStorage.setItem('schools', JSON.stringify(data));
      schools = data;
      def.resolve(schools);
    });
  } else {
    def.resolve(schools);
  }
  return def;
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
    lastGradesSelected = JSON.stringify(getSelectedGrades());
    setSelectedGradesText();
  }
  getSchools()
    .done((schools) => {
      let listUpdatePromise = (new Promise(updateSelectedOptions))
        .catch((err) => console.log(err));
  });
});
