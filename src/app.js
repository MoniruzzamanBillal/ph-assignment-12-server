const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId, upsert } = require("mongodb");
const port = process.env.port || 5000;
const app = express();

const ParcelRoute = require("./Routes/ParcelRoute");

// mdmoniruzzamanbillal
// 8zm47LfYljftUhpM
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@shipease.zrucvqo.mongodb.net/?retryWrites=true&w=majority`;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://shipease-1604d.web.app/"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ! mongo db connection
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    // ! creating collection
    const database = client.db("shipease");
    const parcelsCollection = database.collection("parcels");
    const usersCollection = database.collection("users");
    // ! creating collection ends

    // ! parcels realted api

    // * add parcel to database
    app.post("/parcel", async (req, res) => {
      try {
        const requestedData = req.body;

        const response = await parcelsCollection.insertOne(requestedData);

        res.send(response);
      } catch (error) {
        res.send({ errorMessage: error });
      }
    });
    // * add parcel to database ends

    // ! parcels realted api ends

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
// ! mongo db connection

app.get("/health", (req, res) => {
  res.send("server is running ");
});

app.listen(port, () => {
  console.log(`listening from port ${port}`);
});
