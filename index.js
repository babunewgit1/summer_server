const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleWare;
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access token" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access token" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-1.vbj8kjp.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const database = client.db("sports").collection("users");
    const allClass = client.db("sports").collection("class");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await database.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    const verifyinstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await database.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await database.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await database.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await database.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await database.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await database.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const getRole = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: getRole.role,
        },
      };
      const result = await database.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const getRole = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: getRole.role,
        },
      };
      const result = await database.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/class", verifyJWT, verifyinstructor, async (req, res) => {
      const classData = req.body;
      const result = await allClass.insertOne(classData);
      res.send(result);
    });

    app.patch("/class/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateData.status,
        },
      };
      const result = await allClass.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/class/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: updateData.feedback,
        },
      };
      const result = await allClass.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/class", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await allClass.find().toArray();
      res.send(result);
    });

    app.get(
      "/class/:insmail",
      verifyJWT,
      verifyinstructor,
      async (req, res) => {
        const insmailId = req.params.insmail;
        const query = { instructor_email: insmailId };
        const movie = await allClass.find(query).toArray();
        res.send(movie);
      }
    );

    app.get("/classforall", async (req, res) => {
      const query = { status: "approve" };
      const movie = await allClass.find(query).toArray();
      res.send(movie);
    });

    app.get("/insforall", async (req, res) => {
      const query = { role: "instructor" };
      const movie = await database.find(query).toArray();
      res.send(movie);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //  await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
