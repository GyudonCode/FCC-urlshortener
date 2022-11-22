
const mongoose = require('mongoose')
const autoIncrement = require('mongoose-sequence')(mongoose)

const linkSchema = new mongoose.Schema({
// shortLink: {
//    type: String,
//    required: true
//  },
  url: {
    type: String,
    required: true
  }
})

linkSchema.plugin(autoIncrement, {
  inc_field: 'shortLink',
  id: 'seqNums',
  start_seq: 0
}) 


module.exports = mongoose.model('Link', linkSchema)
