var mongoose = require('mongoose');
var MoodPointSchema = mongoose.Schema({
    message: String,
    creationDate: { type: Date, default: Date.now },
    //updatedDate: { type: Date, default: Date.now }
    mtype: Number,
    locName: String,
    loc: {
        type: { type: String },
        coordinates:[Number]
    }
});

var MoodPointModel = module.exports = mongoose.model('mood', MoodPointSchema);

module.exports.getTweetById = function(id, callback) {
  TweetModel.findById(id, callback);
}