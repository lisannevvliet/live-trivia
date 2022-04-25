// Import Dotenv.
require("dotenv").config()
// Import Express.
const express = require("express")
// Initialise Express.
const app = express()
// Create an HTTP server.
const server = require("http").createServer(app)
// Import and initialise Socket.IO.
const io = require("socket.io")(server)
// Import Handlebars.
const handlebars = require("express-handlebars")
// Import node-fetch.
const fetch = require("node-fetch")
// Import entities to decode HTML entities.
const entities = require("entities")

// Render static files.
app.use(express.static("static"))

// Set the view engine to Handlebars.
app.engine("handlebars", handlebars.engine())
app.set("view engine", "handlebars")

// Parse incoming requests.
app.use(express.urlencoded({
  extended: true
}))

let connected = []
let trivia
let answers = []

io.on("connection", (socket) => {
  // Add the connection ID to the list of connected clients.
  connected.push(socket.id)

  // Emit the amount of connected clients.
  io.emit("connection", connected.length)

  if (trivia == undefined) {
    // Get the trivia from the API.
    fetch("https://opentdb.com/api.php?amount=1&category=18&difficulty=easy&type=multiple")
    .then(response =>
      response.json()
    )
    .then(data => {
      // Decode the trivia's question.
      data.results[0].question = entities.decodeHTML(data.results[0].question)

      // Decode the trivia's incorrect answers.
      data.results[0].incorrect_answers.forEach(element => 
        element = entities.decodeHTML(element)
      )

      // Add an array of randomized answers and decode the trivia's correct answer.
      data.results[0].answers = [entities.decodeHTML(data.results[0].correct_answer)].concat(data.results[0].incorrect_answers).sort(function() {
        return 0.5 - Math.random()
      })

      // Emit the trivia.
      io.emit("trivia", data.results[0])

      // Save the most recent trivia.
      trivia = data.results[0]

      // Clear the answers.
      answers = []
    })
  } else {
    // Emit the existing trivia.
    io.emit("trivia", trivia)
  }

  socket.on("disconnect", () => {
    // Remove the connection ID from the list of connected clients.
    connected = connected.filter(function(id) {
      return id != socket.id
    })

    // Emit the amount of connected clients.
    io.emit("connection", connected.length)
  })

  socket.on("answer", answer => {
    io.emit("answer", answer)

    answers.push(answer)

    if (answers.length == connected.length) {
      // Get the trivia from the API.
      fetch("https://opentdb.com/api.php?amount=1&category=18&difficulty=easy&type=multiple")
        .then(response =>
          response.json()
        )
        .then(data => {
          // Decode the trivia's question.
          data.results[0].question = entities.decodeHTML(data.results[0].question)

          // Decode the trivia's incorrect answers.
          data.results[0].incorrect_answers.forEach(element => 
            element = entities.decodeHTML(element)
          )

          // Add an array of randomized answers and decode the trivia's correct answer.
          data.results[0].answers = [entities.decodeHTML(data.results[0].correct_answer)].concat(data.results[0].incorrect_answers).sort(function() {
            return 0.5 - Math.random()
          })

          io.emit("trivia", data.results[0])

          // Save the most recent trivia.
          trivia = data.results[0]

          // Clear the answers.
          answers = []
        })
    }
  })
})

// Set and log the port for the HTTP server.
server.listen(process.env.PORT, () =>
  console.log(`HTTP server running at http://localhost:${process.env.PORT}.`)
)

// Listen to all GET requests on /.
app.get("/", (_req, res) =>
  // Load the index page.
  res.render("index")
)

// Listen to all POST requests on /.
app.post("/", (req, res) => {
  // Load the trivia page with the name and whether it ends with an "s".
  res.render("trivia", {
    name: req.body.name,
    s: !(req.body.name.endsWith("s") || req.body.name.endsWith("S"))
  })
})