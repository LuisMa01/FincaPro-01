require("dotenv").config();
const express = require("express");
const cors = require("cors");

const path = require("path");

const cookieParser = require("cookie-parser");
const app = express();
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



const corsOptions = require("./config/corsOptions");
app.use(logger);

app.use(cors(corsOptions));



app.use("/", express.static(path.join(__dirname, "public")));

app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/act", require("./routes/actRoute"));
app.use("/plant", require("./routes/plantRoute"));
app.use("/camp", require("./routes/campRoute"));
app.use("/dose", require("./routes/doseRoute"));
app.use("/crop", require("./routes/cropRoute"));
app.use("/app", require("./routes/appRoute"));
app.use("/item", require("./routes/itemRoute"));
app.use("/cost", require("./routes/costRoute"));
app.use("/comt", require("./routes/comRoute"));

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

app.listen(process.env.PORT || 5000);
