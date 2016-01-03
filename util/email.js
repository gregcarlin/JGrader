var mailgun = require('mailgun-js')({
  apiKey: creds.mailgun_key,
  domain: 'jgrader.com'
});

var transporter = {
  sendMail: function(options, callback) {
    options.from = options.from || 'no-reply@jgrader.com';
    options.to = options.to || 'contact@jgrader.com';
    mailgun.messages().send(options, callback);
  }
};
if (process.env.MODE == 'TEST') {
  transporter = {
    sent: [],
    sendMail: function(options, callback) {
      options.from = options.from || 'no-reply@jgrader.com';
      options.to = options.to || 'contact@jgrader.com';
      this.sent.push(options);
      callback();
    }
  };
}

module.exports = transporter;
