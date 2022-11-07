const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const BookInstance = require("../models/bookinstance");
const { body, validationResult } = require("express-validator");


const async = require("async");

/* Homepage controller. Displays a count of the entire contents of database collections. */
exports.index = (req, res, next) => {
    async.parallel(
        {
            book_count(callback) {
                /* Pass an empty object as match condition to find all documents
                in the collection. */
                Book.countDocuments({}, callback);
            },
            book_instance_count(callback) {
                BookInstance.countDocuments({}, callback);
            },
            book_instance_available_count(callback) {
                /* Only book instances whose status field is set to Available are 
                returned. */
                BookInstance.countDocuments({ status: "Available"}, callback);
            },
            author_count(callback) {
                Author.countDocuments({}, callback);
            },
            genre_count(callback) {
                Genre.countDocuments({}, callback);
            },
        },
        (err, results) => {
            res.render("index", {
                title: "Local Library Home",
                error: err,
                data: results,
            });
        }
    );
};

// Display list of all books.
exports.book_list = (req, res, next) => {
    /* find() returns all Book objects. Here, it only returns the title and author.
    it will also return the _id and virtual fields. */
    Book.find({}, "title author")
    /* Sort title alphabetically. */
    .sort({title: 1})
    /* Replace the stored book author id with the full author details. This takes the
    'author' field in the books collection and pulls in the data from the 'authors'
    collection.*/
    .populate("author")
    .exec(function(err, list_books){
        if (err) {
            return next(err);
        }
        /* Pass the title to the book_list template. */
        res.render("book_list", {
            title: "Book List",
            book_list: list_books
        });
    })
};

// Display detail page for a specific book.
exports.book_detail = (req, res, next) => {
    async.parallel(
      {
        book(callback) {
          Book.findById(req.params.id)
            .populate("author")
            .populate("genre")
            .exec(callback);
        },
        book_instance(callback) {
          BookInstance.find({ book: req.params.id }).exec(callback);
        },
      },
      (err, results) => {
        if (err) {
          return next(err);
        }
        if (results.book == null) {
          // No results.
          const err = new Error("Book not found");
          err.status = 404;
          return next(err);
        }
        // Successful, so render.
        res.render("book_detail", {
          title: results.book.title,
          book: results.book,
          book_instances: results.book_instance,
        });
      }
    );
  };

// Display book create form on GET.
exports.book_create_get = (req, res, next) => {
    // Get all authors and genres.
    async.parallel({
        authors(callback) {
            Author.find(callback);
        },
        genres(callback) {
            Genre.find(callback);
        },
    },
    (err, results) => {
        if (err) {
            return next(err);
        }
        res.render("book_form", {
            title: "Create Book",
            authors: results.authors,
            genres: results.genres,
        });
    });
};

// Handle book create on POST.
exports.book_create_post = [
    // convert genre to array
    (req,res,next) => {
        if(!Array.isArray(req.body.genre)) {
            req.body.genre = typeof req.body.genre === "undefined" ? [] : [req.body.genre];
        }
        next();
    },

    body("title", "Title must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("author", "Author must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("summary", "Summary must not be empty.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
    body("genre.*").escape(),

    (req,res,next) => {
        const errors = validationResult(req);

        // Create a Book object with proper data
        const book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre,
        });

        if (!errors.isEmpty()) {
            async.parallel({
                authors(callback) {
                    Author.find(callback)
                },
                genres(callback) {
                    Genre.find(callback);
                },
            },
            (err, results) => {
                if(err) {
                    return next(err);
                }

                // Mark selected genres as checked.
                for (const genre of results.genres) {
                    if (book.genre.includes(genre._id)) {
                        genre.checked = "true";
                    }
                }
                res.render("book_form", {
                    title: "Create Book",
                    authors: results.authors,
                    genres: results.genres,
                    book,
                    errors: errors.array(),
                });
            });
            return
        }
        book.save((err) => {
            if(err) {
                return next(err);
            }
            res.redirect(book.urlId);
        });
    },
];

