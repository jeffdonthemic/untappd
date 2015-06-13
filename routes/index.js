var express = require('express');
var router = express.Router();
var request = require('request');

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.cookies.access_token) {
    res.render('index', { access_token: req.cookies.access_token });
  } else {
    res.redirect('/login');
  }
});

router.get('/login', function(req, res, next) {
  res.redirect('https://untappd.com/oauth/authenticate/?client_id='+process.env.CLIENT_ID+'&response_type=code&redirect_url=' + process.env.REDIRECT_URL);
});

router.get('/logout', function(req, res, next) {
  res.clearCookie('access_token');
  res.render('loggedout');
});

router.get('/callback', function(req, res, next) {
  request('https://untappd.com/oauth/authorize/?client_id='+process.env.CLIENT_ID+'&client_secret='+process.env.CLIENT_SECRET+'&response_type=code&redirect_url='+process.env.REDIRECT_URL+'&code='+req.query.code, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.cookie('access_token', JSON.parse(body).response.access_token);
      res.redirect('/');
    } else {
      console.log(error);
    }
  });
});

module.exports = router;
