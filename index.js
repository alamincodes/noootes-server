const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7zwefjd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

function verifyJWT(req, res, next) {
  console.log("inside", req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorize access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const usersCollection = client.db("noootes").collection("users");
    const notesCollection = client.db("noootes").collection("notes");

    // jwt user send token
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // create user
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // create note
    app.post("/note", async (req, res) => {
      const note = req.body;
      const result = await notesCollection.insertOne(note);
      res.send(result);
    });
    // query note
    app.get("/notes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email };
      const result = await notesCollection.find(query).toArray();
      res.send(result);
    });
    // note detail
    app.get("/note/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const note = { _id: new ObjectId(id) };
      const result = await notesCollection.findOne(note);
      res.send(result);
    });
    // delete
    app.delete("/delete/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const note = { _id: new ObjectId(id) };
      const result = await notesCollection.deleteOne(note);
      res.send(result);
    });
    // edit note
    app.put("/update-note/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const updateNote = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          // updateNote
          title: updateNote.title,
          note: updateNote.note,
        },
      };
      const result = await notesCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Noootes server running!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
