var addRow = function() {
  $('form#caseCreate div').append(
    '<textarea class="form-control input" placeholder="Test Input" ' +
    'name="in_case[]"></textarea><textarea class="form-control output" ' +
    'placeholder="Expected Output" name="out_case[]"></textarea>');
};

$(document).ready(function() {
  addRow(); // initially have one row available
});

