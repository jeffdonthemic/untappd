var express = require('express');
var router = express.Router();
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
var _ = require('lodash');
var Checkin = require('../models/Checkin');

router.get('/activity_feed', function(req, res, next) {
  request('https://api.untappd.com/v4/checkin/recent?access_token='+req.cookies.access_token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body);
      res.json(results.response.checkins.items[0]);
    } else {
      console.log(error);
    }
  });
});

router.get('/breweries', function(req, res, next) {

  var breweryCheckins = [];
  var breweryIds = [];

  Checkin.find({'venue.categories.items.category_name': 'Brewery'}, function (err, checkins) {
    _.forEach(checkins, function(checkin) {
      if (breweryIds.indexOf(checkin.brewery.brewery_id) === -1) {
        breweryIds.push(checkin.brewery.brewery_id);
        breweryCheckins.push(checkin);
      }
    });
    res.json(breweryCheckins);
  });

});

router.get('/buy_a_beer/:username', function(req, res, next) {

  Promise.join(
    venueCheckins('39.0821', '-94.5965', req.cookies.access_token),
    wishList(req.params.username, req.cookies.access_token)
  ).then(function(data) {

    // get a random beer from the item array
    var randomBeerItem = Math.floor((Math.random() * data[0].length) + 1)
    // hack a beer into the venue checkins
    data[1].push(_.omit(data[0][randomBeerItem], 'venue'));

    // create arrays of all beer chckins and wishlist
    venueBeerIds = _.pluck(data[0], 'id');
    wishListBeerIds = _.pluck(data[1], 'id');

    var theBeer = _.first(_.intersection(venueBeerIds, wishListBeerIds));

    res.json(_.findWhere(data[0], { 'id': theBeer }));
  }).catch(function(e) {
    res.json(e);
  });

});

router.get('/checkin', function(req, res, next) {
  request('https://api.untappd.com/v4/user/checkins/jeffdonthemic?access_token='+req.cookies.access_token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var results = JSON.parse(body);
      var checkin = _.omit(results.response.checkins.items[0], ['user', 'comments', 'toasts', 'media', 'source']);

      var c = new Checkin({
        _id: checkin.checkin_id,
        created_at: checkin.created_at,
        comment: checkin.checkin_comment,
        rating_score: checkin.rating_score,
        beer: checkin.beer,
        brewery: checkin.brewery,
        venue: checkin.venue,
        badges: checkin.badges
      });

      c.save(function(error, doc) {
        if (error) {
          console.log('Error inserting checking ' + c._id);
        }
      });

      res.json(c);
    } else {
      console.log(error);
    }
  });
});

router.get('/loadAll', function(req, res, next) {

  var allCheckins = [];
  var totalCheckins = 0;

  var getCheckins = function(url, access_token) {
    console.log('===================');
    console.log('Calling getCheckings with ', url);
    var untappdUrl = url  + '&access_token=' + access_token;

    request(untappdUrl).then(function(response) {
      var results = JSON.parse(response[0].body);
      totalCheckins = totalCheckins + results.response.checkins.items.length;

      console.log('Processing ' + results.response.checkins.items.length + ' items. Currently ' + allCheckins.length + '.');
      _.forEach(results.response.checkins.items, function(item) {

        var checkin = _.omit(item, ['user', 'comments', 'toasts', 'media', 'source']);

        var c = new Checkin({
          _id: checkin.checkin_id,
          created_at: checkin.created_at,
          comment: checkin.checkin_comment,
          rating_score: checkin.rating_score,
          beer: checkin.beer,
          brewery: checkin.brewery,
          venue: checkin.venue,
          badges: checkin.badges
        });

        c.save(function(error, doc) {
          if (error) {
            console.log('===> Error inserting checkin ' + c._id);
            console.log(error);
          } else {
            console.log('Inserted checkin ' + c._id);
          }
        });

        allCheckins.push(item)
      });

      if (results.response.checkins.items.length === 0) {
        res.json(allCheckins.length);
      } else {
        getCheckins('https://api.untappd.com/v4/user/checkins/jeffdonthemic?1=1&max_id='+results.response.pagination.max_id, access_token);
      }

    }).catch(function(err) {
      console.error(err);
    });

  }

  getCheckins('https://api.untappd.com/v4/user/checkins/jeffdonthemic?1=1', req.cookies.access_token);

});

var getAllCheckins = function(access_token) {

  var allCheckins = [];

  function getCheckins(access_token){

    request('https://api.untappd.com/v4/user/checkins/jeffdonthemic?access_token='+req.cookies.access_token, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var results = JSON.parse(body);

        var nextUrl = results.response.pagination.since_url + '&access_token=' + req.cookies.access_token;
        console.log(nextUrl);

        res.json(results.response);
      } else {
        console.log(error);
      }
    });


  }

  return allCheckins;

}

var venueCheckins = function(lat, lng, access_token) {
  return new Promise(function(resolve, reject) {
    request('https://api.untappd.com/v4/thepub/local?limit=25&radius=25&lat='+lat+'&lng='+lng+'&access_token='+access_token, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var results = JSON.parse(body);
        var checkins = [];
        _.forEach(results.response.checkins.items, function(item, key) {
          checkins.push({
            id: item.beer.bid,
            name: item.beer.beer_name,
            brewery: {
              id: item.brewery.brewery_id,
              name: item.brewery.brewery_name
            },
            venue: {
              id: item.venue.venue_id,
              name: item.venue.venue_name,
              category: item.venue.primary_category,
              location: item.venue.location
            }
          });
        });
        resolve(checkins);
      } else {
        reject(error);
      }
    });
  });
};

var wishList = function(username, access_token) {
  return new Promise(function(resolve, reject) {
    request('https://api.untappd.com/v4/user/wishlist/'+username+'?access_token='+access_token, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var results = JSON.parse(body);
        var beers = [];
        _.forEach(results.response.beers.items, function(item, key) {
          beers.push({
            id: item.beer.bid,
            name: item.beer.beer_name,
            style: item.beer.beer_style,
            brewery: {
              id: item.brewery.brewery_id,
              name: item.brewery.brewery_name
            }
          });
        });
        resolve(beers);
      } else {
        reject(error);
      }
    });
  });
};

module.exports = router;
