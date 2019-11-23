var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://shital:shital732@ds033599.mlab.com:33599/heroku_jm8pw3rv", { useNewUrlParser: true });

// Routes

// Route for scraping the nytimes website

app.get('/scrape', function(req,res) {
    //First we get the body of the html with axios
    axios.get('https://www.wsj.com/').then(function(response) {
        //Then, we load that into cheerio and save it to $ for a shorthand selector 
        var $ = cheerio.load(response.data);
        //Now we take every 'a' from article tag, and do the following:
        $('article').each(function(i, element) {
            //Save an empty result object 
            var result = {};

            //Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children('.WSJTheme--headline--3qd-ycaT ').text();
            result.summary = $(this).children('.WSJTheme--summary--12br5Svc ').text();

            // Create a new Article using the 'result' object built from scraping
            db.Article.create(result)
            .then(function(dbArticle) {
                console.log(dbArticle);
            })
            .catch(function(err) {
                console.log(err);
            });
        });
        res.send("Scraping complete");
    })

});

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "./public/index.html"));
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
      .then(function(dbArticle) {
        // If we were able to successfully find Articles, send them back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
//Route for grabbing a specific Article by id, populate it with it's note

app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
      // ..and populate all of the notes associated with it
      .populate("note")
      .then(function(dbArticle) {
        // If we were able to successfully find an Article with the given id, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  
// Routes for grabbing the notes
app.get('/notes', function(req,res) {
    db.Note.find({})
    .then(function(dbNote) {
        res.json(dbNote);
    })
    .catch(function(err) {
        res.json(err);
    })
})
// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
      .then(function(dbNote) {
        // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
      })
      .then(function(dbArticle) {
        // If we were able to successfully update an Article, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });
  //Delete Article from the db

  app.get("/delete/:id", function(req,res) {
      //Remove an article 
      db.Article.remove({_id: req.params.id}, function(err, removed) {
          if(err) {
              res.send(err);
          } else {
              console.log(removed);
              res.send(removed);
          }
      });
  });



// Start the server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
  });
  