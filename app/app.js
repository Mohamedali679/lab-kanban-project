const express = require("express");
const app = express();

app.use(express.static("static"));
app.set("view engine", "pug");
app.set("views", "./views");

// sample data for now
const items = [
  {
    id: 1,
    title: "Lost Wallet",
    description: "Black leather wallet",
    location: "Library",
    status: "Lost",
    category: "Wallet",
    userId: 1
  },
  {
    id: 2,
    title: "Found Keys",
    description: "Silver keys with blue keyring",
    location: "Cafeteria",
    status: "Found",
    category: "Keys",
    userId: 2
  }
];

const users = [
  {
    id: 1,
    name: "Jamal",
    email: "jamal@example.com"
  },
  {
    id: 2,
    name: "A1",
    email: "a1@example.com"
  }
];

// home
app.get("/", function(req, res) {
  res.send("Lost2Found is running");
});

// listing page
app.get("/items", function(req, res) {
  res.render("items", { items: items });
});

// detail page
app.get("/items/:id", function(req, res) {
  const item = items.find(i => i.id == req.params.id);
  if (!item) {
    return res.send("Item not found");
  }
  res.render("item-detail", { item: item });
});

// users list page
app.get("/users", function(req, res) {
  res.render("users", { users: users });
});

// user profile page
app.get("/users/:id", function(req, res) {
  const user = users.find(u => u.id == req.params.id);
  if (!user) {
    return res.send("User not found");
  }

  const userItems = items.filter(i => i.userId == req.params.id);
  res.render("user-profile", { user: user, userItems: userItems });
});

// categories page
app.get("/categories", function(req, res) {
  const categories = [...new Set(items.map(i => i.category))];
  res.render("categories", { categories: categories });
});

app.listen(3000, function() {
  console.log("Server running at http://127.0.0.1:3000/");
});