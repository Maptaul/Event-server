const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//middleware

app.use(
  cors({
    origin: ["https://learnbridge-26280.web.app", "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qploh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const sessionsCollection = client.db("learnbridge").collection("studysessions");
    const reviewCollection = client.db("learnbridge").collection("reviews");
    const usersCollection = client.db("learnbridge").collection("users");
    const tutorsCollection = client.db("learnbridge").collection("tutors");
    const bookedSessionsCollection = client.db("learnbridge").collection("bookedSessions");
    const paymentCollection = client.db("learnbridge").collection("payments");
    const notesCollection = client.db("learnbridge").collection("notes");
    const materialsCollection = client.db("learnbridge").collection("materials");
    const eventsCollection = client.db("learnbridge").collection("events");

    //jwt related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middlewares

    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Custom Authentication System (without third-party packages)

    // User Registration
    app.post("/auth/register", async (req, res) => {
      const { name, email, password, photoURL, role = "student" } = req.body;

      try {
        // Validation
        if (!name || !email || !password) {
          return res.status(400).send({
            success: false,
            message: "Name, email, and password are required"
          });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).send({
            success: false,
            message: "Please enter a valid email address"
          });
        }

        // Password strength validation
        if (password.length < 6) {
          return res.status(400).send({
            success: false,
            message: "Password must be at least 6 characters long"
          });
        }

        // PhotoURL validation (optional but if provided, should be a valid URL)
        if (photoURL && photoURL.trim() !== "") {
          const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
          if (!urlRegex.test(photoURL)) {
            return res.status(400).send({
              success: false,
              message: "Please enter a valid photo URL"
            });
          }
        }

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).send({
            success: false,
            message: "User with this email already exists"
          });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user object
        const newUser = {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          photoURL: photoURL && photoURL.trim() !== "" ? photoURL.trim() : null,
          role,
          createdAt: new Date(),
          lastLogin: null,
          isActive: true
        };

        // Insert user into database
        const result = await usersCollection.insertOne(newUser);

        // Generate JWT token
        const userForToken = {
          id: result.insertedId,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          photoURL: newUser.photoURL
        };

        const token = jwt.sign(userForToken, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "24h"
        });

        // Return success response (without password)
        res.status(201).send({
          success: true,
          message: "User registered successfully",
          user: {
            id: result.insertedId,
            name: newUser.name,
            email: newUser.email,
            photoURL: newUser.photoURL,
            role: newUser.role,
            createdAt: newUser.createdAt
          },
          token
        });

      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error during registration"
        });
      }
    });

    // User Login
    app.post("/auth/login", async (req, res) => {
      const { email, password } = req.body;

      try {
        // Validation
        if (!email || !password) {
          return res.status(400).send({
            success: false,
            message: "Email and password are required"
          });
        }

        // Find user by email
        const user = await usersCollection.findOne({
          email: email.toLowerCase()
        });

        if (!user) {
          return res.status(401).send({
            success: false,
            message: "Invalid email or password"
          });
        }

        // Check if user is active
        if (!user.isActive) {
          return res.status(401).send({
            success: false,
            message: "Account is deactivated. Please contact support."
          });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return res.status(401).send({
            success: false,
            message: "Invalid email or password"
          });
        }

        // Update last login
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() } }
        );

        // Generate JWT token
        const userForToken = {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          photoURL: user.photoURL
        };

        const token = jwt.sign(userForToken, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "24h"
        });

        // Return success response (without password)
        res.send({
          success: true,
          message: "Login successful",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            photoURL: user.photoURL,
            role: user.role,
            lastLogin: new Date()
          },
          token
        });

      } catch (error) {
        console.error("Login error:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error during login"
        });
      }
    });

    // Change Password
    app.put("/auth/change-password", verifyToken, async (req, res) => {
      const { currentPassword, newPassword } = req.body;
      const userId = req.decoded.id;

      try {
        // Validation
        if (!currentPassword || !newPassword) {
          return res.status(400).send({
            success: false,
            message: "Current password and new password are required"
          });
        }

        if (newPassword.length < 6) {
          return res.status(400).send({
            success: false,
            message: "New password must be at least 6 characters long"
          });
        }

        // Find user
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found"
          });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(401).send({
            success: false,
            message: "Current password is incorrect"
          });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              password: hashedNewPassword,
              updatedAt: new Date()
            }
          }
        );

        res.send({
          success: true,
          message: "Password changed successfully"
        });

      } catch (error) {
        console.error("Change password error:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error during password change"
        });
      }
    });

    // Get Current User Profile
    app.get("/auth/profile", verifyToken, async (req, res) => {
      try {
        const userId = req.decoded.id;
        const user = await usersCollection.findOne(
          { _id: new ObjectId(userId) },
          { projection: { password: 0 } } // Exclude password from response
        );

        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found"
          });
        }

        res.send({
          success: true,
          user
        });

      } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).send({
          success: false,
          message: "Internal server error"
        });
      }
    });

    // Logout (optional - mainly for client-side token removal)
    app.post("/auth/logout", verifyToken, async (req, res) => {
      try {
        // In a more advanced system, you could blacklist the token
        // For now, we'll just send a success response
        res.send({
          success: true,
          message: "Logged out successfully"
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Logout failed"
        });
      }
    });



    app.get("/studysessions", async (req, res) => {
      const result = await sessionsCollection.find().toArray();
      res.send(result);
    });
    app.get("/tutors", async (req, res) => {
      const result = await tutorsCollection.find().toArray();
      res.send(result);
    });
    app.post("/tutors", async (req, res) => {
      const booking = req.body;
      const result = await tutorsCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/studysessions", async (req, res) => {
      const sessionData = req.body;

      try {
        const result = await sessionsCollection.insertOne(sessionData);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Failed to create study session" });
      }
    });

    app.get("/studysessions/tutor/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const sessions = await sessionsCollection
          .find({ tutorEmail: email })
          .toArray();
        res.send(sessions);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch study sessions" });
      }
    });

    app.put("/studysessions/resubmit/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await sessionsCollection.updateOne(
          { _id: new ObjectId(id), status: "rejected" },
          { $set: { status: "pending" } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Session not found or already updated" });
        }

        res.send({ message: "Approval request resubmitted successfully" });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to resubmit approval request" });
      }
    });



    app.get("/reviews", async (req, res) => {
      const { sessionId } = req.query;
      try {
        const reviews = await reviewCollection.find({ sessionId }).toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch reviews" });
      }
    });


    app.post("/reviews", async (req, res) => {
      const review = req.body; // Expecting { sessionId, studentEmail, rating, reviewText }
      try {
        const result = await reviewCollection.insertOne(review);
        res.send({
          message: "Review added successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ message: "Failed to add review" });
      }
    });



    // Fetch a user by email
    app.get("/users/email", async (req, res) => {
      const { email } = req.query;
      console.log("Fetching user with email:", email);

      try {
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const user = await usersCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // User registration is now handled by /auth/register
    // This endpoint is kept for backward compatibility (admin use only)
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log("Received user:", user); // Debugging

      if (!user.email) {
        return res.status(400).send({
          success: false,
          message: "Email is required"
        });
      }

      try {
        const existingUser = await usersCollection.findOne({ email: user.email });

        if (existingUser) {
          console.log("User already exists:", existingUser);
          return res.status(409).send({
            success: false,
            message: "User already exists"
          });
        }

        // For direct user creation (admin), add default values
        const userData = {
          ...user,
          createdAt: new Date(),
          isActive: true,
          role: user.role || "student"
        };

        const result = await usersCollection.insertOne(userData);
        console.log("User inserted:", result);
        res.status(201).send({
          success: true,
          message: "User created successfully",
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).send({
          success: false,
          message: "Failed to add user"
        });
      }
    });

    // Search users by name or email
    app.get("/users", async (req, res) => {
      const { searchQuery } = req.query;

      try {
        const query = searchQuery
          ? {
            $or: [
              { name: { $regex: searchQuery, $options: "i" } },
              { email: { $regex: searchQuery, $options: "i" } },
            ],
          }
          : {};

        const users = await usersCollection.find(query).toArray();
        res.send(users);
      } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    // Update user role
    app.put("/users/update-role/:id", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).send({ message: "Role is required" });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid user ID" });
      }

      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "User not found or no changes made" });
        }

        res.send({ message: "User role updated successfully" });
      } catch (error) {
        console.error("Error updating user role:", error.message);
        res.status(500).send({ message: "Failed to update user role" });
      }
    });

    app.get("/sessions/:id", async (req, res) => {
      const { id } = req.params;
      const session = await sessionsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(session);
    });

    app.get("/materials/:sessionId", async (req, res) => {
      const { sessionId } = req.params;
      try {
        const materials = await materialsCollection
          .find({ sessionId })
          .toArray();
        res.send(materials);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch materials" });
      }
    });

    app.post("/materials", async (req, res) => {
      const { title, sessionId, tutorEmail, image, link } = req.body;

      try {
        const result = await materialsCollection.insertOne({
          title,
          sessionId,
          tutorEmail,
          image,
          link,
          createdAt: new Date(),
        });
        res.send({
          message: "Material uploaded successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error uploading material:", error);
        res.status(500).send({ message: "Failed to upload material" });
      }
    });

    app.get("/bookSession", async (req, res) => {
      const result = await bookedSessionsCollection.find().toArray();
      res.send(result);
    });

    app.post("/bookSession", async (req, res) => {
      const booking = req.body;
      const result = await bookedSessionsCollection.insertOne(booking);
      res.send(result);
    });

    app.post("/createNote", async (req, res) => {
      try {
        const note = req.body; // Assuming the note contains email, title, and description
        const result = await notesCollection.insertOne(note);
        res.send({
          message: "Note created successfully!",
          note: { ...note, _id: result.insertedId }, // Return the created note with its ID
        });
      } catch (error) {
        console.error("Error creating note:", error);
        res.status(500).send({ message: "Failed to create note" });
      }
    });

    app.get("/notes/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const notes = await notesCollection.find({ email }).toArray();
        res.send(notes);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch notes" });
      }
    });

    app.put("/notes/update/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description } = req.body;

      try {
        const existingNote = await notesCollection.findOne({ _id: new ObjectId(id) });

        if (!existingNote) {
          return res.status(404).send({ message: "Note not found" });
        }

        const updatedNote = {
          title,
          description,
          previousVersions: [
            ...(existingNote.previousVersions || []), // Keep previous versions
            { title: existingNote.title, description: existingNote.description, updatedAt: new Date() },
          ],
          updatedAt: new Date(),
        };

        const result = await notesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedNote }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Failed to update note" });
        }

        res.send({ message: "Note updated successfully", updatedNote });
      } catch (error) {
        res.status(500).send({ message: "Failed to update note" });
      }
    });

    // Delete a note by ID
    app.delete("/notes/delete/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await notesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Note not found" });
        }
        res.send({ message: "Note deleted successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete note" });
      }
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { registrationFee } = req.body;
      const amount = parseInt(registrationFee * 100);
      console.log(amount, "amount inside the intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment related api

    app.get("/payments/:email", async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/materials/tutor/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const materials = await materialsCollection
          .find({ tutorEmail: email })
          .toArray();
        res.send(materials);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch materials" });
      }
    });

    app.put("/materials/:id", async (req, res) => {
      const { id } = req.params;
      const { title, image, link } = req.body;

      try {
        const result = await materialsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { title, image, link, updatedAt: new Date() } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Material not found or no changes made" });
        }

        res.send({ message: "Material updated successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to update material" });
      }
    });

    app.delete("/materials/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await materialsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Material not found" });
        }

        res.send({ message: "Material deleted successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete material" });
      }
    });

    app.get("/materials", async (req, res) => {
      try {
        const materials = await materialsCollection.find().toArray();
        res.send(materials);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch materials" });
      }
    });

    app.delete("/materials/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await materialsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Material not found" });
        }

        res.send({ message: "Material deleted successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete material" });
      }
    });

    app.get("/bookedSessions/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const bookedSessions = await bookedSessionsCollection
          .find({ studentEmail: email })
          .toArray();
        res.send(bookedSessions);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch booked sessions" });
      }
    });

    // Approve or Reject a Session
    app.put("/studysessions/approve/:id", async (req, res) => {
      const { id } = req.params;
      const { isFree, amount } = req.body; // Input from the modal
      const statusUpdate = {
        status: "approved",
        isFree: isFree,
        amount: isFree ? 0 : amount,
      };

      try {
        const result = await sessionsCollection.updateOne(
          { _id: new ObjectId(id), status: "pending" },
          { $set: statusUpdate }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Session not found or already approved" });
        }

        res.send({ message: "Session approved successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to approve session" });
      }
    });

    app.put("/studysessions/reject/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await sessionsCollection.deleteOne({
          _id: new ObjectId(id),
          status: "pending",
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .send({ message: "Session not found or already processed" });
        }

        res.send({ message: "Session rejected successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to reject session" });
      }
    });

    // Update an Approved Session
    app.put("/studysessions/update/:id", async (req, res) => {
      const { id } = req.params;
      const updatedSession = req.body; // Expect updated session data

      try {
        const result = await sessionsCollection.updateOne(
          { _id: new ObjectId(id), status: "approved" },
          { $set: updatedSession }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Session not found or no changes made" });
        }

        res.send({ message: "Session updated successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to update session" });
      }
    });

    // Delete an Approved Session
    app.delete("/studysessions/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const result = await sessionsCollection.deleteOne({
          _id: new ObjectId(id),
          status: "approved",
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Session not found" });
        }

        res.send({ message: "Session deleted successfully" });
      } catch (error) {
        res.status(500).send({ message: "Failed to delete session" });
      }
    });

    // Events API endpoints

    // Get all events
    app.get("/events", async (req, res) => {
      try {
        const events = await eventsCollection.find().toArray();
        res.send(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send({ message: "Failed to fetch events" });
      }
    });

    // Create a new event
    app.post("/events", async (req, res) => {
      const eventData = req.body;

      try {
        // Initialize attendees array and attendeeCount, ensure creatorEmail is included
        const newEvent = {
          ...eventData,
          creatorEmail: eventData.creatorEmail || eventData.creatorId, // fallback to creatorId if no email
          attendees: [],
          attendeeCount: eventData.attendeeCount || 0, // use provided attendeeCount or default to 0
          createdAt: new Date()
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.send({
          success: true,
          message: "Event created successfully",
          insertedId: result.insertedId
        });
      } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).send({ message: "Failed to create event" });
      }
    });

    // Join an event
    app.patch("/events/:id/join", async (req, res) => {
      const { id } = req.params;
      const { userId } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid event ID" });
      }

      try {
        // Check if user has already joined the event
        const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

        if (!event) {
          return res.status(404).send({ message: "Event not found" });
        }

        if (event.attendees && event.attendees.includes(userId)) {
          return res.status(400).send({
            success: false,
            message: "User has already joined this event"
          });
        }

        // Add user to attendees and increment attendeeCount
        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $addToSet: { attendees: userId },
            $inc: { attendeeCount: 1 }
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Failed to join event"
          });
        }

        res.send({
          success: true,
          message: "Successfully joined the event"
        });
      } catch (error) {
        console.error("Error joining event:", error);
        res.status(500).send({
          success: false,
          message: "Failed to join event"
        });
      }
    });

    // Get events by creator email
    app.get("/events/creator/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const events = await eventsCollection
          .find({ creatorEmail: email })
          .toArray();
        res.send(events);
      } catch (error) {
        console.error("Error fetching events by creator:", error);
        res.status(500).send({ message: "Failed to fetch events" });
      }
    });

    // Update an event
    app.put("/events/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid event ID" });
      }

      try {
        const result = await eventsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              ...updateData,
              updatedAt: new Date()
            }
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Event not found or no changes made"
          });
        }

        res.send({
          success: true,
          message: "Event updated successfully"
        });
      } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).send({ message: "Failed to update event" });
      }
    });

    // Delete an event
    app.delete("/events/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid event ID" });
      }

      try {
        const result = await eventsCollection.deleteOne({
          _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Event not found"
          });
        }

        res.send({
          success: true,
          message: "Event deleted successfully"
        });
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).send({ message: "Failed to delete event" });
      }
    });

    // Get events that a specific user has joined
    app.get("/events/joined/:userId", async (req, res) => {
      const { userId } = req.params;

      try {
        const events = await eventsCollection
          .find({ attendees: userId })
          .toArray();
        res.send(events);
      } catch (error) {
        console.error("Error fetching joined events:", error);
        res.status(500).send({ message: "Failed to fetch joined events" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("LearnBridge server running");
});

// Test endpoint to verify deployment
app.get("/test", (req, res) => {
  res.send({
    message: "Server is working",
    timestamp: new Date().toISOString(),
    authenticationSystem: "Custom built without third-party packages",
    endpoints: {
      authentication: [
        "POST /auth/register - User registration",
        "POST /auth/login - User login",
        "PUT /auth/change-password - Change password",
        "GET /auth/profile - Get user profile",
        "POST /auth/logout - User logout"
      ],
      events: [
        "GET /events - Get all events",
        "POST /events - Create new event",
        "PATCH /events/:id/join - Join an event",
        "GET /events/creator/:email - Get user's events (My Events)",
        "PUT /events/:id - Update event (My Events)",
        "DELETE /events/:id - Delete event (My Events)"
      ],
      users: [
        "GET /users - Search users",
        "GET /users/email - Get user by email",
        "PUT /users/update-role/:id - Update user role"
      ]
    }
  });
});

app.listen(port, () => {
  console.log(` LearnBridge server running on port ${port}`);
});
