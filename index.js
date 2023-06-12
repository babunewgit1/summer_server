require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENTkEY);
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
    const selected = client.db("sports").collection("addedClass");
    const paymentCollection = client.db("sports").collection("payments");

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

    const verifStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await database.findOne(query);
      if (user?.role !== "student") {
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

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ student: false });
      }
      const query = { email: email };
      const user = await database.findOne(query);
      const result = { student: user?.role === "student" };
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

    // app.patch("/users/admin/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const getRole = req.body;
    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       role: getRole.role,
    //     },
    //   };
      const result = await database.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/class", verifyJWT, verifyinstructor, async (req, res) => {
      const classData = req.body;
      const result = await allClass.insertOne(classData);
      res.send(result);
    });

    app.patch(`/class/:id`, verifyJWT, verifyinstructor, async (req, res) => {
      const getUpdateId = req.params.id;
      const classData = req.body;
      const filter = { _id: new ObjectId(getUpdateId) };
      const updateDoc = {
        $set: {
          name: classData.name,
          price: classData.price,
          available_seats: classData.Seat,
        },
      };
      const result = await allClass.updateOne(filter, updateDoc);
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

    app.get("/classforallhome", async (req, res) => {
      const query = { status: "approve" };
      const options = {
        sort: { enrolled_students: -1 },
      };
      const movie = await allClass.find(query, options).limit(6).toArray();
      res.send(movie);
    });

    app.get("/insforall", async (req, res) => {
      const query = { role: "instructor" };
      const movie = await database.find(query).toArray();
      res.send(movie);
    });

    app.get("/insforallhome", async (req, res) => {
      const query = { role: "instructor" };
      const movie = await database.find(query).limit(6).toArray();
      res.send(movie);
    });

    app.post("/selectedclass", verifyJWT, verifStudent, async (req, res) => {
      const doc = req.body;
      const query = {
        $and: [{ itemsId: doc.itemsId }, { email: doc.email }],
      };

      const existingClass = await selected.findOne(query);
      if (existingClass) {
        return res.send({ message: true });
      }
      const result = await selected.insertOne(doc);
      res.send(result);
    });

    app.get(
      "/selectedclass/:stumail",
      verifyJWT,
      verifStudent,
      async (req, res) => {
        const stumail = req.params.stumail;
        const query = { email: stumail };
        const movie = await selected.find(query).toArray();
        res.send(movie);
      }
    );

    app.delete(
      "/selectedclass/:studelId",
      verifyJWT,
      verifStudent,
      async (req, res) => {
        const deleteId = req.params.studelId;
        const query = { _id: new ObjectId(deleteId) };
        const result = await selected.deleteOne(query);
        res.send(result);
      }
    );

    // create payment intent
    app.post(
      "/create-payment-intent",
      verifyJWT,
      verifStudent,
      async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    );

    app.post("/payments", verifyJWT, verifStudent, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const paymentId = payment.oldId;
      const deleteQuery = { _id: new ObjectId(paymentId) };
      const deleteResult = await selected.deleteOne(deleteQuery);
      res.send({ result, deleteResult });
    });

    app.get("/payments/:mymails", verifyJWT, verifStudent, async (req, res) => {
      const mymails = req.params.mymails;
      const query = { email: mymails };

      const options = {
        sort: { date: -1 },
      };
      const cursor = await paymentCollection.find(query, options).toArray();
      res.send(cursor);
    });

    app.patch(
      "/classforall/:itemId",
      verifyJWT,
      verifStudent,
      async (req, res) => {
        const itemId = req.params.itemId;
        const query = { _id: new ObjectId(itemId) };
        allClass
          .updateOne(query, {
            $inc: { enrolled_students: 1, available_seats: -1 },
          })
          .then(() => {
            res.status(200).json({ message: "Field decremented" });
          })
          .catch((error) => {
            console.error("Error decrementing field:", error);
            res
              .status(500)
              .json({ error: "An error occurred while decrementing field" });
          });
      }
    );

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
