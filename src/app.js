const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId, upsert } = require("mongodb");
const port = process.env.port || 5000;
const app = express();

const ParcelRoute = require("./Routes/ParcelRoute");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@shipease.zrucvqo.mongodb.net/?retryWrites=true&w=majority`;

app.use(
  cors({
    origin: ["http://localhost:5173"],
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
    //*-------------------------------------------------------------------------------

    //*-------------------------------------------------------------------------------

    // ! making  middlewire
    const verifyToken = (req, res, next) => {
      // console.log(req.headers.cookie);
      const token = req?.headers?.cookie;
      if (!token) {
        return res.status(401).send({ message: "forbidden access" });
      }

      jwt.verify(token, process.env.Access_Token_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).status({ message: "forbidden access" });
        }

        req.decoded = decoded;

        next();
      });
    };
    // ! making  middlewire ends
    //*-------------------------------------------------------------------------------

    // ! creating token

    app.post("/jwt", async (req, res) => {
      try {
        const data = req.body;

        const token = jwt.sign(data, process.env.Access_Token_SECRET, {
          expiresIn: "2h",
        });

        res
          .cookie("token", token, {
            httpOnly: true,
            secure: false,
          })
          .send({ token });
      } catch (error) {
        console.log(error);
      }
    });

    // ! creating token  ends
    //*-------------------------------------------------------------------------------

    //*-------------------------------------------------------------------------------

    //! user related api

    // get user from database
    app.get("/users", async (req, res) => {
      const data = await usersCollection.find().toArray();

      res.send(data);
    });

    // create user in database
    app.post("/user", async (req, res) => {
      try {
        const userData = req.body;
        const query = {
          email: userData.email,
        };
        const isExist = await usersCollection.findOne(query);
        if (isExist) {
          return res.send({ message: "user already exist " });
        }
        const response = await usersCollection.insertOne(userData);

        res.send(response);
      } catch (error) {
        console.log(error);
      }
    });

    //! user related api ends

    //*-------------------------------------------------------------------------------

    //!-------------------------------------------------------------------------------

    // ! parcels realted api

    // get all parcel data
    app.get("/parcels", async (req, res) => {
      try {
        let query = {};
        if (req?.query?.email) {
          query = {
            userEmail: req.query.email,
          };
        }

        // userEmail
        console.log("query in server = ", query);
        // console.log("email in server = ", req?.query);
        const parcelResponse = await parcelsCollection.find(query).toArray();
        res.send(parcelResponse);
      } catch (error) {
        console.log(error);
      }
    });

    // get particular parcel data
    app.get("/parcel/:id", async (req, res) => {
      console.log("hit in specific data");
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const responseData = await parcelsCollection.findOne(query);

      res.send(responseData);
    });

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

    app.patch("/parcel/:id", async (req, res) => {
      const id = req.params.id;

      const data = req.body;

      // console.log("hit in update route = ", data);
      const query = { _id: new ObjectId(id) };

      const option = { upsert: true };

      const update = {
        $set: {
          ...data,
        },
      };

      const updateResponse = await parcelsCollection.updateOne(
        query,
        update,
        option
      );

      res.send(updateResponse);
    });

    // ! parcels realted api ends
    //!-------------------------------------------------------------------------------

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
