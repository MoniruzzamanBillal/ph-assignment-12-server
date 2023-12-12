const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId, upsert } = require("mongodb");
const port = process.env.port || 5000;
const app = express();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@shipease.zrucvqo.mongodb.net/?retryWrites=true&w=majority`;

// https://shop-ease-beta.vercel.app

app.use(
  cors({
    origin: ["http://localhost:5173", "https://shipease-1604d.web.app"],
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
    // ! creating collection
    const database = client.db("shipease");
    const parcelsCollection = database.collection("parcels");
    const usersCollection = database.collection("users");
    const reviewsCollection = database.collection("reviews");

    // ! creating collection ends
    //*-------------------------------------------------------------------------------

    //*-------------------------------------------------------------------------------

    //*-------------------------------------------------------------------------------

    // ! creating token

    app.post("/jwt2", async (req, res) => {
      try {
        const data = req.body;
        console.log("data in jwt  = ", data);

        const token = jwt.sign(data, process.env.TOKEN_SECRET, {
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

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user in jwt path = ", user);
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });

      // console.log("token in jwt = ", token);

      res.send({ token });
    });

    // ! creating token  ends
    //*-------------------------------------------------------------------------------

    // ! making  middlewire

    const verifyToken = (req, res, next) => {
      // console.log("inside middlewire = ", req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access " });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden access " });
        }

        req.decoded = decoded;
        next();
      });
    };

    // ! making  middlewire ends

    //*-------------------------------------------------------------------------------

    //! user related api

    // get user from database
    app.get("/users", async (req, res) => {
      const data = await usersCollection.find().toArray();

      res.send(data);
    });

    // * user role related api
    app.get("/user/role/:email", verifyToken, async (req, res) => {
      const requestedEmail = req.params.email;
      if (requestedEmail !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access " });
      }
      const query = {
        email: requestedEmail,
      };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      res.send({ role: user.role, id: user._id });
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

    // get delivery man related data api
    app.get("/delivarymens", async (req, res) => {
      const query = {
        role: "deliveryman",
      };

      const data = await usersCollection.find(query).toArray();

      res.send(data);
    });

    // get user related data
    app.get("/userOnly", async (req, res) => {
      const query = {
        role: "user",
      };

      const data = await usersCollection.find(query).toArray();

      res.send(data);
    });

    // get user with pagination
    app.get("/admin/userOnly", async (req, res) => {
      const { page, pagePerItem } = req.query;
      const pageNum = parseInt(page);
      const perPageNum = parseInt(pagePerItem);
      const skip = (pageNum - 1) * perPageNum;

      const query = {
        role: "user",
      };

      const userResponse = await usersCollection
        .find(query)
        .skip(skip)
        .limit(perPageNum)
        .toArray();

      res.send(userResponse);
    });

    // get delivary man with pagination
    app.get("/admin/delivarymans", async (req, res) => {
      const { page, pagePerItem } = req.query;
      const pageNum = parseInt(page);
      const perPageNum = parseInt(pagePerItem);
      const skip = (pageNum - 1) * perPageNum;

      const query = {
        role: "deliveryman",
      };

      const data = await usersCollection
        .find(query)
        .skip(skip)
        .limit(perPageNum)
        .toArray();

      res.send(data);
    });

    // delivary man count
    app.get("/delivaryman/count", async (req, res) => {
      const query = {
        role: "deliveryman",
      };

      const data = await usersCollection.find(query).toArray();

      res.send({ count: data.length });

      // const count = await usersCollection.estimatedDocumentCount();
    });

    // make delivery man api
    app.patch("/delivaryman/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: {
          role: "deliveryman",
        },
      };

      const result = await usersCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // make admin api
    app.patch("/admin/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(query, updateDoc);

      res.send(result);
    });

    // parcel delivered related data add api
    app.patch("/delivared/:id", async (req, res) => {
      const delivaryManId = req.params.id;

      const query = { _id: new ObjectId(delivaryManId) };
      const option = { upsert: true };
      let update = {};

      const userdata = await usersCollection.findOne(query);

      if (userdata && userdata.delivaryDone !== undefined) {
        update = {
          $inc: {
            delivaryDone: 1,
          },
        };
      } else {
        update = {
          $set: {
            delivaryDone: 1,
          },
        };
      }

      const response = await usersCollection.findOneAndUpdate(
        query,
        update,
        option
      );

      // console.log("response from  increase delivary = ", response);

      res.send(response);
    });

    //* parcel booked number  related data add api
    app.patch("/user/parcelbooknum/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const parcelData = await parcelsCollection.findOne(query);
      const userEmail = parcelData?.userEmail;

      const userData = await usersCollection.findOne({ email: userEmail });

      console.log("specific user data  = ", userData);
      let update = {};
      const option = { upsert: true };
      if (userData && userData.parcelBook !== undefined) {
        update = {
          $inc: {
            parcelBook: 1,
          },
        };
      } else {
        update = {
          $set: {
            parcelBook: 1,
          },
        };
      }
      const result = await usersCollection.findOneAndUpdate(
        { email: userEmail },
        update,
        option
      );

      res.send(result);
    });

    // get delivary man related api based on review and delivary done
    app.get("/user/delivaryman", async (req, res) => {
      const query = {
        role: "deliveryman",
      };

      console.log("hit");

      const data = await usersCollection.find(query).toArray();

      console.log(data);

      res.send(data);
    });

    //! user related api ends

    //*-------------------------------------------------------------------------------

    //!-------------------------------------------------------------------------------

    // ! parcels realted api

    app.get("/reviniew", async (req, res) => {
      const query = {
        status: "delivered",
      };

      const data = await parcelsCollection.find(query).toArray();

      let sum = 0;

      const calculate = data.map((ele) => {
        sum += ele.parcelCharge;
      });

      // console.log(sum);

      res.send({ reviniew: sum });
    });

    // delivered count
    app.get("/delivered/count", async (req, res) => {
      const query = {
        status: "delivered",
      };

      const data = await parcelsCollection.find(query).toArray();

      res.send({ count: data.length });
    });

    // grt parcel count
    app.get("/parcel/count", async (req, res) => {
      const count = await parcelsCollection.estimatedDocumentCount();
      res.send({ count: count });
    });

    // get user count $
    app.get("/user/count", async (req, res) => {
      const query = {
        role: "user",
      };

      const data = await usersCollection.find(query).toArray();

      res.send({ count: data.length });

      // const count = await usersCollection.estimatedDocumentCount();
    });

    // admin will get all parcel data
    app.get("/admin/parcels", verifyToken, async (req, res) => {
      try {
        const { page, pagePerItem } = req.query;
        const pageNum = parseInt(page);
        const perPageNum = parseInt(pagePerItem);
        const skip = (pageNum - 1) * perPageNum;

        const parcelResponse = await parcelsCollection
          .find()
          .skip(skip)
          .limit(perPageNum)
          .toArray();

        res.send(parcelResponse);
      } catch (error) {
        console.log(error);
      }
    });

    // get all parcel data
    app.get("/parcels", verifyToken, async (req, res) => {
      try {
        const { page, pagePerItem, status } = req.query;
        const pageNum = parseInt(page);
        const perPageNum = parseInt(pagePerItem);
        const skip = (pageNum - 1) * perPageNum;

        let query = {};
        if (req?.query?.email && status !== "null") {
          query = {
            userEmail: req.query.email,
            status: status,
          };
        } else {
          query = {
            userEmail: req.query.email,
          };
        }
        console.log("query in server = ", query);
        const parcelResponse = await parcelsCollection
          .find(query)
          .skip(skip)
          .limit(perPageNum)
          .toArray();
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

    // update parcel info in database

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

    // delete particular data from parcel
    app.delete("/parcel/delete/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // console.log("id in delete parcel = ", id);

        const query = {
          _id: new ObjectId(id),
        };

        const response = await parcelsCollection.deleteOne(query);

        res.send(response);
      } catch (error) {
        console.log(error);
      }
    });

    // get delivery man assign data
    app.get("/mydelivery/:id", async (req, res) => {
      try {
        const delivartManId = req.params.id;

        // console.log("id on my delivery = ", delivartManId);

        const query = {
          delivartManId: delivartManId,
        };

        const response = await parcelsCollection.find(query).toArray();

        // console.log("data in delivary = ", response);

        res.send(response);
      } catch (error) {
        console.log(error);
      }
    });

    // ! parcels realted api ends
    //!-------------------------------------------------------------------------------

    //!-------------------------------------------------------------------------------

    //! review related api starts

    // add data in review collection
    app.post("/review", async (req, res) => {
      try {
        const data = req.body;
        const response = await reviewsCollection.insertOne(data);
        res.send(response);
      } catch (error) {
        console.log(error);
      }
    });

    // average rating api
    app.patch("/averagerating/rating/:id", async (req, res) => {
      const delivaryManId = req.params.id;
      const query = {
        delivartManId: delivaryManId,
      };
      const reviewData = await reviewsCollection.find(query).toArray();

      const rating = reviewData.map((data) => parseFloat(data?.rating));
      const sumOfRating = rating.reduce((total, rating) => total + rating, 0);
      const totalData = reviewData.length;
      const averageRating = (sumOfRating / totalData).toFixed(2);

      // console.log("data in average rating = ", reviewData.length);
      console.log("data in average rating = ", averageRating);

      const queryId = { _id: new ObjectId(delivaryManId) };
      const option = { upsert: true };
      const update = {
        $set: {
          averageRating,
        },
      };

      const updateResponse = await usersCollection.updateOne(
        queryId,
        update,
        option
      );

      res.send(updateResponse);

      //
    });

    // get specific delivary mans review
    app.get("/reviews/delivaryman/:id", async (req, res) => {
      const delivaryManId = req.params.id;
      // console.log("delivary man in in review = ", delivaryManId);
      const query = {
        delivartManId: delivaryManId,
      };

      const reviewResponse = await reviewsCollection.find(query).toArray();

      console.log("data in review = ", reviewResponse);
      res.send(reviewResponse);
    });

    //! review related api ends

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

app.get("/", (req, res) => {
  res.send("server is running ");
});

app.listen(port, () => {
  console.log(`listening from port ${port}`);
});
