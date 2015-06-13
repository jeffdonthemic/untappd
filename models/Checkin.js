'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Checkin = new Schema({
  _id: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    required: true
  },
  comment: {
    type: String,
    required: false,
  },
  rating_score: {
    type: Number,
    required: true
  },
  beer: {
    type: Object,
    required: true
  },
  brewery: {
    type: Object,
    required: true
  },
  venue: {
    type: Object,
    required: true
  },
  badges: {
    type: Object,
    required: true
  }
});

module.exports = mongoose.model('Checkin', Checkin);
