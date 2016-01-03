// adapted from http://stackoverflow.com/questions/646628/how-to-check-if-a-string-startswith-another-string
var stringStartsWith = module.exports.stringStartsWith = function(larger, smaller) {
  return larger.slice(0, smaller.length) == smaller;
};

var plainMimePrefixes = ['text'];
var plainMimes = ['application/octet-stream'];
module.exports.isAscii = function(mime) {
  for (var i in plainMimePrefixes) {
    if (stringStartsWith(mime, plainMimePrefixes[i] + '/')) return true;
  }
  for (var j in plainMimes) {
    if (plainMimes[j] == mime) return true;
  }
  return false;
};
