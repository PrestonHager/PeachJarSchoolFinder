// state_selector_script.js
// by Preston Hager

let allStates = {"AL":"Alabama","AK":"Alaska","AS":"American Samoa","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District Of Columbia","FM":"Federated States Of Micronesia","FL":"Florida","GA":"Georgia","GU":"Guam","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MH":"Marshall Islands","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","MP":"Northern Mariana Islands","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PW":"Palau","PA":"Pennsylvania","PR":"Puerto Rico","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VI":"Virgin Islands","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"};
let allStatesSwapped = Object.keys(allStates).reduce(function(obj, key) {
  obj[allStates[key]] = key;
  return obj;
}, {});
var selectedStates = [];

// The list item is clicked then set the value of the input box.
$("ul#state-suggestions").on('click', "li.suggestion", function() {
  $("input#state-input").val($(this).text().trim());
  $("input#state-input").change();
});

// A selected state is clicked and must be removed.
$("div#selected-states-list").on('click', "p.selected-state", function() {
  let state = $(this).text().trim();
  let indexOfState = selectedStates.indexOf(state);
  selectedStates.splice(indexOfState, 1);
  if (indexOfState > 0) {
    $(this).prev().remove();
  } else if (selectedStates.length > 0) {
    $(this).next().remove();
  } else {
    $("div#selected-states-list").append(
      $("<p style=\"display: inline;\">None</p>")
    );
  }
  $(this).remove();
});

// Animations for on focus and focus lost.
$("input#state-input").focus(function() {
  $("div#suggestions").slideDown();
});
$("input#state-input").blur(function() {
  $("div#suggestions").slideUp();
});

// When the input is changed, try to add the state to the list of selections.
$("input#state-input").change(function() {
  let state = $(this).val();
  if (allStates.hasOwnProperty(state)) {
    // the state code was put in.
    let actualState = allStates[state];
    if (addState(actualState)) {
      $(this).val("");
    }
  } else if (allStatesSwapped.hasOwnProperty(state)) {
    // the state name was put in.
    if (addState(state)) {
      $(this).val("");
    }
  }
});

// When a key is pressed, try to display more relevant suggestions.
$("input#state-input").keyup(function(event) {
  var possibleState;
  if (!event.key.match(/[a-zA-Z]/i)) {
    possibleState = $(this).val() + event.key;
  } else {
    possibleState = $(this).val();
  }
  sortSuggestedStates(possibleState);
  // if the enter key was pressed then put in whatever the top suggestion is
  // as long as the input isn't empty (ie has been submitted already).
  if (event.key == "Enter" && possibleState != "") {
    let stateToAdd = $("ul#state-suggestions").find("li:visible:first").text();
    if (stateToAdd != "") {
      addState(stateToAdd);
      $(this).val("");
      sortSuggestedStates("");
    }
  }
});

function sortSuggestedStates(possibleState) {
  let sortedStatesReverse = Object.keys(allStatesSwapped).filter(function(el) {
    return !(el.toLowerCase().indexOf(possibleState.toLowerCase()) > -1);
  });
  $("ul#state-suggestions").children().show();
  for (var i=0; i < sortedStatesReverse.length; i++) {
    // hide the state in the selection menu.
    $("li#state-suggestion-"+allStatesSwapped[sortedStatesReverse[i]]).hide();
  }
}

// An add a state function for ease of use.
function addState(state) {
  if (selectedStates.indexOf(state) < 0) {
    if (selectedStates.length == 0) {
      $("div#selected-states-list").empty();
    }
    if (selectedStates.length > 0) {
      $("div#selected-states-list").append(
        $("<p class=\"selected-state-divider\">, </p>")
      );
    }
    selectedStates.push(state);
    let selectedStateElement = $("<p></p>")
      .addClass("selected-state")
      .attr("title", "Click to remove.")
      .text(state);
    $("div#selected-states-list").append(selectedStateElement);
    return true;
  }
  return false;
}

$(document).ready(function() {
  // preload all of the states as li elements to save on proccessing.
  for (let s in allStates) {
    let stateElement = $("<li></li>")
      .addClass("suggestion")
      .attr("id", "state-suggestion-"+s)
      .text(allStates[s]);
    $("ul#state-suggestions").append(stateElement);
  }
});
