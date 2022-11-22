require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// This one is mandatory, allows our app to talk with html forms
app.use(express.urlencoded()) 

//const router = express.Router()

const Link = require('./Link')
//const asyncHandler = require('express-async-handler')


const connectDB = require('./dbConn')
const mongoose = require('mongoose')

//const linksController = require('./linksController')

// imports to check if url's coming from html are valid ones and to redirect to links
const dns = require("dns").promises;
const URL = require("url").URL;



// Basic Configuration
const PORT = process.env.PORT | 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


connectDB()
 
//allow our app to use raw json like the ones postman sends
app.use(express.json())


// redirects to the url we have stored in mongo
app.get('/api/shorturl/:shortUrl', async(req, res) => {

  //get the user input
  const { shortUrl:short } = req.params

  //shortLink is the name in of the field we defined in the model
  const link = await Link.findOne({"shortLink": short}).lean().exec()
  
  //if empty it's because we didn't find it in BBDD
  if (!link) {
    return res.status(400).json({ error: 'No short URL found for the given input' })
  }

  //this does the redirect to the link we got
  res.redirect(link.url)
});


// stores new links in mongo
app.post('/api/shorturl', async(req, res) => {

  //we got the url from the html form ( http://www.google.com )
  const { url } = req.body

  // Confirm that is not empty
  if (!url) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  try {
    // creating new URL objects using the URL constructor might return errors so 
    // we capture those with a try and catch so the app won't stop
    // (www.google.com) this have no protocol so the URL will throw an error for example
    const { hostname, protocol } = new URL(url);

    //if somehow the URL constructor send empty protocol or empty hostname it will be an invalid url
    if (!hostname | !protocol) {
      return res.json({ error: "invalid url" })
    }
  
    // if the protocol is not http for our app it will be an invalid url
    // (ftp://www.google.com) is valid, has protocol but we do not redirect to ftp sites, only web
    if (protocol !== "http:" && protocol !== "https:" ) {
      return res.json({ error: "invalid url" })
    }

    // we using dns to check if the domain exists, if lookup function can't find it or there's a net error
    // it will be rejected as an invalid url
    dns
      .lookup(hostname)
      //.then(()=>{ })
      .catch((e)=>{
        return res.json({ error: "invalid url" })
      })
  }

  // this is the invalid error for the URL constructor failing
  catch{
    return res.json({ error: "invalid url" })
  }

  // check for duplicate, maybe this link was already created
  const duplicate = await Link.findOne({ url }).lean().exec()
  

  if (duplicate) {
    // if it exists on DB we send the shortlink back
    return res.json({ original_url: url, short_url: duplicate.shortLink })
  }

  // creating a linkObject to fill it with the info we are going to store in DB
  const linkObject = { url }

  // Create and store new link
  const link = await Link.create(linkObject)

  if (link) { //if isn't empty it's because it was created so we send back to client the shortlink
    res.status(201).json({ original_url: link.url, short_url: link.shortLink })
  }
  else {
    res.status(400).json({ message: 'Service unavailable - try later' })
  }
});




// open mongo connection
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB')
  // launch nodejs app
  app.listen(PORT, () => console.log(`App running on port ${PORT}`))
})