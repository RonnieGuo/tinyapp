const bcrypt = require('bcryptjs');
const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

app.set("view engine", "ejs");

const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
}));

app.use(express.urlencoded({ extended: true }));

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "user1",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "user1",
  },
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
  },
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

const urlsForUser = (id) => {
  const filteredUrls = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      filteredUrls[shortURL] = urlDatabase[shortURL];
    }
  }
  return filteredUrls;
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
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.status(401).send("Please login or register first.");
    return;
  }

  const userUrls = urlsForUser(userId);
  const templateVars = { urls: userUrls, user: user };
  res.render("urls_index", { urlDatabase: userUrls, user: user });
});

app.get("/hello", (req, res) => {
  const templateVars = { greeting: "Hello World!" };
  res.render("hello_world", templateVars);
});

app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.redirect("/login");
  } else {
    res.render("urls_new", { user: user });
  }
});

app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.status(401).send("Please login or register first.");
    return;
  }

  const url = urlDatabase[id];

  if (!url) {
    res.status(404).send("URL not found");
    return;
  }

  if (url.userID !== userId) {
    res.status(403).send("Access denied. You do not own this URL.");
    return;
  }

  const templateVars = { id: id, longURL: url.longURL, user: req.user, shortURL: id };
  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  const id = req.params.id;
  const url = urlDatabase[id];

  if (!url) {
    res.status(404).send("URL not found");
    return;
  }

  res.redirect(url.longURL);
});

app.get("/register", (req, res) => {
  const templateVars = { user: null };
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).send("Email and password fields cannot be empty");
    return;
  }

  const existingUser = getUserByEmail(email);

  if (existingUser) {
    res.status(400).send("Email already registered");
    return;
  }

  const userId = generateRandomString();
  const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password
  users[userId] = { id: userId, email: email, password: hashedPassword }; // Save the hashed password
  req.session.user_id = userId;
  res.redirect('/urls');
});

app.get("/login", (req, res) => {
  const templateVars = { user: null };
  res.render("login", templateVars);
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).send("Email and password fields cannot be empty");
    return;
  }

  const user = getUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).send('Invalid email or password');
    return;
  }

  req.session.user_id = user.id;
  res.redirect('/urls');
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.get("/urls/:id/edit", (req, res) => {
  const id = req.params.id;
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.status(401).send("Please login or register first.");
    return;
  }

  const url = urlDatabase[id];

  if (!url) {
    res.status(404).send("URL not found");
    return;
  }

  if (url.userID !== userId) {
    res.status(403).send("Access denied. You do not own this URL.");
    return;
  }

  const templateVars = { shortURL: id, longURL: url.longURL, user: user };
  res.render("urls_edit", templateVars);
});

app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.status(401).send("Please login or register first.");
    return;
  }

  const url = urlDatabase[id];

  if (!url) {
    res.status(404).send("URL not found");
    return;
  }

  if (url.userID !== userId) {
    res.status(403).send("Access denied. You do not own this URL.");
    return;
  }
  urlDatabase[id].longURL = req.body.newLongURL;
  res.redirect("/urls");
});

app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.status(401).send("Please login or register first.");
    return;
  }

  const longURL = req.body.longURL;
  const shortURL = generateRandomString(); // Replace this with your function to generate a short URL ID

  // Assuming you have a urlDatabase object to store the URLs
  urlDatabase[shortURL] = {
    longURL: longURL,
    userID: userId,
  };

  res.redirect("/urls");
});

app.post("/urls/:id/delete", (req, res) => {
  const id = req.params.id;
  const userId = req.session.user_id;
  const user = users[userId];

  if (!user) {
    res.status(401).send("Please login or register first.");
    return;
  }

  const url = urlDatabase[id];

  if (!url) {
    res.status(404).send("URL not found");
    return;
  }

  if (url.userID !== userId) {
    res.status(403).send("Access denied. You do not own this URL.");
    return;
  }

  delete urlDatabase[id];
  res.redirect("/urls");
});

app.get("*", (req, res) => {
  res.status(404).send("Page not found");
});
