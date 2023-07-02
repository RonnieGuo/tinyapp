const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// create an object to store users
const users = {
  user1: {
    id: "user1",
    email: "user1@gmail.com",
    password: "user1",
  },
  user2: {
    id: "user2",
    email: "user2@gmail.com",
    password: "user2",
  }
};

const generateRandomString = (length = 6) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }

  return result;
};

const getUserByEmail = (email) => {
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

// Middleware function to check if a user is logged in
const requireLogin = (req, res, next) => {
  if (!req.cookies.user_id) {
    res.redirect("/login");
  } else {
    next();
  }
};

// Middleware function to check if a user is logged out
const requireLogout = (req, res, next) => {
  if (req.cookies.user_id) {
    res.redirect("/urls");
  } else {
    next();
  }
};


app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const userId = req.cookies.user_id;
  const user = users[userId];
  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_index", templateVars);
});

app.get("/hello", (req, res) => {
  const templateVars = { greeting: "Hello World!" };
  res.render("hello_world", templateVars);
});

// GET route for /urls/new
app.get("/urls/new", (req, res) => {
  if (!req.cookies.user_id) {
    res.redirect("/login");
  } else {
    const userId = req.cookies.user_id;
    const user = users[userId];
    res.render("urls_new", { user: user });
  }
});

// GET route for /urls/:id
app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const userId = req.cookies.user_id;
  const user = users[userId];

  if (!urlDatabase[id]) {
    res.status(404).send("Short URL not found");
    return;
  }

  const templateVars = { id: id, longURL: urlDatabase[id], user: user };
  res.render("urls_show", templateVars);
});

// POST route for /urls
app.post("/urls", (req, res) => {
  if (!req.cookies.user_id) {
    res.status(403).send("You must be logged in to shorten URLs.");
    return;
  }

  const userId = req.cookies.user_id;
  const user = users[userId];
  const id = generateRandomString();
  const longURL = req.body.longURL;
  urlDatabase[id] = longURL;
  res.redirect("/urls");
});

// GET route for /u/:id
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL];

  if (longURL) {
    res.redirect(longURL);
  } else {
    res.status(404).send("Short URL not found");
  }
});

app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  const newLongURL = req.body.newLongURL;
  urlDatabase[id] = newLongURL;
  res.redirect("/urls");
});

app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// GET route for /register
app.get("/register", requireLogout, (req, res) => {
  const templateVars = { user: null };
  res.render("register", templateVars);
});

// POST route for /register
app.post("/register", requireLogout, (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).send("Email or password cannot be empty");
    return;
  }

  const user = getUserByEmail(email);
  if (user) {
    res.status(400).send("Email already exists");
    return;
  }

  const userId = generateRandomString();

  const newUser = {
    id: userId,
    email: email,
    password: password,
  };

  users[userId] = newUser;

  res.cookie("user_id", userId);
  res.redirect("/urls");
});

// GET route for /login
app.get("/login", requireLogout, (req, res) => {
  const templateVars = { user: null };
  res.render("login", templateVars);
});

// POST route for /login
app.post("/login", requireLogout, (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = getUserByEmail(email);

  if (!user || user.password !== password) {
    res.status(403).send("Invalid email or password");
  } else {
    res.cookie("user_id", user.id);
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/login");
});
