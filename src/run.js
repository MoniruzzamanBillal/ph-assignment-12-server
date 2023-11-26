const { client, app } = require("./app");

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
    // get all parcel data
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
exports.run = run;