// Display book delete form on GET.
exports.book_delete_get = (req, res, next) => {
    async.parallel({
        book(callback) {
            Book.findById(req.params.id).exec(callback)
        }
    },
        (err, results) => {
            if (err) {
                return next(err)
            }
            if (results.book == null) {
                res.redirect("/catalog/books")
            }
            //console.log(results);
            res.render("book_delete", {
                title: "Delete Book",
                book: results.book,
            });
        }
    )
};

// Handle book delete on POST.
exports.book_delete_post = (req, res, next) => {
    async.parallel({
        book(callback) {
            Book.findById(req.params.id).exec(callback)
        }
    },
        (err, results) => {
            if (err) {
                return next(err);
            }
            if (results.book.length > 0) {
                res.render("book_delete", {
                    title: "Delete Book",
                    book: results.book,
                });
                return
            }
            //console.log(req.body.bookid);
            Book.findByIdAndRemove(req.params.id, (err) => {
                if (err) {
                    return next(err);
                }
                res.redirect("/catalog/books");
            });
        }
    );
};

// Display book update form on GET.
exports.book_update_get = (req, res, next) => {
    async.parallel({
        book(callback) {
            Book.findById(req.params.id)
            .populate("author")
            .populate("genre")
            .exec(callback);
        },
        authors(callback) {
            Author.find(callback);
        },
        genres(callback) {
            Genre.find(callback);
        },
    },
    (err, results) => {
        if (err) {
            return next(err);
        }
        if (results.book == null) {
            const err = new Error("Book not found");
            err.status = 404;
            return next(err);
        }
        /* Success, mark our selected genres as checked. */
        for (const genre of results.genres) {
            for (const bookGenre of results.book.genre) {
                if (genre._id.toString() === bookGenre._id.toString()) {
                    genre.checked = "true";
                }
            }
        }
        res.render("book_form", {
            title: "Update Book",
            authors: results.authors,
            genres: results.genres,
            book: results.book,
        });
    });
};

// Handle book update on POST.
// Handle book update on POST.
exports.book_update_post = [
    // Convert the genre to an array
    (req, res, next) => {
      if (!Array.isArray(req.body.genre)) {
        req.body.genre =
          typeof req.body.genre === "undefined" ? [] : [req.body.genre];
      }
      next();
    },
  
    // Validate and sanitize fields.
    body("title", "Title must not be empty.")
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body("author", "Author must not be empty.")
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body("summary", "Summary must not be empty.")
      .trim()
      .isLength({ min: 1 })
      .escape(),
    body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
    body("genre.*").escape(),
  
    // Process request after validation and sanitization.
    (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);
  
      // Create a Book object with escaped/trimmed data and old id.
      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
        _id: req.params.id, //This is required, or a new ID will be assigned!
      });
  
      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/error messages.
  
        // Get all authors and genres for form.
        async.parallel(
          {
            authors(callback) {
              Author.find(callback);
            },
            genres(callback) {
              Genre.find(callback);
            },
          },
          (err, results) => {
            if (err) {
              return next(err);
            }
  
            // Mark our selected genres as checked.
            for (const genre of results.genres) {
              if (book.genre.includes(genre._id)) {
                genre.checked = "true";
              }
            }
            res.render("book_form", {
              title: "Update Book",
              authors: results.authors,
              genres: results.genres,
              book,
              errors: errors.array(),
            });
          }
        );
        return;
      }
  
      // Data from form is valid. Update the record.
      Book.findByIdAndUpdate(req.params.id, book, {}, (err, thebook) => {
        if (err) {
          return next(err);
        }
  
        // Successful: redirect to book detail page.
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`
        const redUrl = fullUrl.substring(0, fullUrl.indexOf('/update'));
        res.redirect(redUrl);
      });
    },
  ];