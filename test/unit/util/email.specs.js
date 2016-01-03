var assert = require('assert');

var email = require('../../../util/email');

describe('Email', function() {
  describe('Send mail', function() {
    var sent;

    before(function(done) {
      email.sendMail({ from: 'me', to: 'you' }, done);
    });

    it('should send the message', function() {
      assert(email.sent);
      assert.equal(email.sent.length, 1);
      assert.equal(email.sent[0].from, 'me');
      assert.equal(email.sent[0].to, 'you');
    });
  });
});
