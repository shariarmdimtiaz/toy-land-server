const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
// app.use(cors());
const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
app.use(cors(corsConfig));
app.options("", cors(corsConfig));
app.use(express.json());

// console.log(process.env.DB_USER);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.flnxgoi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // client.connect((err) => {
    //   if (err) {
    //     console.error(err);
    //     return;
    //   }
    // });

    //await client.connect();

    const toyCollection = client.db("toyland").collection("toys");
    //const bookingCollection = client.db("carDoctor").collection("bookings");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      console.log(token);
      res.send({ token });
    });

    //------------------GET--------------------
    app.get("/", (req, res) => {
      res.send("Toyland server is running.");
    });

    // get all toys data
    app.get("/alltoys", async (req, res) => {
      const cursor = toyCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get my toys by email
    app.get("/mytoys", verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { sellerEmail: req.query.email };
      }
      const result = await toyCollection.find(query).toArray();
      res.send(result);
    });

    // get toy by id
    app.get("/toys/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: {
          _id: 1,
          toyName: 1,
          category: 1,
          quantity: 1,
          price: 1,
          rating: 1,
          description: 1,
          img: 1,
          sellerName: 1,
          sellerEmail: 1,
        },
      };
      const result = await toyCollection.findOne(query, options);
      res.send(result);
    });

    // get toy by category
    app.get("/category/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };

      const result = await toyCollection.find(query).toArray();
      res.send(result);
    });

    // search toys by toy name
    app.get("/searchToys/:name", async (req, res) => {
      const name = req.params.name;
      const query = { toyName: { $regex: name } };

      const result = await toyCollection.find(query).toArray();
      res.send(result);
    });

    //------------------POST--------------------
    // add a toy
    app.post("/addToy", async (req, res) => {
      const toy = req.body;
      const result = await toyCollection.insertOne(toy);
      res.send(result);
    });

    //------------------UPDATE/PATCH--------------------
    // update a toy by id
    app.patch("/toyUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedToy = req.body;
      const newValues = {
        $set: {
          sellerName: updatedToy.sellerName,
          sellerEmail: updatedToy.sellerEmail,
          toyName: updatedToy.toyName,
          category: updatedToy.category,
          price: updatedToy.price,
          rating: updatedToy.rating,
          quantity: updatedToy.quantity,
          description: updatedToy.description,
          img: updatedToy.img,
        },
      };
      const result = await toyCollection.updateOne(filter, newValues);
      res.send(result);
    });

    //------------------DEL--------------------
    // del toy by id
    app.delete("/toyDelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toyCollection.deleteOne(query);
      res.send(result);
    });

    //------------------END----------------------

    // Send a ping to confirm a successful connection
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

app.get("/", (req, res) => {
  res.send("Toyland is running");
});

app.listen(port, () => {
  console.log(`Toyland server is running on port ${port}`);
});
