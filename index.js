const dotenv = require("dotenv");
dotenv.config();
const cors = require('cors');
const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT;
const dbConfig = require("./config/db.config");
dbConfig.connectDB();
app.use(cors()); 
app.use(express.json());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/v1/product", require("./route/product.route"));
app.use("/api/v1/auth", require("./route/auth.route"));
app.use("/api/v1/category", require("./route/category.route"));
app.use("/api/v1/subCategory", require("./route/subcategory.route"));
app.use("/api/v1/order", require("./route/order.route"));
app.use("/api/v1/testimonial", require("./route/testimonial.route"));
app.use("/api/v1/user", require("./route/user.route"));

app.use(require("./middlewares/notFound.middleware"));
app.use(require("./middlewares/errorHandler.middleware"));

app.listen(port, (_) => console.log(`Server started at ${port}`));